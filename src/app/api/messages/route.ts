import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { filterMessageContent } from "@/lib/messageFilter";
import { MAX_MESSAGE_LENGTH } from "@/lib/validation";

/**
 * This is the ONLY way a message can ever be created — the `messages`
 * table has no client-side insert policy at all (see 0002_rls.sql).
 * Every message passes through filterMessageContent() here before
 * it's stored, closing the loophole where someone could call
 * Supabase directly from the browser to skip the filter.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const messageSchema = z.object({
  conversationId: z.string().regex(UUID_REGEX, "Invalid conversation ID"),
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(MAX_MESSAGE_LENGTH, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`),
});

/**
 * DB-backed rate limiter using the messages table.
 * Counts messages sent by a user in the last 60 seconds.
 * Works correctly across serverless cold starts (no in-memory state).
 */
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX = 20;

async function isRateLimited(userId: string): Promise<boolean> {
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000
  ).toISOString();

  const { count, error } = await supabaseAdmin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", userId)
    .gte("created_at", windowStart);

  if (error) {
    // Fail closed: if we can't verify the rate limit, block the request.
    // Allowing messages through on DB errors opens a bypass vector.
    console.error("Rate limit check failed:", error.message);
    return true;
  }

  return (count ?? 0) >= RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  // CSRF: reject requests without Origin header (browser requests always include it;
  // non-browser clients must authenticate via Bearer token which is already checked).
  // When Origin is present, verify it matches our allowed origins.
  const origin = req.headers.get("origin");
  if (!origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowedOrigin =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const allowed = new Set<string>();
  if (allowedOrigin) allowed.add(new URL(allowedOrigin).origin);
  // Always allow same-origin in development
  allowed.add(new URL(req.url).origin);

  if (!allowed.has(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.replace("Bearer ", "");

  const { data: userData, error: authError } =
    await supabaseAdmin.auth.getUser(token);
  if (authError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const senderId = userData.user.id;

  // Rate limiting (DB-backed, survives serverless cold starts)
  if (await isRateLimited(senderId)) {
    return NextResponse.json(
      { error: "Too many messages. Please wait before sending more." },
      { status: 429 }
    );
  }

  // Parse and validate input
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { conversationId, content } = parsed.data;

  // Confirm the sender is actually a participant in this conversation
  // before allowing them to post into it.
  const { data: conversation, error: convError } = await supabaseAdmin
    .from("conversations")
    .select("student_id, landlord_id")
    .eq("id", conversationId)
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (
    conversation.student_id !== senderId &&
    conversation.landlord_id !== senderId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { content: filteredContent, wasFlagged } =
    filterMessageContent(content);

  const { error: insertError } = await supabaseAdmin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: filteredContent,
      original_content: content,
      was_flagged: wasFlagged,
    });

  if (insertError) {
    // Don't leak database error details to the client
    console.error("Message insert failed:", insertError.message);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

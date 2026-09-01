import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseServer";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const schema = z.object({
  bookingId: z.string().regex(UUID_REGEX, "Invalid booking ID"),
});

/**
 * Initialize a Paystack transaction for a booking.
 * Creates a payment session and returns the Paystack authorization URL.
 */
export async function POST(req: NextRequest) {
  // Auth
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

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { bookingId } = parsed.data;

  // Fetch booking and verify ownership
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .select("id, student_id, total_amount, status, payment_status, paystack_reference")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.student_id !== userData.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (booking.status !== "pending_payment") {
    return NextResponse.json(
      { error: "Booking is not awaiting payment" },
      { status: 400 }
    );
  }

  if (booking.payment_status === "paid") {
    return NextResponse.json(
      { error: "Payment already completed" },
      { status: 400 }
    );
  }

  // Idempotency: if booking already has a reference, return it
  if (booking.paystack_reference) {
    return NextResponse.json({
      authorization_url: null,
      reference: booking.paystack_reference,
      error: "Payment already initialized. Please complete the existing payment or contact support.",
    }, { status: 409 });
  }

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) {
    console.error("PAYSTACK_SECRET_KEY not configured");
    return NextResponse.json(
      { error: "Payment service unavailable" },
      { status: 503 }
    );
  }

  // Generate a unique reference
  const reference = `krib_${bookingId.slice(0, 8)}_${Date.now()}`;

  // Initialize Paystack transaction with timeout
  let paystackRes: Response;
  try {
    paystackRes = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userData.user.email,
          amount: booking.total_amount, // Already in kobo
          reference,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/student/bookings?payment=success`,
          metadata: {
            booking_id: bookingId,
            student_id: userData.user.id,
          },
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );
  } catch (err) {
    console.error("Paystack request failed:", err);
    return NextResponse.json(
      { error: "Payment service unavailable. Please try again." },
      { status: 502 }
    );
  }

  let paystackData: Record<string, unknown>;
  try {
    paystackData = await paystackRes.json();
  } catch {
    console.error("Paystack returned invalid JSON");
    return NextResponse.json(
      { error: "Payment service returned an invalid response" },
      { status: 502 }
    );
  }

  if (!paystackRes.ok || !(paystackData.data as Record<string, unknown>)?.authorization_url) {
    console.error("Paystack initialization failed:", paystackData);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 502 }
    );
  }

  // Store the reference on the booking — only if still null (race condition guard)
  const { data: updatedRows, error: refUpdateError } = await supabaseAdmin
    .from("bookings")
    .update({ paystack_reference: reference })
    .eq("id", bookingId)
    .is("paystack_reference", null)
    .select("id");

  if (refUpdateError) {
    console.error("Failed to save payment reference:", refUpdateError.message);
    return NextResponse.json(
      { error: "Failed to save payment reference. Please try again." },
      { status: 500 }
    );
  }

  // If no rows were updated, another request won the race
  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json({
      authorization_url: null,
      reference: null,
      error: "Payment was already initialized by another request. Please refresh and try again.",
    }, { status: 409 });
  }

  return NextResponse.json({
    authorization_url: (paystackData.data as Record<string, unknown>).authorization_url,
    reference,
  });
}

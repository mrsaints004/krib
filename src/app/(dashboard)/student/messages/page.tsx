"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";
import { MessageListSkeleton } from "@/components/skeletons/MessageListSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";

interface ConversationRow {
  id: string;
  listing_id: string;
  landlord_id: string;
  student_id: string;
  created_at: string;
  listings: { title: string } | null;
}

interface LastMessage {
  content: string;
  created_at: string;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

export default function MessagesListPage() {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await supabase
        .from("conversations")
        .select("id, listing_id, landlord_id, student_id, created_at, listings(title)")
        .or(`student_id.eq.${user!.id},landlord_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      const convos = (data ?? []) as unknown as ConversationRow[];
      setConversations(convos);

      // Fetch other party names
      const otherIds = convos.map((c) =>
        user!.id === c.student_id ? c.landlord_id : c.student_id
      );
      const uniqueIds = [...new Set(otherIds)];
      if (uniqueIds.length > 0) {
        const { data: profiles } = await supabase
          .from("public_profile")
          .select("id, full_name")
          .in("id", uniqueIds);
        const map: Record<string, string> = {};
        for (const p of profiles ?? []) {
          map[p.id] = p.full_name;
        }
        setNames(map);
      }

      // Fetch last message per conversation
      const msgMap: Record<string, LastMessage> = {};
      for (const c of convos) {
        const { data: msgs } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (msgs && msgs.length > 0) {
          msgMap[c.id] = msgs[0] as LastMessage;
        }
      }
      setLastMessages(msgMap);

      setLoading(false);
    }
    load();
  }, [user]);

  return (
    <main className="min-h-screen bg-paper-50 pb-24 md:pb-0">
      <header className="sticky top-0 z-10 border-b border-ink-900/10 bg-paper-50/95 px-5 py-4 backdrop-blur">
        <h1 className="font-display text-lg text-ink-950">Messages</h1>
      </header>

      <div className="mx-5 mt-4 flex items-start gap-2 rounded-md bg-verified-light px-3 py-2.5">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-verified-dark" />
        <p className="text-xs text-verified-dark">
          Contact details stay private until a booking is confirmed — it&apos;s what
          keeps your payment protected.
        </p>
      </div>

      <div className="mt-2 px-5">
        {loading && <MessageListSkeleton />}

        {!loading && conversations.length === 0 && (
          <EmptyState
            icon={MessageCircle}
            title="No conversations"
            description="Message a landlord from a listing to start one."
          />
        )}

        <div className="mt-3 divide-y divide-ink-900/10">
          {conversations.map((c) => {
            const otherId =
              user?.id === c.student_id ? c.landlord_id : c.student_id;
            const otherName = names[otherId] ?? "...";
            const listingTitle =
              c.listings && typeof c.listings === "object"
                ? (c.listings as { title: string }).title
                : null;
            const lastMsg = lastMessages[c.id];

            return (
              <Link
                key={c.id}
                href={
                  profile?.role === "landlord"
                    ? `/landlord/messages/${c.id}`
                    : `/student/messages/${c.id}`
                }
                className="flex items-center gap-3 py-4"
              >
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-900/10">
                  <span className="text-sm font-semibold text-ink-800">
                    {otherName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-950">
                      {otherName}
                    </p>
                    {lastMsg && (
                      <span className="shrink-0 text-xs text-ink-800/40">
                        {relativeTime(lastMsg.created_at)}
                      </span>
                    )}
                  </div>
                  {lastMsg ? (
                    <p className="truncate text-xs text-ink-800/60">
                      {lastMsg.content}
                    </p>
                  ) : listingTitle ? (
                    <p className="truncate text-xs text-ink-800/60">
                      {listingTitle}
                    </p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";
import { MessageListSkeleton } from "@/components/skeletons/MessageListSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";

interface ConversationRow {
  id: string;
  listing_id: string;
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

export default function LandlordMessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await supabase
        .from("conversations")
        .select("id, listing_id, student_id, created_at, listings(title)")
        .eq("landlord_id", user!.id)
        .order("created_at", { ascending: false });

      const convos = (data ?? []) as unknown as ConversationRow[];
      setConversations(convos);

      // Fetch student names
      const studentIds = [...new Set(convos.map((c) => c.student_id))];
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from("public_profile")
          .select("id, full_name")
          .in("id", studentIds);
        const map: Record<string, string> = {};
        for (const p of profiles ?? []) map[p.id] = p.full_name;
        setNames(map);
      }

      // Fetch last messages
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

      <div className="px-5">
        {loading ? (
          <MessageListSkeleton />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No messages yet"
            description="Students will message you when they're interested in a listing."
          />
        ) : (
          <div className="mt-3 divide-y divide-ink-900/10">
            {conversations.map((c) => {
              const studentName = names[c.student_id] ?? "Student";
              const listingTitle =
                c.listings && typeof c.listings === "object"
                  ? (c.listings as { title: string }).title
                  : null;
              const lastMsg = lastMessages[c.id];

              return (
                <Link
                  key={c.id}
                  href={`/landlord/messages/${c.id}`}
                  className="flex items-center gap-3 py-4"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-900/10">
                    <span className="text-sm font-semibold text-ink-800">
                      {studentName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink-950">
                        {studentName}
                      </p>
                      {lastMsg && (
                        <span className="shrink-0 text-xs text-ink-800/40">
                          {relativeTime(lastMsg.created_at)}
                        </span>
                      )}
                    </div>
                    {listingTitle && (
                      <p className="text-xs text-ink-800/40">{listingTitle}</p>
                    )}
                    {lastMsg && (
                      <p className="truncate text-xs text-ink-800/60">
                        {lastMsg.content}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

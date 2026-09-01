"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";
import { MessageListSkeleton } from "@/components/skeletons/MessageListSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

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

const PAGE_SIZE = 20;

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  async function fetchConversations(offset: number, append: boolean) {
    if (!user) return;

    const { data } = await supabase
      .from("conversations")
      .select("id, listing_id, student_id, created_at, listings(title)")
      .eq("landlord_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const convos = (data ?? []) as unknown as ConversationRow[];
    setHasMore(convos.length === PAGE_SIZE);

    setConversations((prev) => (append ? [...prev, ...convos] : convos));

    // Fetch student names
    const studentIds = [...new Set(convos.map((c) => c.student_id))];
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from("public_profile")
        .select("id, full_name")
        .in("id", studentIds);
      const map: Record<string, string> = {};
      for (const p of profiles ?? []) map[p.id] = p.full_name;
      setNames((prev) => ({ ...prev, ...map }));
    }

    // Batch fetch last messages (avoids N+1)
    if (convos.length > 0) {
      const convoIds = convos.map((c) => c.id);
      const { data: allMsgs } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", convoIds)
        .order("created_at", { ascending: false });

      const msgMap: Record<string, LastMessage> = {};
      for (const msg of allMsgs ?? []) {
        if (!msgMap[msg.conversation_id]) {
          msgMap[msg.conversation_id] = {
            content: msg.content,
            created_at: msg.created_at,
          };
        }
      }
      setLastMessages((prev) => ({ ...prev, ...msgMap }));
    }
  }

  useEffect(() => {
    if (!user) return;
    fetchConversations(0, false).then(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Real-time: listen for new messages and update last message + reorder
  useEffect(() => {
    if (!user || conversations.length === 0) return;

    const channel = supabase
      .channel("landlord-conversations-list")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as {
            conversation_id: string;
            content: string;
            created_at: string;
          };
          const convoExists = conversations.some((c) => c.id === msg.conversation_id);
          if (!convoExists) return;

          setLastMessages((prev) => ({
            ...prev,
            [msg.conversation_id]: {
              content: msg.content,
              created_at: msg.created_at,
            },
          }));

          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === msg.conversation_id);
            if (idx <= 0) return prev;
            const updated = [...prev];
            const moved = updated.splice(idx, 1)[0];
            if (moved) updated.unshift(moved);
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, conversations.length]);

  async function handleLoadMore() {
    setLoadingMore(true);
    await fetchConversations(conversations.length, true);
    setLoadingMore(false);
  }

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

        {!loading && hasMore && (
          <div className="mt-4 flex justify-center pb-4">
            <Button variant="ghost" loading={loadingMore} onClick={handleLoadMore}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

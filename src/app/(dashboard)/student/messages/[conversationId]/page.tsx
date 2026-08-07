"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, ShieldAlert } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";
import { MAX_MESSAGE_LENGTH } from "@/lib/validation";

interface MessageRow {
  id: string;
  sender_id: string;
  content: string;
  was_flagged: boolean;
  created_at: string;
}

interface ConversationInfo {
  student_id: string;
  landlord_id: string;
  listings: { title: string } | null;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageThreadPage() {
  const toast = useToast();
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const conversationId = params.conversationId as string;

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [convoInfo, setConvoInfo] = useState<ConversationInfo | null>(null);
  const [otherName, setOtherName] = useState("...");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: convo } = await supabase
        .from("conversations")
        .select("student_id, landlord_id, listings(title)")
        .eq("id", conversationId)
        .single();

      if (convo) {
        // Verify the current user is a participant
        if (user?.id !== convo.student_id && user?.id !== convo.landlord_id) {
          toast.error("You don't have access to this conversation");
          router.push("/student/messages");
          return;
        }

        setConvoInfo(convo as unknown as ConversationInfo);

        const otherId =
          user?.id === convo.student_id ? convo.landlord_id : convo.student_id;
        const { data: profile } = await supabase
          .from("public_profile")
          .select("full_name")
          .eq("id", otherId)
          .single();
        if (profile) setOtherName(profile.full_name);
      }

      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, content, was_flagged, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      setMessages(data ?? []);
    }
    load();

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as MessageRow]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!draft.trim() || sending) return;
    setSending(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId, content: draft }),
      });

      if (res.ok) {
        setDraft("");
      } else {
        toast.error("Failed to send message");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const listingTitle =
    convoInfo?.listings && typeof convoInfo.listings === "object"
      ? (convoInfo.listings as { title: string }).title
      : null;

  return (
    <main className="flex min-h-screen flex-col bg-paper-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-ink-900/10 bg-paper-50/95 px-4 py-3 backdrop-blur">
        <button onClick={() => router.back()} className="text-ink-900">
          <ArrowLeft size={20} />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900/10">
          <span className="text-xs font-semibold text-ink-800">
            {otherName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base text-ink-950">
            {otherName}
          </p>
          {listingTitle && (
            <p className="truncate text-xs text-ink-800/50">
              Re: {listingTitle}
            </p>
          )}
        </div>
      </header>

      <div className="flex items-start gap-2 bg-verified-light px-4 py-2">
        <ShieldAlert size={14} className="mt-0.5 shrink-0 text-verified-dark" />
        <p className="text-xs text-verified-dark">
          Contact details can&apos;t be shared here — they unlock once a booking is
          confirmed.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => {
          const isMine = m.sender_id === user?.id;
          return (
            <div
              key={m.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[75%]">
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm ${
                    isMine
                      ? "bg-verified text-paper-50"
                      : "bg-ink-900/5 text-ink-950"
                  }`}
                >
                  <p>{m.content}</p>
                  {m.was_flagged && (
                    <p
                      className={`mt-1 text-[10px] italic ${
                        isMine ? "text-paper-50/70" : "text-ink-800/50"
                      }`}
                    >
                      Part of this message was removed for safety
                    </p>
                  )}
                </div>
                <p
                  className={`mt-0.5 text-[10px] ${
                    isMine ? "text-right text-ink-800/40" : "text-ink-800/40"
                  }`}
                >
                  {formatTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-ink-900/10 bg-paper-50 px-4 py-3">
        <div className="relative flex-1">
          <input
            value={draft}
            onChange={(e) => {
              if (e.target.value.length <= MAX_MESSAGE_LENGTH) setDraft(e.target.value);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="w-full rounded-full border border-ink-900/15 bg-paper-100/50 px-4 py-2.5 text-sm text-ink-950 outline-none focus:border-verified"
            maxLength={MAX_MESSAGE_LENGTH}
          />
          {draft.length > MAX_MESSAGE_LENGTH * 0.8 && (
            <span className={`absolute -bottom-5 right-2 text-[10px] ${draft.length >= MAX_MESSAGE_LENGTH ? "text-signal" : "text-ink-800/40"}`}>
              {draft.length}/{MAX_MESSAGE_LENGTH}
            </span>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-verified text-paper-50 disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </main>
  );
}

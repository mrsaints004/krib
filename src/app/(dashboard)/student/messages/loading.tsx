import { MessageListSkeleton } from "@/components/skeletons/MessageListSkeleton";

export default function MessagesLoading() {
  return (
    <div className="min-h-screen bg-paper-50 pb-24">
      <header className="sticky top-0 z-10 border-b border-ink-900/10 bg-paper-50/95 px-5 py-4 backdrop-blur">
        <h1 className="font-display text-lg text-ink-950">Messages</h1>
      </header>
      <MessageListSkeleton />
    </div>
  );
}

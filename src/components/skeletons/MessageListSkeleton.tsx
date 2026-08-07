export function MessageListSkeleton() {
  return (
    <div className="divide-y divide-ink-900/10 px-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 py-4">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-ink-900/5" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 animate-pulse rounded bg-ink-900/5" />
            <div className="h-3 w-40 animate-pulse rounded bg-ink-900/5" />
          </div>
          <div className="h-3 w-10 animate-pulse rounded bg-ink-900/5" />
        </div>
      ))}
    </div>
  );
}

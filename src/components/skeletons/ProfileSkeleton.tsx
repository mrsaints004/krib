export function ProfileSkeleton() {
  return (
    <div className="space-y-6 px-5 py-6">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 animate-pulse rounded-full bg-ink-900/5" />
        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-ink-900/5" />
          <div className="h-4 w-40 animate-pulse rounded bg-ink-900/5" />
        </div>
      </div>
      <div className="space-y-3 rounded-md border border-ink-900/10 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-3 w-20 animate-pulse rounded bg-ink-900/5" />
            <div className="h-4 w-24 animate-pulse rounded bg-ink-900/5" />
          </div>
        ))}
      </div>
      <div className="h-11 w-full animate-pulse rounded-md bg-ink-900/5" />
    </div>
  );
}

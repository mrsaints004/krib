export function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-paper-50">
      <div className="aspect-[4/3] animate-pulse bg-ink-900/5" />
      <div className="space-y-4 px-5 py-5">
        <div className="h-7 w-3/4 animate-pulse rounded bg-ink-900/5" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-ink-900/5" />
        <div className="h-6 w-1/3 animate-pulse rounded bg-ink-900/5" />
        <div className="mt-6 space-y-2">
          <div className="h-5 w-1/4 animate-pulse rounded bg-ink-900/5" />
          <div className="h-4 w-full animate-pulse rounded bg-ink-900/5" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-ink-900/5" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-ink-900/5" />
        </div>
        <div className="mt-6 space-y-2">
          <div className="h-5 w-1/4 animate-pulse rounded bg-ink-900/5" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-ink-900/5" />
            ))}
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <div className="h-12 flex-1 animate-pulse rounded-md bg-ink-900/5" />
          <div className="h-12 flex-1 animate-pulse rounded-md bg-ink-900/5" />
        </div>
      </div>
    </div>
  );
}

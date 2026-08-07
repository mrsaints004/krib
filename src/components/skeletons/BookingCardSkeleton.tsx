export function BookingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-ink-900/10">
      <div className="aspect-[3/1] animate-pulse bg-ink-900/5" />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between">
          <div className="h-5 w-2/3 animate-pulse rounded bg-ink-900/5" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-ink-900/5" />
        </div>
        <div className="h-3 w-1/2 animate-pulse rounded bg-ink-900/5" />
        <div className="flex justify-between border-t border-ink-900/10 pt-3">
          <div className="space-y-1">
            <div className="h-3 w-8 animate-pulse rounded bg-ink-900/5" />
            <div className="h-4 w-16 animate-pulse rounded bg-ink-900/5" />
          </div>
          <div className="space-y-1">
            <div className="h-3 w-8 animate-pulse rounded bg-ink-900/5" />
            <div className="h-4 w-16 animate-pulse rounded bg-ink-900/5" />
          </div>
          <div className="space-y-1">
            <div className="h-3 w-8 animate-pulse rounded bg-ink-900/5" />
            <div className="h-4 w-16 animate-pulse rounded bg-ink-900/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

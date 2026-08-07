export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-ink-900/10">
      <div className="aspect-[16/10] animate-pulse bg-ink-900/5" />
      <div className="space-y-2 p-4">
        <div className="h-5 w-3/4 animate-pulse rounded bg-ink-900/5" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-ink-900/5" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-ink-900/5" />
      </div>
    </div>
  );
}

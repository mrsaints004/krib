import { ListingCardSkeleton } from "@/components/skeletons/ListingCardSkeleton";

export default function ListingsLoading() {
  return (
    <div className="min-h-screen bg-paper-50 pb-24">
      <header className="sticky top-0 z-10 border-b border-ink-900/10 bg-paper-50/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="font-display text-lg italic text-ink-950">UniNest</span>
          <div className="h-8 w-8 animate-pulse rounded-full bg-ink-900/10" />
        </div>
        <div className="mt-3 h-10 animate-pulse rounded-md bg-ink-900/5" />
      </header>
      <div className="grid grid-cols-1 gap-5 px-5 py-5 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

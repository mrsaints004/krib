import { BookingCardSkeleton } from "@/components/skeletons/BookingCardSkeleton";

export default function BookingsLoading() {
  return (
    <div className="min-h-screen bg-paper-50 pb-24">
      <header className="sticky top-0 z-10 border-b border-ink-900/10 bg-paper-50/95 px-5 py-4 backdrop-blur">
        <h1 className="font-display text-lg text-ink-950">My Bookings</h1>
      </header>
      <div className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-2">
        <BookingCardSkeleton />
        <BookingCardSkeleton />
      </div>
    </div>
  );
}

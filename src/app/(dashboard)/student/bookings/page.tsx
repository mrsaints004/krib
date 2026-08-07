"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CreditCard,
  Calendar,
  Copy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { BookingCardSkeleton } from "@/components/skeletons/BookingCardSkeleton";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";

interface BookingRow {
  id: string;
  listing_id: string;
  rent_amount: number;
  facilitation_fee: number;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  listings: {
    title: string;
    area_description: string;
    rent_period: string;
    photo_urls: string[];
  };
}

function formatNaira(kobo: number): string {
  return `\u20A6${new Intl.NumberFormat("en-NG").format(Math.round(kobo / 100))}`;
}

function statusDisplay(status: string) {
  switch (status) {
    case "pending_payment":
      return { label: "Awaiting payment", variant: "pending" as const, Icon: CreditCard };
    case "confirmed":
      return { label: "Confirmed", variant: "verified" as const, Icon: CheckCircle2 };
    case "active":
      return { label: "Active", variant: "verified" as const, Icon: CheckCircle2 };
    case "completed":
      return { label: "Completed", variant: "neutral" as const, Icon: CheckCircle2 };
    case "cancelled":
      return { label: "Cancelled", variant: "rejected" as const, Icon: XCircle };
    case "disputed":
      return { label: "Disputed", variant: "rejected" as const, Icon: AlertCircle };
    default:
      return { label: status, variant: "neutral" as const, Icon: Clock };
  }
}

export default function StudentBookingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [payDialogBooking, setPayDialogBooking] = useState<BookingRow | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await supabase
        .from("bookings")
        .select(
          "id, listing_id, rent_amount, facilitation_fee, total_amount, status, payment_status, created_at, listings(title, area_description, rent_period, photo_urls)"
        )
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });

      setBookings((data as unknown as BookingRow[]) ?? []);
      setLoading(false);
    }
    load();
  }, [user]);

  return (
    <main className="min-h-screen bg-paper-50 pb-24 md:pb-0">
      <header className="sticky top-0 z-10 border-b border-ink-900/10 bg-paper-50/95 px-5 py-4 backdrop-blur">
        <h1 className="font-display text-lg text-ink-950">My Bookings</h1>
      </header>

      <div className="px-5 py-5">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <BookingCardSkeleton />
            <BookingCardSkeleton />
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No bookings yet"
            description="Once you book a verified listing, it'll show up here."
            actionLabel="Browse listings"
            actionHref="/student/listings"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {bookings.map((booking) => {
              const { label, variant, Icon } = statusDisplay(booking.status);
              const listing = booking.listings;

              return (
                <div
                  key={booking.id}
                  className="overflow-hidden rounded-lg border border-ink-900/10"
                >
                  {listing?.photo_urls?.length > 0 ? (
                    <div
                      className="aspect-[3/1] bg-ink-900 bg-cover bg-center"
                      style={{ backgroundImage: `url(${listing.photo_urls[0]})` }}
                    />
                  ) : (
                    <div className="flex aspect-[3/1] items-center justify-center bg-ink-900/5">
                      <span className="text-xs text-ink-800/40">No photo</span>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-base text-ink-950">
                        {listing?.title ?? "Listing"}
                      </p>
                      <Badge variant={variant}>
                        <Icon size={12} /> {label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-800/60">
                      {listing?.area_description}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-ink-900/10 pt-3">
                      <div>
                        <p className="text-xs text-ink-800/60">Rent</p>
                        <p className="font-mono text-sm text-ink-950">
                          {formatNaira(booking.rent_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-800/60">Fee</p>
                        <p className="font-mono text-sm text-ink-950">
                          {formatNaira(booking.facilitation_fee)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-800/60">Total</p>
                        <p className="font-mono text-sm font-semibold text-ink-950">
                          {formatNaira(booking.total_amount)}
                        </p>
                      </div>
                    </div>

                    {booking.status === "pending_payment" && (
                      <Button
                        className="mt-3 w-full"
                        size="sm"
                        onClick={() => setPayDialogBooking(booking)}
                      >
                        Pay now
                      </Button>
                    )}
                    {booking.status === "active" && (
                      <Button
                        variant="ghost"
                        className="mt-3 w-full"
                        size="sm"
                        onClick={() => router.push("/student/maintenance")}
                      >
                        Report issue
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment instructions dialog */}
      <Dialog
        open={!!payDialogBooking}
        onClose={() => setPayDialogBooking(null)}
        maxWidth="max-w-md"
      >
        <DialogTitle>Payment instructions</DialogTitle>
        <DialogDescription>
          Transfer the total amount to the UniNest escrow account below. Your funds are held safely until you confirm move-in.
        </DialogDescription>

        {payDialogBooking && (
          <div className="mt-4 space-y-3">
            <div className="rounded-md bg-ink-900/5 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink-800">Amount</span>
                <span className="font-mono font-medium text-ink-950">
                  {formatNaira(payDialogBooking.total_amount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-800">Reference</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(payDialogBooking.id.slice(0, 8).toUpperCase());
                    toast.success("Reference copied");
                  }}
                  className="flex items-center gap-1 font-mono text-xs text-verified-dark"
                >
                  {payDialogBooking.id.slice(0, 8).toUpperCase()}
                  <Copy size={12} />
                </button>
              </div>
            </div>

            <div className="rounded-md border border-ink-900/10 p-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-800/60">Bank details</p>
              <p className="text-sm text-ink-950">UniNest Escrow Ltd</p>
              <p className="text-sm text-ink-800">Access Bank — 0123456789</p>
              <p className="mt-2 text-xs text-ink-800/50">
                Include your reference code in the transfer narration.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setPayDialogBooking(null)} className="flex-1">
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </main>
  );
}

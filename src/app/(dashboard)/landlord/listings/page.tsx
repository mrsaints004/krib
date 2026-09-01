"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import {
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  MoreVertical,
  Pencil,
  Trash2,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";
import { isValidPhotoUrl } from "@/lib/validation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ListingCardSkeleton } from "@/components/skeletons/ListingCardSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";

interface ListingRow {
  id: string;
  title: string;
  area_description: string;
  rent_amount: number;
  rent_period: string;
  status: string;
  photo_urls: string[];
  created_at: string;
}

function statusInfo(status: string) {
  switch (status) {
    case "approved":
      return { label: "Live", variant: "verified" as const, Icon: CheckCircle2 };
    case "pending_verification":
      return { label: "Under review", variant: "pending" as const, Icon: Clock };
    case "rejected":
      return { label: "Rejected", variant: "rejected" as const, Icon: XCircle };
    default:
      return { label: "Draft", variant: "neutral" as const, Icon: Eye };
  }
}

function formatRent(kobo: number, period: string): string {
  const naira = Math.round(kobo / 100);
  const formatted = new Intl.NumberFormat("en-NG").format(naira);
  const periodLabel = period === "annual" ? "yr" : period === "quarterly" ? "qtr" : "mo";
  return `\u20A6${formatted} / ${periodLabel}`;
}

export default function LandlordListingsPage() {
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await supabase
        .from("listings")
        .select("id, title, area_description, rent_amount, rent_period, status, photo_urls, created_at")
        .eq("landlord_id", user!.id)
        .order("created_at", { ascending: false });
      setListings(data ?? []);
      setLoading(false);
    }
    load();
  }, [user]);

  async function handleDelete(id: string) {
    const { error } = await supabase.from("listings").delete().eq("id", id).eq("landlord_id", user!.id);
    if (error) {
      toast.error("Failed to delete listing");
    } else {
      toast.success("Listing deleted");
      setListings((prev) => prev.filter((l) => l.id !== id));
    }
    setDeleteConfirm(null);
  }

  async function handleDeactivate(id: string) {
    const { error } = await supabase
      .from("listings")
      .update({ status: "archived" })
      .eq("id", id)
      .eq("landlord_id", user!.id);
    if (error) {
      toast.error("Failed to deactivate");
    } else {
      toast.success("Listing deactivated");
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: "archived" } : l))
      );
    }
    setMenuOpen(null);
  }

  // Stats
  const total = listings.length;
  const live = listings.filter((l) => l.status === "approved").length;
  const underReview = listings.filter((l) => l.status === "pending_verification").length;

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-paper-50 pb-24 md:pb-0">
        <header className="sticky top-0 z-10 border-b border-ink-900/10 bg-paper-50/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg italic text-ink-950 md:hidden">Krib</span>
            <h1 className="hidden font-display text-lg text-ink-950 md:block">My Listings</h1>
          </div>
        </header>
        <div className="grid grid-cols-1 gap-5 px-5 py-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-paper-50 pb-24 md:pb-0">
        <header className="sticky top-0 z-10 border-b border-ink-900/10 bg-paper-50/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg italic text-ink-950 md:hidden">Krib</span>
            <h1 className="hidden font-display text-lg text-ink-950 md:block">My Listings</h1>
            <Link
              href="/landlord/listings/new"
              className="flex items-center gap-1.5 rounded-md bg-verified px-3 py-2 text-sm font-medium text-paper-50 hover:bg-verified-dark"
            >
              <Plus size={16} /> Add listing
            </Link>
          </div>
        </header>

        {/* Stats row */}
        {listings.length > 0 && (
          <div className="flex gap-3 px-5 pt-5">
            {[
              { label: "Total", value: total },
              { label: "Live", value: live },
              { label: "Under Review", value: underReview },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex-1 rounded-md border border-ink-900/10 p-3 text-center"
              >
                <p className="font-mono text-xl text-ink-950">{stat.value}</p>
                <p className="text-xs text-ink-800/60">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="px-5 py-5">
          {listings.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No listings yet"
              description="Add your first property to get started."
              actionLabel="Add your first listing"
              actionHref="/landlord/listings/new"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => {
                const { label, variant, Icon } = statusInfo(listing.status);
                return (
                  <div
                    key={listing.id}
                    className="relative overflow-hidden rounded-lg border border-ink-900/10"
                  >
                    <Link href={`/landlord/listings/${listing.id}`} className="block">
                      {listing.photo_urls.length > 0 && isValidPhotoUrl(listing.photo_urls[0]) ? (
                        <div
                          role="img"
                          aria-label={`Photo of ${listing.title}`}
                          className="aspect-[16/9] bg-ink-900 bg-cover bg-center"
                          style={{ backgroundImage: `url(${encodeURI(listing.photo_urls[0]!)})` }}
                        />
                      ) : (
                        <div className="flex aspect-[16/9] items-center justify-center bg-ink-900/5">
                          <span className="text-xs text-ink-800/40">No photos</span>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-display text-base text-ink-950">{listing.title}</p>
                          <Badge variant={variant}>
                            <Icon size={12} /> {label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-ink-800/60">{listing.area_description}</p>
                        <p className="mt-1 font-mono text-sm text-ink-950">
                          {formatRent(listing.rent_amount, listing.rent_period)}
                        </p>
                      </div>
                    </Link>

                    {/* Dropdown menu trigger */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setMenuOpen(menuOpen === listing.id ? null : listing.id);
                      }}
                      aria-label="Listing actions"
                      aria-haspopup="true"
                      aria-expanded={menuOpen === listing.id}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink-950/60 text-paper-50 backdrop-blur hover:bg-ink-950/80"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {/* Dropdown menu */}
                    {menuOpen === listing.id && (
                      <div role="menu" className="absolute right-2 top-12 z-10 w-40 rounded-md border border-ink-900/10 bg-paper-50 py-1 shadow-lg">
                        <Link
                          href={`/landlord/listings/${listing.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-ink-800 hover:bg-ink-900/5"
                        >
                          <Pencil size={14} /> Edit
                        </Link>
                        {listing.status === "approved" && (
                          <button
                            onClick={() => handleDeactivate(listing.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-800 hover:bg-ink-900/5"
                          >
                            <EyeOff size={14} /> Deactivate
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setMenuOpen(null);
                            setDeleteConfirm(listing.id);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-signal hover:bg-signal-light"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete listing?</DialogTitle>
        <DialogDescription>
          This action cannot be undone. The listing and all associated data will be permanently removed.
        </DialogDescription>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="flex-1">
            Delete
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

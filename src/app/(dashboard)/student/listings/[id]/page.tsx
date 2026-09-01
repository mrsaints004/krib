"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, AlertTriangle, MessageCircle } from "lucide-react";
import { Dialog, DialogTitle, DialogDescription, DialogFooter, Lightbox } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { VerifiedStamp } from "@/components/ui/VerifiedStamp";
import { DetailSkeleton } from "@/components/skeletons/DetailSkeleton";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";
import { isValidPhotoUrl } from "@/lib/validation";

interface ListingDetail {
  id: string;
  landlord_id: string;
  title: string;
  description: string;
  area_description: string;
  distance_to_campus_km: number;
  rent_amount: number;
  rent_period: string;
  amenities: string[];
  gender_preference: string;
  photo_urls: string[];
  defects: { description: string; severity: string }[];
}

interface LandlordInfo {
  full_name: string;
  verified_properties_count: number;
}

function formatRent(kobo: number, period: string): string {
  const naira = Math.round(kobo / 100);
  const formatted = new Intl.NumberFormat("en-NG").format(naira);
  const periodLabel = period === "annual" ? "yr" : period === "quarterly" ? "qtr" : "mo";
  return `\u20A6${formatted} / ${periodLabel}`;
}

function formatNaira(kobo: number): string {
  return `\u20A6${new Intl.NumberFormat("en-NG").format(Math.round(kobo / 100))}`;
}

export default function ListingDetailPage() {
  const toast = useToast();
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [landlord, setLandlord] = useState<LandlordInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("listings")
        .select(
          "id, landlord_id, title, description, area_description, distance_to_campus_km, rent_amount, rent_period, amenities, gender_preference, photo_urls, defects"
        )
        .eq("id", params.id as string)
        .single();

      if (data) {
        setListing(data as ListingDetail);
        // Fetch landlord info
        const { data: profile } = await supabase
          .from("public_profile")
          .select("full_name, verified_properties_count")
          .eq("id", data.landlord_id)
          .single();
        if (profile) setLandlord(profile as LandlordInfo);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  async function handleMessage() {
    if (!user || !listing) return;
    setMessageLoading(true);

    try {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listing.id)
        .eq("student_id", user.id)
        .single();

      if (existing) {
        router.push(`/student/messages/${existing.id}`);
        return;
      }

      const { data: newConvo, error } = await supabase
        .from("conversations")
        .insert({
          listing_id: listing.id,
          student_id: user.id,
          landlord_id: listing.landlord_id,
        })
        .select("id")
        .single();

      if (error || !newConvo) {
        toast.error("Could not start conversation");
        return;
      }

      router.push(`/student/messages/${newConvo.id}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setMessageLoading(false);
    }
  }

  async function handleBook() {
    if (!user || !listing) return;
    setBookingLoading(true);

    try {
      // Fee is computed server-side in the create_booking function
      const { data: bookingId, error } = await supabase.rpc(
        "create_booking",
        {
          p_listing_id: listing.id,
          p_student_id: user.id,
        }
      );

      setConfirmOpen(false);

      if (error || !bookingId) {
        const msg = error?.message?.toLowerCase() ?? "";
        if (msg.includes("not available") || msg.includes("duplicate") || msg.includes("unique") || msg.includes("already exists")) {
          toast.error("This listing is no longer available for booking.");
        } else {
          toast.error("Booking failed. Please try again.");
        }
        return;
      }

      toast.success("Booking created! Proceed to payment.");
      router.push("/student/bookings");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!listing) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-paper-50 px-6">
        <p className="text-sm text-ink-800/70">Listing not found.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm font-medium text-verified-dark"
        >
          Go back
        </button>
      </main>
    );
  }

  const defects = Array.isArray(listing.defects) ? listing.defects : [];
  const facilitation = Math.min(Math.round(listing.rent_amount * 0.05), 1000000);
  const total = listing.rent_amount + facilitation;

  return (
    <>
      <main className="min-h-screen bg-paper-50 pb-28 md:pb-10">
        {/* Desktop: two-column layout */}
        <div className="md:grid md:grid-cols-[1fr_380px] md:gap-6 md:px-5 md:py-5">
          {/* Left column: Photos + details */}
          <div>
            {/* Photo */}
            <div className="relative">
              {listing.photo_urls.length > 0 ? (
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="w-full"
                >
                  <div
                    className="aspect-[4/3] bg-cover bg-center md:rounded-lg"
                    style={{ backgroundImage: listing.photo_urls[photoIdx] && isValidPhotoUrl(listing.photo_urls[photoIdx]) ? `url(${listing.photo_urls[photoIdx]})` : undefined }}
                  />
                </button>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-ink-900 md:rounded-lg">
                  <span className="text-sm text-paper-100/40">No photos</span>
                </div>
              )}
              <button
                onClick={() => router.back()}
                aria-label="Go back"
                className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-ink-950/60 text-paper-50 backdrop-blur md:hidden"
              >
                <ArrowLeft size={18} />
              </button>

              {listing.photo_urls.length > 1 && (
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {listing.photo_urls.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      aria-label={`View photo ${i + 1}`}
                      className={`h-2 w-2 rounded-full ${
                        i === photoIdx ? "bg-paper-50" : "bg-paper-50/40"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail strip (desktop) */}
            {listing.photo_urls.length > 1 && (
              <div className="mt-3 hidden gap-2 md:flex">
                {listing.photo_urls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    className={`h-16 w-16 shrink-0 rounded-md bg-cover bg-center border-2 ${
                      i === photoIdx ? "border-verified" : "border-transparent opacity-60"
                    }`}
                    style={{ backgroundImage: url && isValidPhotoUrl(url) ? `url(${url})` : undefined }}
                  />
                ))}
              </div>
            )}

            <div className="px-5 py-5 md:px-0">
              <div className="flex items-start justify-between gap-2">
                <h1 className="font-display text-2xl text-ink-950">{listing.title}</h1>
                <VerifiedStamp className="shrink-0" />
              </div>
              <p className="mt-1 flex items-center gap-1 text-sm text-ink-800">
                <MapPin size={14} /> {listing.area_description} ·{" "}
                {listing.distance_to_campus_km} km to campus
              </p>
              <p className="mt-3 font-mono text-lg text-ink-950 md:hidden">
                {formatRent(listing.rent_amount, listing.rent_period)}
              </p>

              {/* Description */}
              <div className="mt-5">
                <h2 className="font-display text-lg text-ink-950">About</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-800">
                  {listing.description}
                </p>
              </div>

              {/* Landlord info card */}
              {landlord && (
                <div className="mt-5 flex items-center gap-3 rounded-md border border-ink-900/10 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-verified-light">
                    <span className="font-display text-sm text-verified-dark">
                      {landlord.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-950">
                      {landlord.full_name}
                    </p>
                    <p className="text-xs text-ink-800/60">
                      {landlord.verified_properties_count} verified{" "}
                      {landlord.verified_properties_count === 1 ? "property" : "properties"}
                    </p>
                  </div>
                </div>
              )}

              {/* Gender preference */}
              <div className="mt-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-800/60">
                  Preference
                </span>
                <p className="mt-1 text-sm capitalize text-ink-950">
                  {listing.gender_preference === "any"
                    ? "Open to all"
                    : `${listing.gender_preference} only`}
                </p>
              </div>

              {/* Amenities */}
              <div className="mt-6">
                <h2 className="font-display text-lg text-ink-950">Amenities</h2>
                {listing.amenities.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {listing.amenities.map((a) => (
                      <li
                        key={a}
                        className="rounded-full border border-ink-900/15 px-3 py-1 text-xs text-ink-800"
                      >
                        {a}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-ink-800/60">No amenities listed.</p>
                )}
              </div>

              {/* Defect disclosure */}
              <div className="mt-6 rounded-md border border-clay/30 bg-clay/5 p-4">
                <h2 className="flex items-center gap-2 font-display text-lg text-ink-950">
                  <AlertTriangle size={16} className="text-clay" />
                  Disclosed issues
                </h2>
                {defects.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-800">
                    No issues disclosed by the landlord.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {defects.map((d, i) => (
                      <li key={i} className="text-sm text-ink-800">
                        {"\u2022"} {d.description}{" "}
                        <span className="text-xs uppercase text-clay-dark">
                          ({d.severity})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Right column: Sticky booking sidebar (desktop) */}
          <div className="hidden md:block">
            <div className="sticky top-5 space-y-4 rounded-lg border border-ink-900/10 p-5">
              <p className="font-mono text-2xl text-ink-950">
                {formatRent(listing.rent_amount, listing.rent_period)}
              </p>

              {/* Price breakdown */}
              <div className="space-y-2 border-t border-ink-900/10 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-800">Rent</span>
                  <span className="text-ink-950">{formatNaira(listing.rent_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-800">Facilitation fee</span>
                  <span className="text-ink-950">{formatNaira(facilitation)}</span>
                </div>
                <div className="flex justify-between border-t border-ink-900/10 pt-2 font-medium">
                  <span className="text-ink-950">Total</span>
                  <span className="font-mono text-ink-950">{formatNaira(total)}</span>
                </div>
              </div>

              <Button
                onClick={() => setConfirmOpen(true)}
                loading={bookingLoading}
                className="w-full py-3"
              >
                Book this listing
              </Button>
              <Button
                variant="ghost"
                onClick={handleMessage}
                loading={messageLoading}
                className="w-full py-3"
              >
                <MessageCircle size={16} />
                Message landlord
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile: fixed bottom booking bar */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-900/10 bg-paper-50 px-5 py-3 md:hidden">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-lg text-ink-950">
              {formatRent(listing.rent_amount, listing.rent_period)}
            </p>
            <p className="text-xs text-ink-800/60">
              +{formatNaira(facilitation)} fee
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={handleMessage}
              loading={messageLoading}
              className="flex-1 py-3"
              size="sm"
            >
              <MessageCircle size={16} />
              Message
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              loading={bookingLoading}
              className="flex-1 py-3"
              size="sm"
            >
              Book
            </Button>
          </div>
        </div>
      </main>

      {/* Lightbox */}
      <Lightbox open={lightboxOpen && listing.photo_urls.length > 0} onClose={() => setLightboxOpen(false)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.photo_urls[photoIdx]}
          alt={listing.title}
          className="max-h-[85vh] max-w-[90vw] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {listing.photo_urls.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setPhotoIdx(i); }}
              aria-label={`View photo ${i + 1}`}
              className={`h-2.5 w-2.5 rounded-full ${
                i === photoIdx ? "bg-paper-50" : "bg-paper-50/40"
              }`}
            />
          ))}
        </div>
      </Lightbox>

      {/* Booking confirmation dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm booking</DialogTitle>
        <DialogDescription>
          You&apos;re about to book <strong>{listing.title}</strong>.
        </DialogDescription>
        <div className="mt-4 space-y-2 rounded-md bg-ink-900/5 p-3">
          <div className="flex justify-between text-sm">
            <span className="text-ink-800">Rent</span>
            <span className="font-mono text-ink-950">{formatNaira(listing.rent_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-800">Facilitation fee</span>
            <span className="font-mono text-ink-950">{formatNaira(facilitation)}</span>
          </div>
          <div className="flex justify-between border-t border-ink-900/10 pt-2 text-sm font-medium">
            <span className="text-ink-950">Total</span>
            <span className="font-mono text-ink-950">{formatNaira(total)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setConfirmOpen(false)} className="flex-1 py-2.5">
            Cancel
          </Button>
          <Button onClick={handleBook} loading={bookingLoading} className="flex-1 py-2.5">
            Confirm
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

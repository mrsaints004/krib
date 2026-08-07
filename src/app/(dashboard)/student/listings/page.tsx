"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, Heart, X, Loader2 } from "lucide-react";
import { VerifiedStamp } from "@/components/ui/VerifiedStamp";
import { BracketFrame } from "@/components/ui/BracketFrame";
import { ListingCardSkeleton } from "@/components/skeletons/ListingCardSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";

interface ListingRow {
  id: string;
  title: string;
  area_description: string;
  distance_to_campus_km: number;
  rent_amount: number;
  rent_period: string;
  gender_preference: string;
  amenities: string[];
  photo_urls: string[];
  defects: { description: string; severity: string }[];
}

function formatRent(kobo: number, period: string): string {
  const naira = Math.round(kobo / 100);
  const formatted = new Intl.NumberFormat("en-NG").format(naira);
  const periodLabel = period === "annual" ? "yr" : period === "quarterly" ? "qtr" : "mo";
  return `\u20A6${formatted} / ${periodLabel}`;
}

const PRICE_RANGES = [
  { label: "Under \u20A6150k", max: 15000000 },
  { label: "\u20A6150k - \u20A6250k", min: 15000000, max: 25000000 },
  { label: "\u20A6250k+", min: 25000000 },
];

const PAGE_SIZE = 20;

const FAVORITES_KEY = "uninest_favorites";

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore corrupt data */ }
  return new Set();
}

function saveFavorites(ids: Set<string>) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]));
  } catch { /* storage full — ignore */ }
}

export default function StudentListingsPage() {
  const { profile } = useAuth();
  const university = profile?.university ?? "FUOYE";

  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchListings = useCallback(async (offset: number) => {
    const { data } = await supabase
      .from("listings")
      .select(
        "id, title, area_description, distance_to_campus_km, rent_amount, rent_period, gender_preference, amenities, photo_urls, defects"
      )
      .eq("status", "approved")
      .eq("university", university)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    return data ?? [];
  }, [university]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    setListings([]);
    setHasMore(true);
    fetchListings(0).then((data) => {
      setListings(data);
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    });
  }, [fetchListings]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!hasMore || loading) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) {
          setLoadingMore(true);
          fetchListings(listings.length).then((data) => {
            setListings((prev) => [...prev, ...data]);
            setHasMore(data.length === PAGE_SIZE);
            setLoadingMore(false);
          });
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, listings.length, fetchListings]);

  const toggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveFavorites(next);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let result = listings;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.area_description.toLowerCase().includes(q)
      );
    }

    if (genderFilter) {
      result = result.filter(
        (l) => l.gender_preference === genderFilter || l.gender_preference === "any"
      );
    }

    if (priceFilter !== null) {
      const range = PRICE_RANGES[priceFilter];
      if (range) {
        result = result.filter((l) => {
          if (range.min && l.rent_amount < range.min) return false;
          if (range.max && l.rent_amount >= range.max) return false;
          return true;
        });
      }
    }

    return result;
  }, [listings, search, genderFilter, priceFilter]);

  return (
    <main className="min-h-screen bg-paper-50 pb-24 md:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-ink-900/10 bg-paper-50/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="font-display text-lg italic text-ink-950 md:hidden">UniNest</span>
          <h1 className="hidden font-display text-lg text-ink-950 md:block">Browse listings</h1>
          <div className="h-8 w-8 rounded-full bg-ink-900/10" />
        </div>

        {/* Search bar */}
        <div className="mt-3 flex items-center gap-2 rounded-md border border-ink-900/15 bg-paper-100/50 px-3 py-2">
          <Search size={16} className="text-ink-800/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search near ${university}...`}
            className="w-full bg-transparent text-sm text-ink-950 outline-none placeholder:text-ink-800/40"
          />
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "text-verified" : "text-ink-800/50"}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Filter chips */}
        {showFilters && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <span className="shrink-0 text-xs font-semibold uppercase text-ink-800/60 self-center">
                Gender
              </span>
              {["male", "female"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGenderFilter(genderFilter === g ? null : g)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${
                    genderFilter === g
                      ? "border-verified bg-verified-light text-verified-dark"
                      : "border-ink-900/15 text-ink-800 hover:border-verified"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <span className="shrink-0 text-xs font-semibold uppercase text-ink-800/60 self-center">
                Price
              </span>
              {PRICE_RANGES.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setPriceFilter(priceFilter === i ? null : i)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    priceFilter === i
                      ? "border-verified bg-verified-light text-verified-dark"
                      : "border-ink-900/15 text-ink-800 hover:border-verified"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {(genderFilter || priceFilter !== null) && (
              <button
                onClick={() => { setGenderFilter(null); setPriceFilter(null); }}
                className="flex items-center gap-1 text-xs font-medium text-signal"
              >
                <X size={12} /> Clear filters
              </button>
            )}
          </div>
        )}
      </header>

      {/* Listings feed */}
      <div className="px-5 py-5">
        {loading && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={Search}
            title={listings.length === 0 ? "No listings yet" : "No matches"}
            description={
              listings.length === 0
                ? "No verified listings available yet. Check back soon."
                : "No listings match your search or filters."
            }
          />
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((listing, idx) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx, 5) * 0.05, duration: 0.3 }}
            >
              <Link
                href={`/student/listings/${listing.id}`}
                className="block transition-transform active:scale-[0.98]"
              >
                <BracketFrame>
                  <div className="relative overflow-hidden rounded-lg border border-ink-900/10 bg-ink-950">
                    {listing.photo_urls.length > 0 ? (
                      <div
                        className="aspect-[16/10] bg-ink-900 bg-cover bg-center"
                        style={{ backgroundImage: `url(${listing.photo_urls[0]})` }}
                      />
                    ) : (
                      <div className="flex aspect-[16/10] items-center justify-center bg-ink-900">
                        <span className="text-xs text-paper-100/40">No photo</span>
                      </div>
                    )}
                    <button
                      onClick={(e) => toggleFavorite(listing.id, e)}
                      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-ink-950/60 backdrop-blur"
                    >
                      <Heart
                        size={16}
                        className={
                          favorites.has(listing.id)
                            ? "fill-signal text-signal"
                            : "text-paper-50"
                        }
                      />
                    </button>

                    {/* Distance badge */}
                    <div className="absolute bottom-3 left-3 rounded-full bg-ink-950/70 px-2.5 py-1 backdrop-blur">
                      <span className="font-mono text-xs text-paper-50">
                        {listing.distance_to_campus_km} km
                      </span>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display text-base text-paper-50">
                          {listing.title}
                        </p>
                        <VerifiedStamp className="shrink-0 scale-75" />
                      </div>
                      <p className="mt-1 font-mono text-xs text-paper-100/60">
                        {formatRent(listing.rent_amount, listing.rent_period)} ·{" "}
                        {listing.area_description}
                      </p>
                      {Array.isArray(listing.defects) && listing.defects.length > 0 && (
                        <p className="mt-2 text-xs text-clay">
                          {listing.defects.length} disclosed{" "}
                          {listing.defects.length === 1 ? "issue" : "issues"} — view
                          details
                        </p>
                      )}
                    </div>
                  </div>
                </BracketFrame>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Infinite scroll sentinel */}
        {hasMore && !loading && (
          <div ref={sentinelRef} className="flex justify-center py-8">
            {loadingMore && (
              <Loader2 size={20} className="animate-spin text-ink-800/40" />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

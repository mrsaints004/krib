"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Upload, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { isValidPhotoUrl, AMENITY_OPTIONS } from "@/lib/validation";

const DEFECT_SEVERITIES = ["minor", "moderate", "major"] as const;

interface DefectItem {
  description: string;
  severity: string;
}

interface ListingData {
  id: string;
  title: string;
  description: string;
  area_description: string;
  exact_address: string;
  distance_to_campus_km: number;
  rent_amount: number;
  rent_period: string;
  gender_preference: string;
  amenities: string[];
  photo_urls: string[];
  defects: DefectItem[];
  status: string;
}

function statusVariant(status: string) {
  switch (status) {
    case "approved": return "verified" as const;
    case "pending_verification": return "pending" as const;
    case "rejected": return "rejected" as const;
    default: return "neutral" as const;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "approved": return "Live";
    case "pending_verification": return "Under review";
    case "rejected": return "Rejected";
    default: return "Draft";
  }
}

export default function EditListingPage() {
  const toast = useToast();
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [areaDescription, setAreaDescription] = useState("");
  const [exactAddress, setExactAddress] = useState("");
  const [distanceToCampus, setDistanceToCampus] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [rentPeriod, setRentPeriod] = useState("annual");
  const [genderPreference, setGenderPreference] = useState("any");
  const [amenities, setAmenities] = useState<Set<string>>(new Set());
  const [defects, setDefects] = useState<DefectItem[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  const [defectDesc, setDefectDesc] = useState("");
  const [defectSev, setDefectSev] = useState<typeof DEFECT_SEVERITIES[number]>("minor");

  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("listings")
        .select("id, landlord_id, title, description, area_description, exact_address, distance_to_campus_km, rent_amount, rent_period, gender_preference, amenities, photo_urls, defects, status")
        .eq("id", params.id as string)
        .single();

      if (data) {
        // Ownership check — only the listing owner can edit
        if (user && data.landlord_id !== user.id) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const d = data as ListingData;
        setTitle(d.title);
        setDescription(d.description);
        setAreaDescription(d.area_description);
        setExactAddress(d.exact_address || "");
        // Map existing km to nearest dropdown option
        const km = d.distance_to_campus_km;
        const mapped = km <= 0.4 ? "0.4" : km <= 0.8 ? "0.8" : km <= 1.2 ? "1.2" : km <= 2.0 ? "2.0" : "3.5";
        setDistanceToCampus(mapped);
        setRentAmount(String(Math.round(d.rent_amount / 100)));
        setRentPeriod(d.rent_period);
        setGenderPreference(d.gender_preference);
        setAmenities(new Set(d.amenities ?? []));
        setDefects(d.defects ?? []);
        setExistingPhotoUrls(d.photo_urls ?? []);
        setStatus(d.status);
      }
      setLoading(false);
    }
    load();
  }, [params.id, user]);

  function toggleAmenity(a: string) {
    setAmenities((prev) => {
      const next = new Set(prev);
      next.has(a) ? next.delete(a) : next.add(a);
      return next;
    });
  }

  function addDefect() {
    if (!defectDesc.trim()) return;
    setDefects((prev) => [...prev, { description: defectDesc.trim(), severity: defectSev }]);
    setDefectDesc("");
    setDefectSev("minor");
  }

  function validateForm(): string | null {
    if (!title.trim()) return "Title is required.";
    if (title.trim().length > 200) return "Title must be 200 characters or less.";
    if (!description.trim()) return "Description is required.";
    if (!areaDescription.trim()) return "Area description is required.";
    if (!exactAddress.trim()) return "Exact address is required.";
    const dist = Number(distanceToCampus);
    if (!distanceToCampus || isNaN(dist) || dist < 0) return "Distance must be a non-negative number.";
    const rent = Number(rentAmount);
    if (!rentAmount || isNaN(rent) || rent <= 0) return "Rent must be a positive number.";
    return null;
  }

  async function handleSave(resubmit = false) {
    if (!user) return;

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);

    try {
      const rentKobo = Math.round(Number(rentAmount) * 100);

      const updateData: Record<string, unknown> = {
        title,
        description,
        area_description: areaDescription,
        exact_address: exactAddress,
        distance_to_campus_km: Number(distanceToCampus),
        rent_amount: rentKobo,
        rent_period: rentPeriod,
        gender_preference: genderPreference,
        amenities: Array.from(amenities),
        defects: defects.length > 0 ? defects : [],
      };

      // When resubmitting a rejected listing, move it back to pending
      if (resubmit && status === "rejected") {
        updateData.status = "pending_verification";
      }

      const { error } = await supabase
        .from("listings")
        .update(updateData)
        .eq("id", params.id as string)
        .eq("landlord_id", user!.id);

      if (error) {
        toast.error("Failed to update listing");
        return;
      }

      toast.success(resubmit ? "Listing resubmitted for review" : "Listing updated");
      router.push("/landlord/listings");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-900/10 border-t-verified" />
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-paper-50 px-6">
        <h1 className="font-display text-xl text-ink-950">Access denied</h1>
        <p className="mt-2 text-sm text-ink-800">You can only edit your own listings.</p>
        <Button onClick={() => router.push("/landlord/listings")} className="mt-6">
          Back to listings
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper-50 pb-10">
      <header className="sticky top-0 z-10 border-b border-ink-900/10 bg-paper-50/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink-900/5"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-display text-lg text-ink-950">Edit listing</h1>
          <div className="ml-auto">
            <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
          </div>
        </div>
      </header>

      <div className="px-5 py-5 space-y-6">
        {/* Photos preview */}
        {existingPhotoUrls.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {existingPhotoUrls.map((url, i) => (
              <div
                key={i}
                className="h-20 w-20 shrink-0 rounded-md bg-cover bg-center"
                style={{ backgroundImage: isValidPhotoUrl(url) ? `url(${url})` : undefined }}
              />
            ))}
          </div>
        )}

        {/* Form fields */}
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        <Input label="Area description" value={areaDescription} onChange={(e) => setAreaDescription(e.target.value)} />
        <Input
          label="Exact address"
          value={exactAddress}
          onChange={(e) => setExactAddress(e.target.value)}
        />
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
            Distance to campus
          </label>
          <select
            value={distanceToCampus}
            onChange={(e) => setDistanceToCampus(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-900/15 bg-paper-50 px-3 py-2.5 text-ink-950 outline-none focus:border-verified"
          >
            <option value="">Select walking distance</option>
            <option value="0.4">Under 5 min walk</option>
            <option value="0.8">5–10 min walk</option>
            <option value="1.2">10–15 min walk</option>
            <option value="2.0">15–30 min walk</option>
            <option value="3.5">30+ min walk</option>
          </select>
        </div>
        <Input
          label="Rent amount (Naira)"
          type="number"
          value={rentAmount}
          onChange={(e) => setRentAmount(e.target.value)}
        />

        {/* Rent period */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
            Rent period
          </label>
          <div className="mt-2 flex gap-2">
            {["annual", "quarterly", "monthly"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setRentPeriod(p)}
                className={`flex-1 rounded-md border py-2.5 text-sm font-medium capitalize transition-colors ${
                  rentPeriod === p
                    ? "border-verified bg-verified-light text-verified-dark"
                    : "border-ink-900/15 text-ink-800"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Gender preference */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
            Gender preference
          </label>
          <div className="mt-2 flex gap-2">
            {["any", "male", "female"].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenderPreference(g)}
                className={`flex-1 rounded-md border py-2.5 text-sm font-medium capitalize transition-colors ${
                  genderPreference === g
                    ? "border-verified bg-verified-light text-verified-dark"
                    : "border-ink-900/15 text-ink-800"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
            Amenities
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenity(a)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  amenities.has(a)
                    ? "border-verified bg-verified-light text-verified-dark"
                    : "border-ink-900/15 text-ink-800"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Defects */}
        <div>
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-900">
            <AlertTriangle size={14} className="text-clay" />
            Defect disclosure
          </h2>
          {defects.length > 0 && (
            <ul className="mt-2 space-y-2">
              {defects.map((d, i) => (
                <li key={i} className="flex items-start justify-between rounded-md border border-clay/20 bg-clay/5 px-3 py-2">
                  <div>
                    <p className="text-sm text-ink-950">{d.description}</p>
                    <p className="text-xs uppercase text-clay-dark">{d.severity}</p>
                  </div>
                  <button
                    onClick={() => setDefects((prev) => prev.filter((_, j) => j !== i))}
                    className="text-ink-800/40 hover:text-signal"
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex items-center gap-2">
            <input
              value={defectDesc}
              onChange={(e) => setDefectDesc(e.target.value)}
              placeholder="e.g. Bathroom door lock is loose"
              className="flex-1 rounded-md border border-ink-900/15 bg-paper-50 px-3 py-2 text-sm outline-none focus:border-verified"
            />
            <select
              value={defectSev}
              onChange={(e) => setDefectSev(e.target.value as typeof DEFECT_SEVERITIES[number])}
              className="rounded-md border border-ink-900/15 bg-paper-50 px-2 py-2 text-sm outline-none"
            >
              {DEFECT_SEVERITIES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <button
              onClick={addDefect}
              className="flex items-center gap-1 rounded-md bg-clay/10 px-3 py-2 text-sm font-medium text-clay-dark"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {status === "rejected" && (
          <div className="rounded-md border border-signal/30 bg-signal-light px-4 py-3">
            <p className="text-sm font-medium text-signal">
              This listing was rejected. Make the necessary changes and resubmit for review.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => router.back()} className="flex-1">
            Cancel
          </Button>
          <Button onClick={() => handleSave(false)} loading={saving} className="flex-1">
            Save changes
          </Button>
          {status === "rejected" && (
            <Button onClick={() => handleSave(true)} loading={saving} className="flex-1">
              Resubmit for review
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

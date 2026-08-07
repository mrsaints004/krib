"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Plus,
  X,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";
import { validateFileUpload, sanitizeFilename, ALLOWED_IMAGE_TYPES } from "@/lib/validation";

const AMENITY_OPTIONS = [
  "Water",
  "24hr light (generator)",
  "Fenced compound",
  "Tiled floor",
  "Wardrobe",
  "Kitchen",
  "Bathroom (ensuite)",
  "Security gate",
  "Parking",
  "Fan",
];

const DEFECT_SEVERITIES = ["minor", "moderate", "major"] as const;

interface DefectItem {
  description: string;
  severity: (typeof DEFECT_SEVERITIES)[number];
}

export default function NewListingPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Form state
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
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const previewUrlsRef = useRef(photoPreviewUrls);
  previewUrlsRef.current = photoPreviewUrls;

  // Revoke all object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Defect form
  const [defectDesc, setDefectDesc] = useState("");
  const [defectSev, setDefectSev] = useState<DefectItem["severity"]>("minor");

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

  function removeDefect(idx: number) {
    setDefects((prev) => prev.filter((_, i) => i !== idx));
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length + photos.length > 8) {
      setError("Maximum 8 photos allowed.");
      return;
    }
    // Validate each file
    for (const f of files) {
      const result = validateFileUpload(f, ALLOWED_IMAGE_TYPES);
      if (!result.valid) {
        setError(result.error ?? "Invalid file");
        return;
      }
    }
    setError(null);
    setPhotos((prev) => [...prev, ...files]);
    setPhotoPreviewUrls((prev) => [
      ...prev,
      ...files.map((f) => URL.createObjectURL(f)),
    ]);
  }

  function removePhoto(idx: number) {
    const url = photoPreviewUrls[idx];
    if (url) URL.revokeObjectURL(url);
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  // Validation per step
  function canProceed(): boolean {
    if (step === 1) {
      return !!(title && description && areaDescription && exactAddress && distanceToCampus);
    }
    if (step === 2) {
      return !!(rentAmount && Number(rentAmount) > 0);
    }
    return true;
  }

  async function handleSubmit() {
    if (!user) return;
    setError(null);
    setLoading(true);

    try {
      // Upload photos
      const uploadedUrls: string[] = [];
      for (const photo of photos) {
        const path = `${user.id}/${sanitizeFilename(photo.name)}`;
        const { error: upErr } = await supabase.storage
          .from("listing-photos")
          .upload(path, photo);

        if (upErr) {
          setError(`Photo upload failed: ${upErr.message}`);
          setLoading(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("listing-photos")
          .getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }

      // Insert listing — use the landlord's university from their profile,
      // or fall back to FUOYE if not set (landlords serve a specific campus).
      const rentKobo = Math.round(Number(rentAmount) * 100);
      const { data: landlordProfile } = await supabase
        .from("profiles")
        .select("university")
        .eq("id", user.id)
        .single();
      const landlordUniversity = landlordProfile?.university ?? "FUOYE";
      const { error: insertErr } = await supabase.from("listings").insert({
        landlord_id: user.id,
        title,
        description,
        university: landlordUniversity,
        distance_to_campus_km: Number(distanceToCampus),
        exact_address: exactAddress,
        area_description: areaDescription,
        rent_amount: rentKobo,
        rent_period: rentPeriod,
        amenities: Array.from(amenities),
        gender_preference: genderPreference,
        photo_urls: uploadedUrls,
        defects: defects.length > 0 ? defects : [],
        status: "pending_verification",
      });

      if (insertErr) {
        setError(insertErr.message);
        return;
      }

      router.push("/landlord/listings");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper-50 pb-10">
      <header className="sticky top-0 z-10 border-b border-ink-900/10 bg-paper-50/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (step > 1 ? setStep((s) => s - 1) : router.back())}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink-900/5"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-display text-lg text-ink-950">New listing</h1>
        </div>
        {/* Progress */}
        <div className="mt-3 flex gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                s <= step ? "bg-verified" : "bg-ink-900/10"
              }`}
            />
          ))}
        </div>
      </header>

      <div className="px-5 py-5">
        {/* Step 1: Basic info */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl text-ink-950">Property details</h2>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Self-Con, Ijigbo Road"
                className="mt-1 w-full rounded-md border border-ink-900/15 bg-paper-50 px-3 py-2.5 text-ink-950 outline-none focus:border-verified"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the property — rooms, condition, what's included"
                rows={3}
                className="mt-1 w-full rounded-md border border-ink-900/15 bg-paper-50 px-3 py-2.5 text-sm text-ink-950 outline-none focus:border-verified"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
                Area description
              </label>
              <input
                value={areaDescription}
                onChange={(e) => setAreaDescription(e.target.value)}
                placeholder="e.g. Off Ijigbo Road, near FUOYE gate 2"
                className="mt-1 w-full rounded-md border border-ink-900/15 bg-paper-50 px-3 py-2.5 text-ink-950 outline-none focus:border-verified"
              />
              <p className="mt-1 text-xs text-ink-800/50">
                Shown to students before booking. Keep it general.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
                Exact address
              </label>
              <input
                value={exactAddress}
                onChange={(e) => setExactAddress(e.target.value)}
                placeholder="Full address — only shown after booking"
                className="mt-1 w-full rounded-md border border-ink-900/15 bg-paper-50 px-3 py-2.5 text-ink-950 outline-none focus:border-verified"
              />
              <p className="mt-1 text-xs text-ink-800/50">
                Hidden until a student books. Protects your property.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
                Distance to campus (km)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={distanceToCampus}
                onChange={(e) => setDistanceToCampus(e.target.value)}
                placeholder="e.g. 1.5"
                className="mt-1 w-full rounded-md border border-ink-900/15 bg-paper-50 px-3 py-2.5 text-ink-950 outline-none focus:border-verified"
              />
            </div>
          </div>
        )}

        {/* Step 2: Pricing & preferences */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl text-ink-950">Pricing & preferences</h2>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
                Rent amount (Naira)
              </label>
              <input
                type="number"
                min="0"
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                placeholder="e.g. 180000"
                className="mt-1 w-full rounded-md border border-ink-900/15 bg-paper-50 px-3 py-2.5 text-ink-950 outline-none focus:border-verified"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
                Rent period
              </label>
              <div className="mt-2 flex gap-2">
                {[
                  { value: "annual", label: "Annual" },
                  { value: "quarterly", label: "Quarterly" },
                  { value: "monthly", label: "Monthly" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRentPeriod(value)}
                    className={`flex-1 rounded-md border py-2.5 text-sm font-medium transition-colors ${
                      rentPeriod === value
                        ? "border-verified bg-verified-light text-verified-dark"
                        : "border-ink-900/15 text-ink-800 hover:border-ink-900/30"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
                Gender preference
              </label>
              <div className="mt-2 flex gap-2">
                {[
                  { value: "any", label: "Any" },
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGenderPreference(value)}
                    className={`flex-1 rounded-md border py-2.5 text-sm font-medium transition-colors ${
                      genderPreference === value
                        ? "border-verified bg-verified-light text-verified-dark"
                        : "border-ink-900/15 text-ink-800 hover:border-ink-900/30"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

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
                        : "border-ink-900/15 text-ink-800 hover:border-ink-900/30"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Photos & defects */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl text-ink-950">Photos</h2>
              <p className="mt-1 text-xs text-ink-800/50">
                Up to 8 photos. Show the property honestly — it builds trust.
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {photoPreviewUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square">
                    <div
                      className="h-full w-full rounded-md bg-cover bg-center"
                      style={{ backgroundImage: `url(${url})` }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-signal text-paper-50"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {photos.length < 8 && (
                  <label className="flex aspect-square cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-ink-900/15 hover:border-ink-900/30">
                    <Upload size={20} className="text-ink-800/40" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <h2 className="flex items-center gap-2 font-display text-xl text-ink-950">
                <AlertTriangle size={18} className="text-clay" />
                Defect disclosure
              </h2>
              <p className="mt-1 text-xs text-ink-800/50">
                Be honest. Disclosing issues upfront builds trust and avoids disputes later.
                Zero defects is fine — just means you&apos;re confident.
              </p>

              {defects.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {defects.map((d, i) => (
                    <li
                      key={i}
                      className="flex items-start justify-between rounded-md border border-clay/20 bg-clay/5 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm text-ink-950">{d.description}</p>
                        <p className="text-xs uppercase text-clay-dark">{d.severity}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDefect(i)}
                        className="ml-2 shrink-0 text-ink-800/40 hover:text-signal"
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 space-y-2 rounded-md border border-ink-900/10 p-3">
                <input
                  value={defectDesc}
                  onChange={(e) => setDefectDesc(e.target.value)}
                  placeholder="e.g. Bathroom door lock is loose"
                  className="w-full rounded-md border border-ink-900/15 bg-paper-50 px-3 py-2 text-sm text-ink-950 outline-none focus:border-verified"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={defectSev}
                    onChange={(e) =>
                      setDefectSev(e.target.value as DefectItem["severity"])
                    }
                    className="flex-1 rounded-md border border-ink-900/15 bg-paper-50 px-2 py-2 text-sm text-ink-950 outline-none"
                  >
                    {DEFECT_SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addDefect}
                    className="flex items-center gap-1 rounded-md bg-clay/10 px-3 py-2 text-sm font-medium text-clay-dark hover:bg-clay/20"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review & submit */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl text-ink-950">Review & submit</h2>

            <div className="space-y-3 rounded-md border border-ink-900/10 p-4">
              <div>
                <span className="text-xs font-semibold uppercase text-ink-800/60">Title</span>
                <p className="text-sm text-ink-950">{title}</p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-ink-800/60">Area</span>
                <p className="text-sm text-ink-950">{areaDescription}</p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-ink-800/60">Rent</span>
                <p className="text-sm text-ink-950">
                  {"\u20A6"}{Number(rentAmount).toLocaleString("en-NG")} / {rentPeriod}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-ink-800/60">Distance</span>
                <p className="text-sm text-ink-950">{distanceToCampus} km to campus</p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-ink-800/60">Gender</span>
                <p className="text-sm capitalize text-ink-950">{genderPreference}</p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-ink-800/60">Photos</span>
                <p className="text-sm text-ink-950">{photos.length} photo(s)</p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-ink-800/60">Amenities</span>
                <p className="text-sm text-ink-950">
                  {amenities.size > 0 ? Array.from(amenities).join(", ") : "None selected"}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-ink-800/60">
                  Disclosed defects
                </span>
                <p className="text-sm text-ink-950">
                  {defects.length === 0
                    ? "None — property has no known issues"
                    : `${defects.length} issue(s) disclosed`}
                </p>
              </div>
            </div>

            <p className="text-xs text-ink-800/50">
              After submitting, an admin will review your listing before it goes live.
              This usually takes less than 24 hours.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-4 rounded-md bg-signal-light px-3 py-2 text-sm text-signal">
            {error}
          </p>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-md border border-ink-900/15 px-5 py-3 font-medium text-ink-900"
            >
              Back
            </button>
          )}
          {step < 4 ? (
            <button
              type="button"
              disabled={!canProceed()}
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 rounded-md bg-verified py-3 font-medium text-paper-50 hover:bg-verified-dark disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-verified py-3 font-medium text-paper-50 hover:bg-verified-dark disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Submitting..." : "Submit for review"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  Wrench,
  Plus,
  Droplets,
  Zap,
  Hammer,
  Building2,
  Refrigerator,
  HelpCircle,
  Clock,
  CheckCircle2,
  Upload,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { Dialog, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { validateFileUpload, sanitizeFilename, ALLOWED_IMAGE_TYPES } from "@/lib/validation";

interface BookingOption {
  id: string;
  listing_title: string;
}

interface MaintenanceRequest {
  id: string;
  booking_id: string;
  category: string;
  description: string;
  status: string;
  photo_urls: string[];
  created_at: string;
}

const CATEGORY_OPTIONS = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "carpentry", label: "Carpentry" },
  { value: "structural", label: "Structural" },
  { value: "appliance", label: "Appliance" },
  { value: "other", label: "Other" },
];

const CATEGORY_ICONS: Record<string, typeof Wrench> = {
  plumbing: Droplets,
  electrical: Zap,
  carpentry: Hammer,
  structural: Building2,
  appliance: Refrigerator,
  other: HelpCircle,
};

function statusVariant(status: string) {
  switch (status) {
    case "resolved":
    case "closed":
      return "verified" as const;
    case "submitted":
    case "acknowledged":
      return "pending" as const;
    case "in_progress":
    case "technician_assigned":
      return "pending" as const;
    case "disputed":
      return "rejected" as const;
    default:
      return "neutral" as const;
  }
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StudentMaintenancePage() {
  const toast = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [activeBookings, setActiveBookings] = useState<BookingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New request form
  const [selectedBooking, setSelectedBooking] = useState("");
  const [category, setCategory] = useState("plumbing");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      // Fetch maintenance requests
      const { data: reqs } = await supabase
        .from("maintenance_requests")
        .select("id, booking_id, category, description, status, photo_urls, created_at")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });

      setRequests((reqs ?? []) as MaintenanceRequest[]);

      // Fetch active bookings for the dialog
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, listings(title)")
        .eq("student_id", user!.id)
        .eq("status", "active");

      const opts: BookingOption[] = ((bookings ?? []) as any[]).map((b) => ({
        id: b.id,
        listing_title: b.listings?.title ?? "Unnamed listing",
      }));
      setActiveBookings(opts);
      if (opts.length > 0 && opts[0]) setSelectedBooking(opts[0].id);

      setLoading(false);
    }
    load();
  }, [user]);

  async function handleSubmitRequest() {
    if (!user || !selectedBooking || !description.trim()) return;
    setSubmitting(true);

    // Upload photos if any
    const uploadedUrls: string[] = [];
    for (const photo of photos) {
      const result = await validateFileUpload(photo, ALLOWED_IMAGE_TYPES);
      if (!result.valid) {
        toast.error(result.error ?? "Invalid file");
        setSubmitting(false);
        return;
      }
      const path = `maintenance/${user.id}/${sanitizeFilename(photo.name)}`;
      const { error: upErr } = await supabase.storage
        .from("listing-photos")
        .upload(path, photo);
      if (upErr) {
        toast.error(`Photo upload failed: ${upErr.message}`);
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("listing-photos").getPublicUrl(path);
      uploadedUrls.push(urlData.publicUrl);
    }

    const { error } = await supabase.from("maintenance_requests").insert({
      student_id: user.id,
      booking_id: selectedBooking,
      category,
      description: description.trim(),
      status: "submitted",
      photo_urls: uploadedUrls,
    });

    setSubmitting(false);

    if (error) {
      toast.error("Failed to submit request");
      return;
    }

    toast.success("Maintenance request submitted");
    setDialogOpen(false);
    setDescription("");
    setPhotos([]);

    // Reload
    const { data: reqs } = await supabase
      .from("maintenance_requests")
      .select("id, booking_id, category, description, status, photo_urls, created_at")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });
    setRequests((reqs ?? []) as MaintenanceRequest[]);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-paper-50 pb-24 md:pb-0">
        <header className="border-b border-ink-900/10 px-5 py-4">
          <h1 className="font-display text-lg text-ink-950">Maintenance</h1>
        </header>
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-900/10 border-t-verified" />
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-paper-50 pb-24 md:pb-0">
        <header className="sticky top-0 z-10 border-b border-ink-900/10 bg-paper-50/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-lg text-ink-950">Maintenance</h1>
            {activeBookings.length > 0 && (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus size={14} /> New request
              </Button>
            )}
          </div>
        </header>

        <div className="px-5 py-5">
          {requests.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No maintenance requests"
              description={
                activeBookings.length === 0
                  ? "Maintenance requests only apply to active bookings."
                  : "Submit a request if something needs fixing."
              }
              actionLabel={activeBookings.length > 0 ? "New request" : undefined}
              onAction={activeBookings.length > 0 ? () => setDialogOpen(true) : undefined}
            />
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const CategoryIcon = CATEGORY_ICONS[req.category] ?? Wrench;
                return (
                  <div
                    key={req.id}
                    className="rounded-lg border border-ink-900/10 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900/5">
                          <CategoryIcon size={18} className="text-ink-800" />
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize text-ink-950">
                            {req.category}
                          </p>
                          <p className="text-xs text-ink-800/50">
                            {new Date(req.created_at).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge variant={statusVariant(req.status)}>
                        {statusLabel(req.status)}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-ink-800">{req.description}</p>

                    {/* Status timeline */}
                    <div className="mt-3 flex items-center gap-2">
                      {["submitted", "acknowledged", "in_progress", "resolved"].map((s, i) => {
                        const statusOrder = ["submitted", "acknowledged", "in_progress", "resolved"];
                        const currentIdx = statusOrder.indexOf(req.status);
                        const isCompleted = i <= currentIdx;
                        return (
                          <div key={s} className="flex items-center gap-1">
                            <div
                              className={`h-2 w-2 rounded-full ${
                                isCompleted ? "bg-verified" : "bg-ink-900/10"
                              }`}
                            />
                            {i < 3 && (
                              <div
                                className={`h-0.5 w-6 ${
                                  i < currentIdx ? "bg-verified" : "bg-ink-900/10"
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* New request dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="max-w-md">
        <DialogTitle>New maintenance request</DialogTitle>

        <div className="mt-4 space-y-4">
          <Select
            label="Booking"
            value={selectedBooking}
            onChange={(e) => setSelectedBooking(e.target.value)}
            options={activeBookings.map((b) => ({
              value: b.id,
              label: b.listing_title,
            }))}
          />

          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={CATEGORY_OPTIONS}
          />

          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue..."
            rows={3}
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
              Photos <span className="normal-case text-ink-800/50">(optional)</span>
            </label>
            <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-ink-900/15 px-3 py-2 text-sm text-ink-800/60 hover:border-ink-900/30">
              <Upload size={16} />
              {photos.length > 0 ? `${photos.length} file(s) selected` : "Upload photos"}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length > 5) {
                    toast.error("Maximum 5 photos per request.");
                    return;
                  }
                  setPhotos(files);
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmitRequest}
            loading={submitting}
            disabled={!description.trim() || !selectedBooking}
            className="flex-1"
          >
            Submit
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

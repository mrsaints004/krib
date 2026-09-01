"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  Wrench,
  Droplets,
  Zap,
  Hammer,
  Building2,
  Refrigerator,
  HelpCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { Dialog, DialogTitle, DialogFooter } from "@/components/ui/Dialog";

interface MaintenanceRequest {
  id: string;
  booking_id: string;
  student_id: string;
  category: string;
  description: string;
  status: string;
  photo_urls: string[];
  created_at: string;
  student_name?: string;
  listing_title?: string;
}

const CATEGORY_ICONS: Record<string, typeof Wrench> = {
  plumbing: Droplets,
  electrical: Zap,
  carpentry: Hammer,
  structural: Building2,
  appliance: Refrigerator,
  other: HelpCircle,
};

const STATUS_OPTIONS = [
  { value: "acknowledged", label: "Acknowledge" },
  { value: "technician_assigned", label: "Assign Technician" },
  { value: "in_progress", label: "Mark In Progress" },
  { value: "resolved", label: "Mark Resolved" },
];

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

export default function LandlordMaintenancePage() {
  const toast = useToast();
  const { user } = useAuth();
  const PAGE_SIZE = 20;
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Update status dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [newStatus, setNewStatus] = useState("acknowledged");
  const [updating, setUpdating] = useState(false);

  async function loadRequests(offset = 0, append = false) {
    if (!user) return;

    const { data, error } = await supabase
      .from("maintenance_requests")
      .select(`
        id, booking_id, student_id, category, description, status, photo_urls, created_at,
        bookings!inner(
          student_id,
          listings!inner(title, landlord_id)
        )
      `)
      .eq("bookings.listings.landlord_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Failed to load maintenance requests:", error.message);
      if (!append) setRequests([]);
    } else {
      const mapped = ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        booking_id: r.booking_id,
        student_id: r.student_id,
        category: r.category,
        description: r.description,
        status: r.status,
        photo_urls: r.photo_urls ?? [],
        created_at: r.created_at,
        listing_title: r.bookings?.listings?.title ?? "Unknown listing",
      }));
      setHasMore(mapped.length === PAGE_SIZE);
      setRequests((prev) => (append ? [...prev, ...mapped] : mapped));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleLoadMore() {
    setLoadingMore(true);
    await loadRequests(requests.length, true);
    setLoadingMore(false);
  }

  function openUpdateDialog(req: MaintenanceRequest) {
    setSelectedRequest(req);
    // Default to the next logical status
    const statusOrder = ["submitted", "acknowledged", "technician_assigned", "in_progress", "resolved"];
    const currentIdx = statusOrder.indexOf(req.status);
    const nextStatus = statusOrder[currentIdx + 1] ?? "resolved";
    setNewStatus(nextStatus);
    setDialogOpen(true);
  }

  async function handleUpdateStatus() {
    if (!selectedRequest) return;
    setUpdating(true);

    const updateData: Record<string, string> = { status: newStatus };
    if (newStatus === "resolved") {
      updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("maintenance_requests")
      .update(updateData)
      .eq("id", selectedRequest.id);

    setUpdating(false);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    toast.success(`Request marked as ${statusLabel(newStatus).toLowerCase()}`);
    setDialogOpen(false);
    setSelectedRequest(null);
    loadRequests();
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
          <h1 className="font-display text-lg text-ink-950">Maintenance</h1>
        </header>

        <div className="px-5 py-5">
          {requests.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No maintenance requests"
              description="Maintenance requests from your tenants will appear here."
            />
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const CategoryIcon = CATEGORY_ICONS[req.category] ?? Wrench;
                const isActionable = req.status !== "resolved" && req.status !== "closed";
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
                            {req.listing_title} &middot;{" "}
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

                    {isActionable && (
                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openUpdateDialog(req)}
                        >
                          Update status
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && hasMore && (
            <div className="mt-4 flex justify-center">
              <Button variant="ghost" loading={loadingMore} onClick={handleLoadMore}>
                Load more
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Update status dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="max-w-sm">
        <DialogTitle>Update request status</DialogTitle>
        <div className="mt-4">
          <Select
            label="New status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleUpdateStatus}
            loading={updating}
            className="flex-1"
          >
            Update
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

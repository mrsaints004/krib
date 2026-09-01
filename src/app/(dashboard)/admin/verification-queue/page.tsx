"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  ShieldCheck,
  Clock,
  XCircle,
  CheckCircle2,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Dialog, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import { EmptyState } from "@/components/ui/EmptyState";

interface VerificationDoc {
  id: string;
  profile_id: string;
  document_type: string;
  file_url: string;
  note: string | null;
  status: string;
  review_note: string | null;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
}

function docTypeLabel(type: string): string {
  switch (type) {
    case "jamb_admission_letter": return "JAMB Admission Letter";
    case "school_id": return "School ID";
    case "acceptance_letter": return "Acceptance Letter";
    default: return "Other";
  }
}

export default function AdminVerificationQueuePage() {
  const toast = useToast();
  const { profile, loading: authLoading } = useAuth();
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    // Gate data fetch on admin role — don't load data until we know the user is admin
    if (authLoading) return;
    if (profile?.role !== "admin") return;
    loadDocs();
  }, [authLoading, profile?.role]);

  const PAGE_SIZE = 30;
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadDocs(offset = 0, append = false) {
    const { data } = await supabase
      .from("verification_documents")
      .select("id, profile_id, document_type, file_url, note, status, review_note, created_at, profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const rows = (data ?? []) as unknown as VerificationDoc[];
    setHasMore(rows.length === PAGE_SIZE);
    setDocs((prev) => (append ? [...prev, ...rows] : rows));
    setLoading(false);
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    await loadDocs(docs.length, true);
    setLoadingMore(false);
  }

  const pending = docs.filter((d) => d.status === "pending");
  const approved = docs.filter((d) => d.status === "approved");
  const rejected = docs.filter((d) => d.status === "rejected");

  const filteredDocs =
    activeTab === "pending" ? pending :
    activeTab === "approved" ? approved : rejected;

  async function handleApprove(doc: VerificationDoc) {
    setActionLoading(doc.id);

    try {
      const { error: docError } = await supabase
        .from("verification_documents")
        .update({ status: "approved" })
        .eq("id", doc.id);

      if (docError) {
        toast.error("Failed to approve");
        return;
      }

      await supabase
        .from("profiles")
        .update({ is_verified: true })
        .eq("id", doc.profile_id);

      toast.success("Document approved — student is now verified");
      loadDocs();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(docId: string) {
    setActionLoading(docId);

    try {
      const { error } = await supabase
        .from("verification_documents")
        .update({ status: "rejected", review_note: rejectReason || null })
        .eq("id", docId);

      if (error) {
        toast.error("Failed to reject");
        return;
      }

      toast.success("Document rejected");
      setRejectDialogId(null);
      setRejectReason("");
      loadDocs();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleViewDocument(fileUrl: string) {
    const { data } = await supabase.storage
      .from("verification-documents")
      .createSignedUrl(fileUrl, 1800); // 30 minutes for admin review
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Could not generate document link");
    }
  }

  // Role guard — defense-in-depth (middleware also blocks this)
  if (!authLoading && profile?.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50 px-6">
        <div className="text-center">
          <h1 className="font-display text-xl text-ink-950">Access denied</h1>
          <p className="mt-2 text-sm text-ink-800">This page is restricted to administrators.</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-paper-50">
        <header className="border-b border-ink-900/10 px-5 py-4">
          <h1 className="font-display text-lg text-ink-950">Verification Queue</h1>
        </header>
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-900/10 border-t-verified" />
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-paper-50">
        <header className="sticky top-0 z-10 border-b border-ink-900/10 bg-paper-50/95 px-5 py-4 backdrop-blur">
          <h1 className="font-display text-lg text-ink-950">Verification Queue</h1>
        </header>

        {/* Stats */}
        <div className="flex gap-3 px-5 pt-5">
          <div className="flex-1 rounded-md border border-clay/30 bg-clay/5 p-3 text-center">
            <p className="font-mono text-xl text-clay-dark">{pending.length}</p>
            <p className="text-xs text-clay-dark">Pending</p>
          </div>
          <div className="flex-1 rounded-md border border-verified/30 bg-verified-light p-3 text-center">
            <p className="font-mono text-xl text-verified-dark">{approved.length}</p>
            <p className="text-xs text-verified-dark">Approved</p>
          </div>
          <div className="flex-1 rounded-md border border-signal/30 bg-signal-light p-3 text-center">
            <p className="font-mono text-xl text-signal">{rejected.length}</p>
            <p className="text-xs text-signal">Rejected</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-5 mt-5 flex gap-1 rounded-md bg-ink-900/5 p-1">
          {(["pending", "approved", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "bg-paper-50 text-ink-950 shadow-sm"
                  : "text-ink-800/60 hover:text-ink-950"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Queue */}
        <div className="px-5 py-5">
          {filteredDocs.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title={`No ${activeTab} documents`}
              description={activeTab === "pending" ? "All caught up!" : `No ${activeTab} documents to show.`}
            />
          ) : (
            <div className="space-y-4">
              {filteredDocs.map((doc) => {
                const profileInfo = doc.profiles as { full_name: string; email: string } | null;
                return (
                  <div
                    key={doc.id}
                    className="rounded-lg border border-ink-900/10 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-ink-950">
                          {profileInfo?.full_name ?? "Unknown"}
                        </p>
                        <p className="text-xs text-ink-800/60">
                          {profileInfo?.email}
                        </p>
                      </div>
                      <Badge
                        variant={
                          doc.status === "approved" ? "verified" :
                          doc.status === "rejected" ? "rejected" : "pending"
                        }
                      >
                        {doc.status}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-ink-800/60">
                        <span className="font-medium text-ink-800">Type:</span>{" "}
                        {docTypeLabel(doc.document_type)}
                      </p>
                      <p className="text-xs text-ink-800/60">
                        <span className="font-medium text-ink-800">Submitted:</span>{" "}
                        {new Date(doc.created_at).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      {doc.note && (
                        <p className="text-xs text-ink-800/60">
                          <span className="font-medium text-ink-800">Note:</span>{" "}
                          {doc.note}
                        </p>
                      )}
                      {doc.review_note && (
                        <p className="text-xs text-signal">
                          <span className="font-medium">Rejection reason:</span>{" "}
                          {doc.review_note}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDocument(doc.file_url)}
                      >
                        <ExternalLink size={14} /> View Document
                      </Button>

                      {doc.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(doc)}
                            loading={actionLoading === doc.id}
                          >
                            <CheckCircle2 size={14} /> Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setRejectDialogId(doc.id)}
                          >
                            <XCircle size={14} /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button variant="ghost" loading={loadingMore} onClick={handleLoadMore}>
                Load more
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Reject reason dialog */}
      <Dialog open={!!rejectDialogId} onClose={() => setRejectDialogId(null)}>
        <DialogTitle>Reject document</DialogTitle>
        <div className="mt-4">
          <Textarea
            label="Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain why this document was rejected..."
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setRejectDialogId(null)} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => rejectDialogId && handleReject(rejectDialogId)}
            loading={!!rejectDialogId && actionLoading === rejectDialogId}
            className="flex-1"
          >
            Reject
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

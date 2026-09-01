"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { LogOut, ShieldCheck, ShieldX, Pencil, Save, X, Building2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProfileSkeleton } from "@/components/skeletons/ProfileSkeleton";
import { validatePhone } from "@/lib/validation";

export default function LandlordProfilePage() {
  const toast = useToast();
  const { profile, user, loading, signOut, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "payments">("profile");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setEditName(profile?.full_name ?? "");
    setEditPhone(profile?.phone ?? "");
    setEditing(true);
  }

  async function handleSave() {
    if (!user) return;

    const trimmedName = editName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      toast.error("Name must be at least 2 characters.");
      return;
    }
    if (editPhone && !validatePhone(editPhone)) {
      toast.error("Please enter a valid Nigerian phone number.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: trimmedName, phone: editPhone })
        .eq("id", user.id);

      if (error) {
        toast.error("Failed to update profile");
        return;
      }

      toast.success("Profile updated");
      setEditing(false);
      await refreshProfile();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-paper-50 pb-24 md:pb-0">
        <header className="border-b border-ink-900/10 px-5 py-4">
          <h1 className="font-display text-lg text-ink-950">Profile</h1>
        </header>
        <ProfileSkeleton />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper-50 pb-24 md:pb-0">
      <header className="border-b border-ink-900/10 px-5 py-4">
        <h1 className="font-display text-lg text-ink-950">Profile</h1>
      </header>

      <div className="px-5 py-6 space-y-6">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-verified-light">
            <span className="font-display text-xl text-verified-dark">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
            </span>
          </div>
          <div>
            <p className="font-display text-lg text-ink-950">
              {profile?.full_name ?? "\u2014"}
            </p>
            <p className="text-sm text-ink-800/60">{user?.email}</p>
          </div>
        </div>

        {/* Performance stats */}
        <div className="flex gap-3">
          {[
            { label: "Verified", value: profile?.verified_properties_count ?? 0 },
            { label: "Premium", value: profile?.is_premium ? "Yes" : "No" },
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

        {/* Tabs */}
        <div className="flex gap-1 rounded-md bg-ink-900/5 p-1">
          {(["profile", "payments"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "bg-paper-50 text-ink-950 shadow-sm"
                  : "text-ink-800/60 hover:text-ink-950"
              }`}
            >
              {tab === "profile" ? "Profile" : "Payments"}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <div className="space-y-4">
            {editing ? (
              <>
                <Input
                  label="Full name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setEditing(false)} className="flex-1">
                    <X size={16} /> Cancel
                  </Button>
                  <Button onClick={handleSave} loading={saving} className="flex-1">
                    <Save size={16} /> Save
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3 rounded-md border border-ink-900/10 p-4">
                  <div className="flex justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-800/60">Role</span>
                    <span className="text-sm capitalize text-ink-950">{profile?.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-800/60">Phone</span>
                    <span className="text-sm text-ink-950">{profile?.phone || "\u2014"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-800/60">Verified Properties</span>
                    <span className="text-sm text-ink-950">{profile?.verified_properties_count ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-800/60">Premium</span>
                    {profile?.is_premium ? (
                      <span className="flex items-center gap-1 text-sm text-verified-dark">
                        <ShieldCheck size={14} /> Yes
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-ink-800/50">
                        <ShieldX size={14} /> No
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" onClick={startEdit} className="w-full">
                  <Pencil size={16} /> Edit profile
                </Button>
              </>
            )}
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-4">
            <div className="rounded-md border border-ink-900/10 p-4">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-ink-800/50" />
                <p className="text-sm font-medium text-ink-950">Bank details</p>
              </div>
              <p className="mt-2 text-sm text-ink-800/60">
                Coming soon: automatic payouts to your bank account after bookings are confirmed.
              </p>
            </div>
          </div>
        )}

        {/* Sign out */}
        <Button variant="danger" onClick={signOut} className="w-full">
          <LogOut size={16} /> Sign out
        </Button>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { FileText, CreditCard, Award, MoreHorizontal, CheckCircle2, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { validateFileUpload, sanitizeFilename, ALLOWED_DOC_TYPES } from "@/lib/validation";

type DocType = "jamb_admission_letter" | "school_id" | "acceptance_letter" | "other";

const DOC_TYPES: { value: DocType; label: string; Icon: typeof FileText }[] = [
  { value: "jamb_admission_letter", label: "JAMB admission letter", Icon: Award },
  { value: "school_id", label: "School ID", Icon: CreditCard },
  { value: "acceptance_letter", label: "Acceptance letter", Icon: FileText },
  { value: "other", label: "Other", Icon: MoreHorizontal },
];

export default function VerifyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [docType, setDocType] = useState<DocType>("jamb_admission_letter");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUserId(data.user.id);
    });
  }, [router]);

  const handleFile = useCallback((f: File) => {
    const result = validateFileUpload(f, ALLOWED_DOC_TYPES);
    if (!result.valid) {
      setError(result.error ?? "Invalid file");
      return;
    }
    setError(null);
    setFile(f);
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file || !userId) {
      setError("Please choose a file to upload.");
      return;
    }

    setLoading(true);

    const path = `${userId}/${sanitizeFilename(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from("verification-documents")
      .upload(path, file);

    if (uploadError) {
      setLoading(false);
      setError("File upload failed. Please try again.");
      return;
    }

    const { error: insertError } = await supabase
      .from("verification_documents")
      .insert({
        profile_id: userId,
        document_type: docType,
        file_url: path,
        note: note || null,
      });

    setLoading(false);

    if (insertError) {
      setError("Submission failed. Please try again.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <CheckCircle2 size={48} className="text-verified" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 font-display text-2xl text-ink-950"
        >
          Submitted for review
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-2 text-sm text-ink-800"
        >
          An admin will review your document. This isn&apos;t instant — you can
          keep using UniNest while you wait.
        </motion.p>
        <Button onClick={() => router.push("/")} className="mt-8">
          Continue to UniNest
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6">
      {/* Minimal top bar */}
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="font-display text-xl italic text-ink-950 hover:text-verified-dark transition-colors">
          UniNest
        </Link>
        <Link href="/login" className="text-sm text-ink-800 hover:text-ink-950">
          Log in
        </Link>
      </header>

      <div className="flex flex-1 flex-col justify-center pb-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-2xl text-ink-950">
          Get verified
        </h1>
        <p className="mt-2 text-sm text-ink-800">
          Upload a JAMB admission letter, school ID, or acceptance letter.
          Not admitted yet? Upload what you have and add a note.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
            Document type
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DOC_TYPES.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setDocType(value)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                  docType === value
                    ? "border-verified bg-verified-light text-verified-dark"
                    : "border-ink-900/15 text-ink-800 hover:border-ink-900/30"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="text-xs font-medium leading-tight">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
            File
          </label>
          {file ? (
            <div className="mt-2 flex items-center gap-3 rounded-md border border-ink-900/15 p-3">
              {preview ? (
                <div
                  className="h-16 w-16 shrink-0 rounded bg-cover bg-center"
                  style={{ backgroundImage: `url(${preview})` }}
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-ink-900/5">
                  <FileText size={20} className="text-ink-800/40" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink-950">{file.name}</p>
                <p className="text-xs text-ink-800/50">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button type="button" onClick={clearFile} className="text-ink-800/40 hover:text-signal">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragActive(false)}
              className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-8 transition-colors ${
                dragActive
                  ? "border-verified bg-verified-light"
                  : "border-ink-900/15 hover:border-ink-900/30"
              }`}
            >
              <Upload size={24} className="text-ink-800/40" />
              <p className="mt-2 text-sm text-ink-800/60">
                Drag & drop or{" "}
                <label className="cursor-pointer font-medium text-verified-dark underline">
                  browse
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="mt-1 text-xs text-ink-800/40">
                Images or PDF, max 10 MB
              </p>
            </div>
          )}
        </div>

        <Textarea
          label="Note"
          hint="Optional — e.g. Awaiting matriculation, this is my JAMB result slip"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add any context for the reviewer"
          rows={3}
        />

        {error && (
          <p className="rounded-md bg-signal-light px-3 py-2 text-sm text-signal">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full py-3">
          {loading ? "Uploading\u2026" : "Submit for review"}
        </Button>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full py-2 text-center text-sm text-ink-800/70"
        >
          Skip for now
        </button>
      </form>
      </div>
    </main>
  );
}

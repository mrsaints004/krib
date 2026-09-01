"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-signal-light">
        <AlertCircle size={24} className="text-signal" aria-hidden="true" />
      </div>
      <h1 className="mt-4 font-display text-xl text-ink-950">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-sm text-sm text-ink-800/70">
        We couldn&apos;t load this page. Please try again.
      </p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}

interface VerifiedStampProps {
  label?: string;
  className?: string;
}

/**
 * The signature element of Krib's design system.
 * Evokes an official document stamp — deliberately not a generic
 * checkmark badge — because the product's entire promise is that
 * something was actually inspected and verified, not just uploaded.
 */
export function VerifiedStamp({
  label = "Verified",
  className = "",
}: VerifiedStampProps) {
  return (
    <div
      className={`inline-flex -rotate-6 items-center gap-1.5 rounded-full border-2 border-verified bg-paper-50 px-3 py-1 shadow-sm ${className}`}
    >
      <div className="h-1.5 w-1.5 rounded-full bg-verified" />
      <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-verified-dark">
        {label}
      </span>
    </div>
  );
}

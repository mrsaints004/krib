import { cn } from "@/lib/utils";

type BadgeVariant = "verified" | "pending" | "rejected" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  verified: "bg-verified-light text-verified-dark",
  pending: "bg-clay/10 text-clay-dark",
  rejected: "bg-signal-light text-signal",
  neutral: "bg-ink-900/5 text-ink-800",
};

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

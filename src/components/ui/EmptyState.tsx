import { type LucideIcon } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-900/5">
        <Icon size={24} className="text-ink-800/40" />
      </div>
      <h3 className="mt-4 font-display text-lg text-ink-950">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-ink-800/70">{description}</p>
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-verified px-5 py-2.5 font-medium text-paper-50 hover:bg-verified-dark"
        >
          {actionLabel}
        </a>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

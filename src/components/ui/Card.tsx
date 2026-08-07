import { HTMLAttributes } from "react";

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border border-ink-900/10 bg-paper-50 p-6 shadow-sm ${className}`}
      {...props}
    />
  );
}

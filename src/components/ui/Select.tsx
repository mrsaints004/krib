"use client";

import { SelectHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id: externalId, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;
    const errorId = `${id}-error`;

    return (
      <div>
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={id}
              className="text-xs font-semibold uppercase tracking-wide text-ink-900"
            >
              {label}
            </label>
            {error && (
              <span id={errorId} className="text-xs font-medium text-signal">
                {error}
              </span>
            )}
          </div>
        )}
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "mt-1 w-full rounded-md border border-ink-900/15 bg-paper-50 px-3 py-2.5 text-sm text-ink-950 outline-none transition-colors focus:border-verified",
            error && "border-signal",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = "Select";

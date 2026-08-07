"use client";

import { TextareaHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id: externalId, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const describedBy = [
      error ? errorId : null,
      hint ? hintId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

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
        <textarea
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "mt-1 w-full rounded-md border border-ink-900/15 bg-paper-50 px-3 py-2.5 text-sm text-ink-950 outline-none transition-colors focus:border-verified",
            error && "border-signal",
            className
          )}
          {...props}
        />
        {hint && (
          <p id={hintId} className="mt-1 text-xs text-ink-800/50">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

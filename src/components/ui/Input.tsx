"use client";

import { InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id: externalId, ...props }, ref) => {
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
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "mt-1 w-full rounded-md border border-ink-900/30 bg-white px-3 py-2.5 text-ink-950 outline-none transition-colors focus:border-verified",
            error && "border-signal",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";

"use client";

import { useEffect, useCallback, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Dialog                                                             */
/* ------------------------------------------------------------------ */

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Max width class — defaults to "max-w-sm" */
  maxWidth?: string;
  /** If true, clicking the backdrop does NOT close the dialog */
  persistent?: boolean;
  /** If true, hides the default close (X) button */
  hideClose?: boolean;
}

export function Dialog({
  open,
  onClose,
  children,
  maxWidth = "max-w-sm",
  persistent = false,
  hideClose = false,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !persistent) {
        onClose();
        return;
      }

      // Focus trap — keep Tab within the dialog
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose, persistent],
  );

  useEffect(() => {
    if (!open) return;

    // Store previous focus for restoration
    previousFocusRef.current = document.activeElement as HTMLElement;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    // Focus the panel after animation
    requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      // Restore focus
      previousFocusRef.current?.focus();
    };
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-ink-950/50"
            onClick={persistent ? undefined : onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`relative z-10 w-full ${maxWidth} rounded-lg bg-paper-50 p-6 shadow-xl outline-none`}
          >
            {!hideClose && (
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="absolute right-4 top-4 text-ink-800/50 transition-colors hover:text-ink-950"
              >
                <X size={20} />
              </button>
            )}
            <DialogTitleIdContext.Provider value={titleId}>
              {children}
            </DialogTitleIdContext.Provider>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Title ID context — connects DialogTitle to aria-labelledby         */
/* ------------------------------------------------------------------ */

import { createContext, useContext } from "react";

const DialogTitleIdContext = createContext<string | undefined>(undefined);

/* ------------------------------------------------------------------ */
/*  Sub-components for consistent dialog layouts                       */
/* ------------------------------------------------------------------ */

export function DialogTitle({ children }: { children: React.ReactNode }) {
  const id = useContext(DialogTitleIdContext);
  return (
    <h3 id={id} className="pr-8 font-display text-lg text-ink-950">
      {children}
    </h3>
  );
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm text-ink-800">{children}</p>;
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 flex gap-3">{children}</div>;
}

/* ------------------------------------------------------------------ */
/*  Lightbox — full-screen image viewer                                */
/* ------------------------------------------------------------------ */

interface LightboxProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Lightbox({ open, onClose, children }: LightboxProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/90"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            aria-label="Close image viewer"
            className="absolute right-4 top-4 z-10 text-paper-50/70 transition-colors hover:text-paper-50"
          >
            <X size={24} />
          </button>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

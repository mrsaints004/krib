"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  duration: number;
}

interface ToastContextValue {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Config per variant                                                 */
/* ------------------------------------------------------------------ */

const VARIANT_CONFIG: Record<
  ToastVariant,
  { Icon: typeof CheckCircle2; bg: string; border: string; text: string; icon: string }
> = {
  success: {
    Icon: CheckCircle2,
    bg: "bg-verified-light",
    border: "border-verified/30",
    text: "text-verified-dark",
    icon: "text-verified",
  },
  error: {
    Icon: XCircle,
    bg: "bg-signal-light",
    border: "border-signal/30",
    text: "text-signal",
    icon: "text-signal",
  },
  warning: {
    Icon: AlertTriangle,
    bg: "bg-clay/10",
    border: "border-clay/30",
    text: "text-clay-dark",
    icon: "text-clay",
  },
  info: {
    Icon: Info,
    bg: "bg-ink-900/5",
    border: "border-ink-900/15",
    text: "text-ink-950",
    icon: "text-ink-800",
  },
};

/* ------------------------------------------------------------------ */
/*  Single toast item                                                  */
/* ------------------------------------------------------------------ */

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const { Icon, bg, border, text, icon } = VARIANT_CONFIG[toast.variant];
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, toast.duration, onDismiss]);

  const isError = toast.variant === "error";

  return (
    <motion.div
      layout
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border ${border} ${bg} px-4 py-3 shadow-lg`}
    >
      <Icon size={18} className={`shrink-0 ${icon}`} aria-hidden="true" />
      <p className={`flex-1 text-sm font-medium ${text}`}>{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className={`shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 ${text}`}
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((variant: ToastVariant, message: string, duration = 4000) => {
    const id = `toast-${++counter}`;
    setToasts((prev) => [...prev, { id, variant, message, duration }]);
  }, []);

  const success = useCallback((msg: string, dur?: number) => push("success", msg, dur), [push]);
  const error = useCallback((msg: string, dur?: number) => push("error", msg, dur), [push]);
  const warning = useCallback((msg: string, dur?: number) => push("warning", msg, dur), [push]);
  const info = useCallback((msg: string, dur?: number) => push("info", msg, dur), [push]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}

      {/* Toast container — fixed top-center */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-4">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

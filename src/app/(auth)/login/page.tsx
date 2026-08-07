"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError("Invalid email or password. Please check your details and try again.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      setLoading(false);

      const role = profile?.role ?? "student";
      switch (role) {
        case "landlord":
          router.push("/landlord/listings");
          break;
        case "admin":
          router.push("/admin/verification-queue");
          break;
        default:
          router.push("/student/listings");
      }
    } else {
      setLoading(false);
      router.push("/student/listings");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6">
      {/* Minimal top bar */}
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="font-display text-xl italic text-ink-950 hover:text-verified-dark transition-colors">
          UniNest
        </Link>
        <Link href="/register" className="text-sm text-ink-800 hover:text-ink-950">
          Create account
        </Link>
      </header>

      <div className="flex flex-1 flex-col justify-center pb-12">
      <motion.div
        initial={{ opacity: 1, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="font-display text-3xl text-ink-950">Welcome back</h1>
        <p className="mt-2 text-sm text-ink-800">Sign in to your account</p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4"
        animate={shake ? { x: [0, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          initial={{ opacity: 1, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 1, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
              Password
            </label>
            <div className="relative mt-1">
              <input
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-ink-900/30 bg-white px-3 py-2.5 pr-10 text-ink-950 outline-none focus:border-verified"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-800/50 hover:text-ink-800"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex items-start gap-2 rounded-md bg-signal-light px-3 py-2.5"
          >
            <p className="text-sm text-signal">{error}</p>
          </motion.div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setResetEmail(email); setForgotOpen(true); }}
            className="flex items-center gap-1 text-xs font-medium text-verified-dark"
          >
            <KeyRound size={12} /> Forgot password?
          </button>
        </div>

        <Button type="submit" loading={loading} className="w-full py-3">
          {loading ? "Logging in\u2026" : "Log in"}
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-ink-900/10" />
          <span className="text-xs text-ink-800/50">or</span>
          <div className="h-px flex-1 bg-ink-900/10" />
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          disabled={googleLoading}
          onClick={async () => {
            setGoogleLoading(true);
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: `${window.location.origin}/auth/callback`,
              },
            });
            if (oauthError) {
              setGoogleLoading(false);
              setError("Could not connect to Google. Please try again.");
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-ink-900/30 py-3 text-sm text-ink-800 hover:bg-ink-900/5 transition-colors disabled:opacity-60"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          {googleLoading ? "Connecting\u2026" : "Continue with Google"}
        </button>
      </motion.form>

      <p className="mt-6 text-center text-sm text-ink-800">
        New to UniNest?{" "}
        <Link href="/register" className="font-medium text-verified-dark underline">
          Create an account
        </Link>
      </p>
      </div>

      {/* Forgot password dialog */}
      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)}>
        <DialogTitle>Reset your password</DialogTitle>
        <DialogDescription>
          Enter your email and we&apos;ll send you a link to reset your password.
        </DialogDescription>
        <div className="mt-4">
          <Input
            label="Email"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setForgotOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            loading={resetLoading}
            className="flex-1"
            onClick={async () => {
              if (!resetEmail) return;
              setResetLoading(true);
              await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/login`,
              });
              setResetLoading(false);
              setForgotOpen(false);
              toast.success("If an account exists with that email, you'll receive a reset link.");
            }}
          >
            Send reset link
          </Button>
        </DialogFooter>
      </Dialog>
    </main>
  );
}

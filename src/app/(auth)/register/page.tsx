"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Home,
  Eye,
  EyeOff,
  Check,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { validatePhone, validatePassword } from "@/lib/validation";

type Role = "student" | "landlord";

interface School {
  code: "FUOYE" | "EKSU" | "FUTES" | "BOUESTI";
  name: string;
  available: boolean;
}

const SCHOOLS: School[] = [
  { code: "FUOYE", name: "Federal University Oye-Ekiti", available: true },
  { code: "EKSU", name: "Ekiti State University", available: false },
  { code: "FUTES", name: "Federal University of Technology, Akure", available: false },
  { code: "BOUESTI", name: "Bamidele Olumilua University, Ikere-Ekiti", available: false },
];

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getPasswordStrength(pw: string): { level: number; label: string } {
  if (pw.length === 0) return { level: 0, label: "" };
  if (pw.length < 8) return { level: 1, label: "Too short" };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
  const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (score === 0) return { level: 2, label: "Weak" };
  if (score === 1) return { level: 3, label: "Fair" };
  return { level: 4, label: "Strong" };
}

const strengthColors = ["", "bg-signal", "bg-signal", "bg-clay", "bg-verified"];


export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("student");
  const [school, setSchool] = useState<School["code"] | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const steps = role === "student" ? 4 : 3;
  const [step, setStep] = useState(1);

  const emailValid = validateEmail(email);
  const passwordStrength = getPasswordStrength(password);

  function markTouched(field: string) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  function goNext() {
    if (role === "student" && step === 2 && !school) {
      markTouched("school");
      return;
    }
    if (step === steps - 1) {
      if (!fullName || !emailValid || !phone || !validatePhone(phone)) {
        setTouched((t) => ({ ...t, fullName: true, email: true, phone: true }));
        return;
      }
    }
    setStep((s) => s + 1);
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const pwResult = validatePassword(password);
    if (!pwResult.valid) {
      setError(pwResult.error ?? "Invalid password");
      markTouched("password");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone, role, university: school },
      },
    });
    setLoading(false);

    if (signUpError) {
      // Map Supabase error messages to safe user-facing messages.
      // Raw errors can leak info (e.g. confirming an email exists).
      const msg = signUpError.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already been registered")) {
        setError("An account with this email may already exist. Try logging in instead.");
      } else if (msg.includes("password")) {
        setError("Password does not meet requirements. Please use a stronger password.");
      } else if (msg.includes("rate") || msg.includes("limit")) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      return;
    }

    setSubmitted(true);
    setTimeout(() => {
      if (role === "student") {
        router.push("/verify");
      } else {
        router.push("/landlord/listings");
      }
    }, 1500);
  }

  const isRoleStep = step === 1;
  const isSchoolStep = role === "student" && step === 2;
  const isDetailsStep = role === "student" ? step === 3 : step === 2;
  const isPasswordStep = step === steps;

  if (submitted) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <CheckCircle2 size={48} className="text-verified" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 1, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 font-display text-2xl text-ink-950"
        >
          Account created
        </motion.h1>
        <motion.p
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-2 text-sm text-ink-800"
        >
          Redirecting you now...
        </motion.p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6">
      {/* Minimal top bar */}
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="font-display text-xl italic text-ink-950 hover:text-verified-dark transition-colors">
          UniNest
        </Link>
        <Link href="/login" className="text-sm text-ink-800 hover:text-ink-950">
          Log in
        </Link>
      </header>

      <div className="flex flex-1 flex-col justify-center pb-12">

      {/* Progress indicator */}
      <div className="mt-6 flex gap-1.5">
        {Array.from({ length: steps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i + 1 <= step ? "bg-verified" : "bg-ink-900/10"
            }`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6">
          {/* Step 1: Role */}
          {isRoleStep && (
            <div>
              <h1 className="font-display text-2xl text-ink-950">
                I&apos;m signing up as a
              </h1>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {(
                  [
                    { value: "student", label: "Student", Icon: GraduationCap },
                    { value: "landlord", label: "Landlord", Icon: Home },
                  ] as const
                ).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setRole(value);
                      setStep(1);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 py-5 transition-colors ${
                      role === value
                        ? "border-verified bg-verified-light"
                        : "border-ink-900/10 hover:border-ink-900/20"
                    }`}
                  >
                    <Icon
                      size={24}
                      className={role === value ? "text-verified-dark" : "text-ink-800/50"}
                    />
                    <span
                      className={`text-sm font-semibold ${
                        role === value ? "text-verified-dark" : "text-ink-800"
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                ))}
              </div>
              <Button type="button" onClick={goNext} className="mt-8 w-full py-3">
                Continue
              </Button>

              <div className="mt-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-ink-900/10" />
                <span className="text-xs text-ink-800/50">or</span>
                <div className="h-px flex-1 bg-ink-900/10" />
              </div>

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
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-ink-900/30 py-3 text-sm text-ink-800 hover:bg-ink-900/5 transition-colors disabled:opacity-60"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                {googleLoading ? "Connecting\u2026" : "Continue with Google"}
              </button>
            </div>
          )}

          {/* Step 2 (students only): School */}
          {isSchoolStep && (
            <div>
              <h1 className="font-display text-2xl text-ink-950">
                Which school?
              </h1>
              <p className="mt-1 text-sm text-ink-800">
                More schools are being added as UniNest expands.
              </p>
              <div className="mt-6 space-y-2">
                {SCHOOLS.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    disabled={!s.available}
                    onClick={() => setSchool(s.code)}
                    className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors ${
                      school === s.code
                        ? "border-verified bg-verified-light"
                        : s.available
                        ? "border-ink-900/30 hover:border-ink-900/40"
                        : "border-ink-900/10 opacity-50"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink-950">
                        {s.code}
                      </p>
                      <p className="text-xs text-ink-800/70">{s.name}</p>
                    </div>
                    {s.available ? (
                      school === s.code && (
                        <Check size={18} className="text-verified-dark" />
                      )
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-ink-800/50">
                        <Lock size={12} /> Soon
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {touched.school && !school && (
                <p className="mt-2 text-xs font-medium text-signal">
                  Select your school to continue
                </p>
              )}
              <div className="mt-8 flex gap-3">
                <Button type="button" variant="ghost" onClick={goBack} className="px-5 py-3">
                  Back
                </Button>
                <Button type="button" onClick={goNext} className="flex-1 py-3">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Details step */}
          {isDetailsStep && (
            <div>
              <h1 className="font-display text-2xl text-ink-950">
                Your details
              </h1>
              <div className="mt-6 space-y-4">
                <Input
                  label="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => markTouched("fullName")}
                  error={touched.fullName && !fullName ? "Required" : undefined}
                />
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => markTouched("email")}
                  error={touched.email && !emailValid ? "Valid email required" : undefined}
                />
                <Input
                  label="Phone"
                  type="tel"
                  placeholder="e.g. 08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => markTouched("phone")}
                  error={
                    touched.phone && !phone
                      ? "Required"
                      : touched.phone && phone && !validatePhone(phone)
                      ? "Enter a valid Nigerian phone number"
                      : undefined
                  }
                />
              </div>
              <div className="mt-8 flex gap-3">
                <Button type="button" variant="ghost" onClick={goBack} className="px-5 py-3">
                  Back
                </Button>
                <Button type="button" onClick={goNext} className="flex-1 py-3">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Final step: Password */}
          {isPasswordStep && (
            <div>
              <h1 className="font-display text-2xl text-ink-950">
                Set a password
              </h1>
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-ink-900">
                    Password
                  </label>
                  {touched.password && password.length < 12 && (
                    <span className="text-xs font-medium text-signal">
                      At least 12 characters
                    </span>
                  )}
                </div>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => markTouched("password")}
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

                {/* Password strength bar */}
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((segment) => (
                        <div
                          key={segment}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            segment <= passwordStrength.level
                              ? strengthColors[passwordStrength.level]
                              : "bg-ink-900/10"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-ink-800/60">
                      {passwordStrength.label}
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <p className="mt-4 rounded-md bg-signal-light px-3 py-2 text-sm text-signal">
                  {error}
                </p>
              )}

              <div className="mt-8 flex gap-3">
                <Button type="button" variant="ghost" onClick={goBack} className="px-5 py-3">
                  Back
                </Button>
                <Button type="submit" loading={loading} className="flex-1 py-3">
                  {loading ? "Creating account\u2026" : "Create account"}
                </Button>
              </div>
            </div>
          )}
      </form>

      <p className="mt-6 text-center text-sm text-ink-800">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-verified-dark underline">
          Log in
        </Link>
      </p>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Search, ShieldCheck, CheckCircle2 } from "lucide-react";
import { VerifiedStamp } from "@/components/ui/VerifiedStamp";
import { BracketFrame } from "@/components/ui/BracketFrame";

function AnimatedSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <div ref={ref} className={className}>
      <motion.div
        initial={{ opacity: 1, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 1, y: 20 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper-50">
      {/* Nav */}
      <header className="border-b border-ink-900/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-display text-xl italic tracking-tight text-ink-950">
            UniNest
          </span>
          <nav className="flex items-center gap-6 text-sm text-ink-800">
            <Link href="/login" className="hover:text-ink-950">
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-ink-950 px-4 py-2 text-paper-50 hover:bg-ink-900"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-verified/20">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <motion.div
                initial={{ opacity: 1, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <VerifiedStamp className="mb-6 [&_span]:text-paper-50 [&_svg]:text-verified" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 1, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="max-w-lg font-display text-4xl leading-[1.1] text-paper-50 sm:text-5xl"
              >
                Every listing inspected. Every defect disclosed.
              </motion.h1>
              <motion.p
                initial={{ opacity: 1, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-6 max-w-md text-lg text-paper-100/70"
              >
                UniNest is the first place Nigerian students look for
                off-campus housing — because every property here has already
                been checked, not just photographed.
              </motion.p>
              <motion.div
                initial={{ opacity: 1, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <Link
                  href="/register"
                  className="rounded-md bg-verified px-6 py-3 font-medium text-paper-50 hover:bg-verified-dark"
                >
                  Find verified housing
                </Link>
                <Link
                  href="/register?role=landlord"
                  className="rounded-md border border-paper-50/20 px-6 py-3 font-medium text-paper-50 hover:bg-paper-50/5"
                >
                  List a property
                </Link>
              </motion.div>
            </div>

            {/* Sample card */}
            <motion.div
              initial={{ opacity: 1, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="hidden md:block"
            >
              <BracketFrame>
                <div className="overflow-hidden rounded-lg border border-paper-50/10 bg-ink-950">
                  <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-verified/20 via-ink-900 to-clay/10">
                    <div className="text-center">
                      <div className="mx-auto h-16 w-16 rounded-full bg-verified/20 flex items-center justify-center">
                        <ShieldCheck size={32} className="text-verified" />
                      </div>
                      <p className="mt-3 font-mono text-xs text-paper-100/40">
                        Verified property
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-display text-lg text-paper-50">
                        Self-Con, Ijigbo Road
                      </p>
                      <VerifiedStamp className="scale-75" />
                    </div>
                    <p className="font-mono text-sm text-paper-100/60">
                      {"\u20A6"}180,000 / year · 8 min to FUOYE
                    </p>
                  </div>
                </div>
              </BracketFrame>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <AnimatedSection>
        <section className="border-b border-ink-900/10 bg-paper-50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-8 px-6 py-8 md:justify-between md:gap-4">
            {[
              { value: "50+", label: "Verified listings" },
              { value: "4", label: "Universities" },
              { value: "100%", label: "Disclosure rate" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-mono text-3xl font-medium text-ink-950">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-ink-800/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      {/* How it works */}
      <AnimatedSection>
        <section className="bg-paper-50">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <h2 className="text-center font-display text-3xl text-ink-950">
              How it works
            </h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {[
                {
                  step: 1,
                  Icon: Search,
                  title: "Browse verified listings",
                  desc: "Search by university, price, and preferences. Every listing has been inspected with defects disclosed upfront.",
                },
                {
                  step: 2,
                  Icon: ShieldCheck,
                  title: "Book with escrow",
                  desc: "Your payment is held securely until you confirm the property matches the listing. A capped facilitation fee, no hidden agent charges.",
                },
                {
                  step: 3,
                  Icon: CheckCircle2,
                  title: "Move in confirmed",
                  desc: "Once you confirm the property, funds release to the landlord. Maintenance requests are tracked from day one.",
                },
              ].map(({ step, Icon, title, desc }) => (
                <div key={step} className="text-center md:text-left">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-verified-light md:mx-0">
                    <Icon size={24} className="text-verified-dark" />
                  </div>
                  <p className="mt-1 font-mono text-xs text-ink-800/40">
                    Step {step}
                  </p>
                  <h3 className="mt-3 font-display text-lg text-ink-950">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-ink-800/70">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* Value props */}
      <AnimatedSection>
        <section className="border-t border-ink-900/10 bg-ink-950">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-3">
            {[
              {
                title: "Defect disclosure, mandatory",
                body: "Every listing states known issues upfront, in writing, before you pay a naira.",
              },
              {
                title: "Capped facilitation fee",
                body: "One transparent fee, shown before checkout — far below the typical agent cut.",
              },
              {
                title: "Maintenance, tracked",
                body: "Report an issue with photo or video, and follow it from request to resolution.",
              },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="font-display text-lg text-paper-50">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-paper-100/70">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      {/* Footer */}
      <footer className="bg-ink-950 border-t border-paper-50/10">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <span className="font-display text-xl italic text-paper-50">
                UniNest
              </span>
              <p className="mt-2 max-w-xs text-sm text-paper-100/50">
                Student accommodation, verified. Every listing inspected,
                every defect disclosed.
              </p>
            </div>
            <div className="flex gap-16">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-paper-100/40">
                  Product
                </p>
                <ul className="mt-3 space-y-2 text-sm text-paper-100/60">
                  <li><Link href="/register" className="hover:text-paper-50">Get started</Link></li>
                  <li><Link href="/login" className="hover:text-paper-50">Log in</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-paper-100/40">
                  Company
                </p>
                <ul className="mt-3 space-y-2 text-sm text-paper-100/60">
                  <li><span className="text-paper-100/30">About (coming soon)</span></li>
                  <li><span className="text-paper-100/30">Contact (coming soon)</span></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-paper-50/10 pt-6">
            <p className="text-xs text-paper-100/30">
              &copy; {new Date().getFullYear()} UniNest. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

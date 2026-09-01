import Link from "next/link";
import { Search, ShieldCheck, CheckCircle2, ArrowRight, Building2, Users, Lock } from "lucide-react";
import { VerifiedStamp } from "@/components/ui/VerifiedStamp";
import { BracketFrame } from "@/components/ui/BracketFrame";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper-50">
      {/* Nav */}
      <header className="border-b border-ink-900/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-display text-xl italic tracking-tight text-ink-950">
            Krib
          </span>
          <nav className="flex items-center gap-6 text-sm text-ink-800">
            <Link href="/login" className="hover:text-ink-950 transition-colors">
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-ink-950 px-4 py-2 text-paper-50 hover:bg-ink-900 transition-colors"
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
              <VerifiedStamp className="mb-6 [&_span]:text-paper-50 [&_svg]:text-verified" />
              <h1 className="max-w-lg font-display text-4xl leading-[1.1] text-paper-50 sm:text-5xl">
                Every listing inspected. Every defect disclosed.
              </h1>
              <p className="mt-6 max-w-md text-lg text-paper-100/70">
                Krib is the first place Nigerian students look for
                off-campus housing — because every property here has already
                been checked, not just photographed.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 rounded-md bg-verified px-6 py-3 font-medium text-paper-50 hover:bg-verified-dark transition-colors"
                >
                  Find verified housing
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/register?role=landlord"
                  className="rounded-md border border-paper-50/20 px-6 py-3 font-medium text-paper-50 hover:bg-paper-50/5 transition-colors"
                >
                  List a property
                </Link>
              </div>
            </div>

            {/* Sample card */}
            <div className="hidden md:block">
              <BracketFrame>
                <div className="overflow-hidden rounded-lg border border-paper-50/10 bg-ink-950">
                  <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-verified/20 via-ink-900 to-clay/10">
                    <div className="text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-verified/20">
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
                      {"\u20A6"}180,000 / year &middot; 8 min to FUOYE
                    </p>
                  </div>
                </div>
              </BracketFrame>
            </div>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="border-b border-ink-900/10 bg-paper-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-8 px-6 py-8 md:justify-between md:gap-4">
          {[
            { Icon: ShieldCheck, label: "Every listing physically inspected" },
            { Icon: Lock, label: "Payments held in escrow" },
            { Icon: Building2, label: "Defects disclosed before you pay" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-center md:text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-verified-light">
                <item.Icon size={18} className="text-verified-dark" />
              </div>
              <p className="text-sm font-medium text-ink-950">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
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

      {/* For students & landlords */}
      <section className="border-t border-ink-900/10 bg-paper-100/50">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-2">
          <div className="rounded-lg border border-ink-900/10 bg-paper-50 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-verified-light">
              <Users size={20} className="text-verified-dark" />
            </div>
            <h3 className="mt-4 font-display text-xl text-ink-950">For students</h3>
            <ul className="mt-4 space-y-2.5">
              {[
                "See real defects before you pay",
                "Escrow protects your money",
                "Message landlords safely — no off-platform scams",
                "Track maintenance requests from move-in",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-ink-800">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-verified" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-verified-dark hover:text-verified transition-colors"
            >
              Create a student account <ArrowRight size={14} />
            </Link>
          </div>

          <div className="rounded-lg border border-ink-900/10 bg-paper-50 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-900/10">
              <Building2 size={20} className="text-ink-800" />
            </div>
            <h3 className="mt-4 font-display text-xl text-ink-950">For landlords</h3>
            <ul className="mt-4 space-y-2.5">
              {[
                "Reach verified students actively looking",
                "Build a verified property reputation",
                "Guaranteed payment through escrow",
                "Manage listings and maintenance in one place",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-ink-800">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-verified" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/register?role=landlord"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-verified-dark hover:text-verified transition-colors"
            >
              List your property <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Value props */}
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

      {/* CTA */}
      <section className="bg-paper-50">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center md:py-20">
          <h2 className="font-display text-3xl text-ink-950">
            Ready to find your next place?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink-800/70">
            Join students and landlords who trust Krib for verified, transparent off-campus housing.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-md bg-verified px-6 py-3 font-medium text-paper-50 hover:bg-verified-dark transition-colors"
            >
              Get started free
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-ink-900/20 px-6 py-3 font-medium text-ink-900 hover:bg-ink-900/5 transition-colors"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-paper-50/10 bg-ink-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <span className="font-display text-xl italic text-paper-50">
                Krib
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
                  <li><Link href="/register" className="hover:text-paper-50 transition-colors">Get started</Link></li>
                  <li><Link href="/login" className="hover:text-paper-50 transition-colors">Log in</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-paper-100/40">
                  Support
                </p>
                <ul className="mt-3 space-y-2 text-sm text-paper-100/60">
                  <li><a href="mailto:hello@krib.ng" className="hover:text-paper-50 transition-colors">hello@krib.ng</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-paper-50/10 pt-6">
            <p className="text-xs text-paper-100/30">
              &copy; {new Date().getFullYear()} Krib. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

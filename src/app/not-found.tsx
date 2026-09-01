import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper-50 px-6 text-center">
      <h1 className="font-display text-6xl text-ink-950">404</h1>
      <p className="mt-3 text-lg text-ink-800/70">
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-verified px-5 py-2.5 text-sm font-medium text-paper-50 hover:bg-verified-dark"
      >
        Go home
      </Link>
    </div>
  );
}

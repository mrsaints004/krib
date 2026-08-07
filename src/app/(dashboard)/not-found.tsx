import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-sm text-ink-800/50">404</p>
      <h1 className="mt-2 font-display text-xl text-ink-950">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-800/70">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-verified px-4 py-2.5 text-sm font-medium text-paper-50 hover:bg-verified-dark"
      >
        Go home
      </Link>
    </div>
  );
}

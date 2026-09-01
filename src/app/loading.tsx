export default function RootLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-screen items-center justify-center bg-paper-50"
    >
      <span className="animate-pulse font-display text-2xl italic text-ink-950">
        Krib
      </span>
    </div>
  );
}

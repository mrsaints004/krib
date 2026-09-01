export default function LandlordMaintenanceLoading() {
  return (
    <main className="min-h-screen bg-paper-50 pb-24 md:pb-0">
      <header className="border-b border-ink-900/10 px-5 py-4">
        <div className="h-6 w-32 animate-pulse rounded bg-ink-900/10" />
      </header>
      <div className="space-y-4 px-5 py-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-ink-900/10 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-ink-900/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-ink-900/10" />
                <div className="h-3 w-40 animate-pulse rounded bg-ink-900/10" />
              </div>
              <div className="h-5 w-20 animate-pulse rounded-full bg-ink-900/10" />
            </div>
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-ink-900/10" />
            <div className="mt-1 h-4 w-2/3 animate-pulse rounded bg-ink-900/10" />
          </div>
        ))}
      </div>
    </main>
  );
}

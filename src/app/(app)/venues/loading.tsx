export default function VenuesLoading() {
  return (
    <div
      className="mx-auto max-w-[90rem] animate-pulse space-y-7"
      aria-label="Chargement des établissements"
    >
      <div className="space-y-3 border-b border-border pb-7">
        <div className="h-3 w-44 rounded bg-muted" />
        <div className="h-12 max-w-2xl rounded bg-muted" />
        <div className="h-5 max-w-xl rounded bg-muted" />
      </div>
      <div className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="space-y-3 border-border p-5 sm:border-r last:sm:border-r-0">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-8 w-14 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="grid gap-4 border-b border-border p-5 last:border-0 lg:grid-cols-4"
          >
            <div className="h-7 rounded bg-muted" />
            <div className="h-7 rounded bg-muted" />
            <div className="h-7 rounded bg-muted" />
            <div className="h-7 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const stats = [
    {
      label: "Status",
      value: "Operational",
      hint: "All systems nominal",
      positive: true,
    },
    {
      label: "Predictions",
      value: "Panel",
      hint: "Manage topics & polls",
      positive: null,
    },
    {
      label: "API zone",
      value: "/api/admin",
      hint: "Authenticated routes",
      positive: null,
    },
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
          Signed-in staff workspace for publishing, moderation, and operations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <article
            key={s.label}
            className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-md"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              {s.label}
            </p>
            <p className="mt-3 text-xl font-bold tabular-nums text-neutral-900 sm:text-2xl">
              {s.value}
            </p>
            <p
              className={
                s.positive === true
                  ? "mt-2 text-xs font-medium text-emerald-600"
                  : "mt-2 text-xs text-neutral-500"
              }
            >
              {s.hint}
            </p>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 p-6">
        <h2 className="text-sm font-semibold text-neutral-800">Quick links</h2>
        <ul className="mt-3 space-y-2 text-sm text-neutral-600">
          <li>
            <span className="font-medium text-neutral-800">Articles</span> — CMS,
            TipTap editor, AI assist, uploads
          </li>
          <li>
            <span className="font-medium text-neutral-800">Article analytics</span>{" "}
            — pageviews by story
          </li>
          <li>
            <span className="font-medium text-neutral-800">Posts</span> — link-in-bio
            tiles
          </li>
          <li>
            <span className="font-medium text-neutral-800">Webhooks</span> — outbound
            subscriptions and listener events
          </li>
          <li>
            <span className="font-medium text-neutral-800">Ingest data</span> — raw
            payloads and normalized signals
          </li>
          <li>
            <span className="font-medium text-neutral-800">Security</span> — staff
            two-factor settings
          </li>
        </ul>
      </section>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
        Dashboard
        </h1>
        <p className="max-w-xl text-sm text-slate-300">
          Signed-in staff workspace for publishing, moderation, and operations.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Status</p>
          <p className="mt-2 text-lg font-semibold text-emerald-300">Operational</p>
        </article>
        <article className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Predictions</p>
          <p className="mt-2 text-lg font-semibold text-cyan-300">Manage in panel</p>
        </article>
        <article className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">API Zone</p>
          <p className="mt-2 text-lg font-semibold text-violet-300">/api/admin</p>
        </article>
      </div>
    </div>
  );
}

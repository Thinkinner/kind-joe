export default function AdminDashboardPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Dashboard
      </h1>
      <p className="max-w-xl text-sm text-slate-600">
        Signed-in staff view. Add CMS tools and wire APIs under{" "}
        <code className="rounded bg-slate-100 px-1">/api/admin</code> with the
        same permission checks.
      </p>
    </div>
  );
}

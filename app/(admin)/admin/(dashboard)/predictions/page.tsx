import { PredictionsAdminPanel } from "@/components/admin/predictions-admin-panel";

export default function AdminPredictionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          News Predictions
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Create and manage news prediction topics. Writers and admins can
          publish community polls around current events.
        </p>
      </div>
      <PredictionsAdminPanel />
    </div>
  );
}

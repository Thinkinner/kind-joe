import { PredictionsAdminPanel } from "@/components/admin/predictions-admin-panel";
import { LineChart } from "lucide-react";

export default function AdminPredictionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <LineChart className="h-5 w-5 text-indigo-600" />
          News Predictions
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Create and manage news prediction topics. Writers and admins can
          publish community polls around current events.
        </p>
      </div>
      <PredictionsAdminPanel />
    </div>
  );
}

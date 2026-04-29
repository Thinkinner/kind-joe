import { IngestSignalsAdminPanel } from "@/components/domains/admin/ingest-signals-admin-panel";
import Link from "next/link";
import { Database } from "lucide-react";

export default function AdminIngestDataPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Database className="h-5 w-5 text-indigo-600" />
          Webhook receipts and signals
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Inspect raw inbound webhook storage and normalized signal rows. For
          outbound webhook configuration, see{" "}
          <Link
            href="/admin/webhooks"
            className="font-medium text-indigo-600 underline-offset-2 hover:underline"
          >
            Webhooks
          </Link>
          .
        </p>
      </div>
      <IngestSignalsAdminPanel />
    </div>
  );
}

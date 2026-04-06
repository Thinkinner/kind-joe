import { IngestSignalsAdminPanel } from "@/components/domains/admin/ingest-signals-admin-panel";
import Link from "next/link";

export default function AdminIngestDataPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Webhook receipts and signals
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
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

import { OutgoingWebhooksAdminPanel } from "@/components/domains/admin/outgoing-webhooks-admin-panel";
import Link from "next/link";

export default function AdminWebhooksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Webhooks
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Configure outbound webhook subscriptions and monitor recently received
          listener events. For full JSON payloads and the{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">signals</code>{" "}
          table, open{" "}
          <Link
            href="/admin/ingest-data"
            className="font-medium text-indigo-600 underline-offset-2 hover:underline"
          >
            Ingest data
          </Link>
          .
        </p>
      </div>
      <OutgoingWebhooksAdminPanel />
    </div>
  );
}

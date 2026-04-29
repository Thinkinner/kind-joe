import { OutgoingWebhooksAdminPanel } from "@/components/domains/admin/outgoing-webhooks-admin-panel";
import Link from "next/link";
import { Webhook } from "lucide-react";

export default function AdminWebhooksPage() {
  return (
    <div className="space-y-6 bg-background">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Webhook className="h-5 w-5 text-indigo-600" />
          Webhooks
        </h1>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
          Configure outbound webhook subscriptions and monitor recently received
          listener events. For full JSON payloads and the{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">signals</code>{" "}
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

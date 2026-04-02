import { OutgoingWebhooksAdminPanel } from "@/components/admin/outgoing-webhooks-admin-panel";

export default function AdminWebhooksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Webhooks
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Configure outbound webhook subscriptions and monitor recently received
          listener events.
        </p>
      </div>
      <OutgoingWebhooksAdminPanel />
    </div>
  );
}

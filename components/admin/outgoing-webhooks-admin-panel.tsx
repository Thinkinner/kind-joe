"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OutgoingWebhook = {
  id: number;
  name: string;
  url: string;
  authorizationToken: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type IncomingEvent = {
  id: number;
  externalEventId: string | null;
  source: string;
  text: string;
  sourceUrl: string | null;
  sourceDisplayName: string | null;
  sourceHandle: string | null;
  sourceAvatarUrl: string | null;
  sourceVerified: boolean;
  receivedAt: string;
};

type Delivery = {
  id: number;
  webhookId: number;
  incomingEventId: number | null;
  status: "success" | "error";
  statusCode: number | null;
  deliveredAt: string;
};

export function OutgoingWebhooksAdminPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyWebhookId, setBusyWebhookId] = useState<number | null>(null);
  const [webhooks, setWebhooks] = useState<OutgoingWebhook[]>([]);
  const [recentEvents, setRecentEvents] = useState<IncomingEvent[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [authorizationToken, setAuthorizationToken] = useState("");

  const deliveryByWebhook = useMemo(() => {
    const m = new Map<number, Delivery[]>();
    for (const d of deliveries) {
      const arr = m.get(d.webhookId) ?? [];
      arr.push(d);
      m.set(d.webhookId, arr);
    }
    return m;
  }, [deliveries]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/outgoing-webhooks", {
        method: "GET",
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as {
        webhooks?: OutgoingWebhook[];
        recentEvents?: IncomingEvent[];
        deliveries?: Delivery[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(body.error ?? "Could not load webhook settings.");
        return;
      }
      setWebhooks(Array.isArray(body.webhooks) ? body.webhooks : []);
      setRecentEvents(Array.isArray(body.recentEvents) ? body.recentEvents : []);
      setDeliveries(Array.isArray(body.deliveries) ? body.deliveries : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createWebhook() {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!url.trim()) {
      toast.error("URL is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/outgoing-webhooks", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          authorizationToken: authorizationToken.trim() || undefined,
          enabled: true,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        webhook?: OutgoingWebhook;
        error?: string;
      };
      if (!res.ok) {
        toast.error(body.error ?? "Could not create webhook.");
        return;
      }
      if (body.webhook) {
        setWebhooks((prev) => [body.webhook!, ...prev]);
      } else {
        await loadData();
      }
      setName("");
      setUrl("");
      setAuthorizationToken("");
      toast.success("Webhook created.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleWebhookEnabled(webhookId: number, enabled: boolean) {
    setBusyWebhookId(webhookId);
    try {
      const res = await fetch(`/api/admin/outgoing-webhooks/${webhookId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        webhook?: OutgoingWebhook;
        error?: string;
      };
      if (!res.ok) {
        toast.error(body.error ?? "Could not update webhook.");
        return;
      }
      if (body.webhook) {
        setWebhooks((prev) =>
          prev.map((w) => (w.id === webhookId ? body.webhook! : w)),
        );
      } else {
        await loadData();
      }
    } finally {
      setBusyWebhookId(null);
    }
  }

  async function deleteWebhook(webhookId: number) {
    setBusyWebhookId(webhookId);
    try {
      const res = await fetch(`/api/admin/outgoing-webhooks/${webhookId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(body.error ?? "Could not delete webhook.");
        return;
      }
      setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
      toast.success("Webhook removed.");
    } finally {
      setBusyWebhookId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Outgoing webhooks</h2>
        <p className="mt-1 text-sm text-slate-600">
          Manage downstream endpoints for `signal.created` fan-out events.
        </p>
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Primary webhook"
                maxLength={120}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">URL</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                maxLength={2048}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Authorization token (optional)
            </label>
            <Input
              value={authorizationToken}
              onChange={(e) => setAuthorizationToken(e.target.value)}
              placeholder="Bearer token value (without 'Bearer ')"
              maxLength={4096}
            />
          </div>
          <div>
            <Button type="button" onClick={() => void createWebhook()} disabled={saving}>
              {saving ? "Creating…" : "Create webhook"}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Configured endpoints</h2>
        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Loading…
          </div>
        ) : webhooks.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No webhooks configured.
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((hook) => {
              const latest = deliveryByWebhook.get(hook.id)?.[0];
              return (
                <article
                  key={hook.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{hook.name}</h3>
                      <p className="mt-1 break-all text-xs text-slate-500">{hook.url}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Status:{" "}
                        <span className="font-semibold">
                          {hook.enabled ? "Enabled" : "Disabled"}
                        </span>
                        {latest
                          ? ` · Last delivery ${latest.status.toUpperCase()}${latest.statusCode ? ` (${latest.statusCode})` : ""}`
                          : " · No deliveries yet"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyWebhookId === hook.id}
                        onClick={() =>
                          void toggleWebhookEnabled(hook.id, !hook.enabled)
                        }
                      >
                        {hook.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={busyWebhookId === hook.id}
                        onClick={() => void deleteWebhook(hook.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Recently heard</h2>
        {loading ? null : recentEvents.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No incoming events yet.
          </div>
        ) : (
          <div className="space-y-3">
            {recentEvents.slice(0, 30).map((evt) => (
              <article
                key={evt.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {evt.source} · {evt.sourceDisplayName || evt.sourceHandle || "Unknown"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(evt.receivedAt).toLocaleString()}
                  </p>
                </div>
                <p className="mt-2 text-sm text-slate-800 line-clamp-3">{evt.text}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

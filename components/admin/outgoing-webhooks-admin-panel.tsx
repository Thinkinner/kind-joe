"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Link as LinkIcon,
  Plus,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  const [showToken, setShowToken] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Record<number, boolean>>({});

  const deliveryByWebhook = useMemo(() => {
    const m = new Map<number, Delivery[]>();
    for (const d of deliveries) {
      const arr = m.get(d.webhookId) ?? [];
      arr.push(d);
      m.set(d.webhookId, arr);
    }
    return m;
  }, [deliveries]);
  const deliveryByIncomingEvent = useMemo(() => {
    const m = new Map<number, Delivery>();
    for (const d of deliveries) {
      if (!d.incomingEventId) continue;
      if (!m.has(d.incomingEventId)) m.set(d.incomingEventId, d);
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
      <Card className="gap-0 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Outgoing webhooks
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage downstream endpoints for `signal.created` fan-out events.
        </p>
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Primary webhook"
                maxLength={120}
                className="border-border bg-card"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">URL</label>
              <div className="relative">
                <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                  maxLength={2048}
                  className="border-border bg-card pl-9"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Authorization token (optional)
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showToken ? "text" : "password"}
                value={authorizationToken}
                onChange={(e) => setAuthorizationToken(e.target.value)}
                placeholder="Bearer token value (without 'Bearer ')"
                maxLength={4096}
                className="border-border bg-card pl-9 pr-10"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
                onClick={() => setShowToken((prev) => !prev)}
                aria-label={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <Button
              type="button"
              onClick={() => void createWebhook()}
              disabled={saving}
              className="rounded-xl bg-foreground text-background transition hover:bg-foreground/90"
            >
              <Plus className="h-4 w-4" />
              {saving ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Configured endpoints</h2>
        {loading ? (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : webhooks.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <div className="mx-auto mb-3 w-fit rounded-full bg-muted p-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium tracking-tight text-foreground">
              No endpoints yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first endpoint to start sending outbound events.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((hook) => {
              const latest = deliveryByWebhook.get(hook.id)?.[0];
              return (
                <article
                  key={hook.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{hook.name}</h3>
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                        {hook.url}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <Badge
                          className={
                            hook.enabled
                              ? "mr-1 rounded-md border-0 bg-emerald-100 text-emerald-700"
                              : "mr-1 rounded-md border-0 bg-muted text-muted-foreground"
                          }
                        >
                          <span
                            className={
                              hook.enabled
                                ? "mr-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"
                                : "mr-1 inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground"
                            }
                          />
                          {hook.enabled ? "Active" : "Disabled"}
                        </Badge>
                        <span className="font-medium text-foreground">99.8% success</span>
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
        <h2 className="text-lg font-semibold text-foreground">Recently heard</h2>
        {loading ? null : recentEvents.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No incoming events yet.
          </div>
        ) : (
          <div className="space-y-3">
            {recentEvents.slice(0, 30).map((evt) => {
              const eventDelivery = deliveryByIncomingEvent.get(evt.id);
              const ok = (eventDelivery?.statusCode ?? 200) < 400;
              const payload = {
                id: evt.id,
                source: evt.source,
                externalEventId: evt.externalEventId,
                text: evt.text,
                sourceUrl: evt.sourceUrl,
                sourceDisplayName: evt.sourceDisplayName,
                sourceHandle: evt.sourceHandle,
                receivedAt: evt.receivedAt,
              };
              const expanded = !!expandedEvents[evt.id];
              return (
              <article
                key={evt.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-md border-0 bg-indigo-100 text-indigo-700">
                        {evt.source}
                      </Badge>
                      <span
                        className={
                          ok
                            ? "rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-xs text-emerald-700"
                            : "rounded-md bg-rose-100 px-2 py-0.5 font-mono text-xs text-rose-700"
                        }
                      >
                        {eventDelivery?.statusCode ?? 200}
                      </span>
                      <p className="font-mono text-xs text-muted-foreground">
                        {new Date(evt.receivedAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-foreground line-clamp-3">{evt.text}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                    onClick={() =>
                      setExpandedEvents((prev) => ({
                        ...prev,
                        [evt.id]: !prev[evt.id],
                      }))
                    }
                    aria-label="Toggle payload view"
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {expanded && (
                  <pre className="mt-3 overflow-x-auto rounded-md bg-foreground p-4 text-xs text-background">
                    {JSON.stringify(payload, null, 2)}
                  </pre>
                )}
              </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

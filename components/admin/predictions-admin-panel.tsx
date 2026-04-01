"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { PredictionMarketView } from "@/lib/predictions/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PredictionsAdminPanel() {
  const [markets, setMarkets] = useState<PredictionMarketView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locksAt, setLocksAt] = useState("");
  const [optionsText, setOptionsText] = useState("Yes\nNo");

  const sorted = useMemo(
    () =>
      [...markets].sort((a, b) => {
        return b.id - a.id;
      }),
    [markets],
  );

  async function loadMarkets() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/predictions", {
        method: "GET",
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as {
        markets?: PredictionMarketView[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(body.error ?? "Could not load markets.");
        return;
      }
      setMarkets(Array.isArray(body.markets) ? body.markets : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMarkets();
  }, []);

  async function createMarket() {
    const options = optionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (title.trim().length < 4) {
      toast.error("Title must be at least 4 characters.");
      return;
    }
    if (options.length < 2) {
      toast.error("Add at least 2 options.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/predictions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          locksAt: locksAt ? new Date(locksAt).toISOString() : undefined,
          options,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        market?: PredictionMarketView;
        error?: string;
      };
      if (!res.ok) {
        toast.error(body.error ?? "Could not create market.");
        return;
      }
      if (body.market) {
        setMarkets((prev) => [body.market!, ...prev]);
      } else {
        await loadMarkets();
      }
      setTitle("");
      setDescription("");
      setLocksAt("");
      setOptionsText("Yes\nNo");
      toast.success("Prediction market created.");
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(marketId: number, status: "open" | "locked" | "resolved") {
    setBusyId(marketId);
    try {
      const res = await fetch(`/api/admin/predictions/${marketId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        market?: PredictionMarketView;
        error?: string;
      };
      if (!res.ok) {
        toast.error(body.error ?? "Could not update market.");
        return;
      }
      if (body.market) {
        setMarkets((prev) => prev.map((m) => (m.id === marketId ? body.market! : m)));
      } else {
        await loadMarkets();
      }
      toast.success(`Market marked ${status}.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Create market</h2>
        <p className="mt-1 text-sm text-slate-600">
          Community news voting only. Users can change their vote while a topic
          is open.
        </p>
        <div className="mt-4 grid gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Will Team X win this weekend?"
              maxLength={240}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1200}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Context, rules, and what counts as outcome."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Lock at (optional)
              </label>
              <Input
                type="datetime-local"
                value={locksAt}
                onChange={(e) => setLocksAt(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Options (one per line)
              </label>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <Button type="button" onClick={() => void createMarket()} disabled={creating}>
              {creating ? "Creating…" : "Create market"}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Existing markets</h2>
        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Loading…
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No markets yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((m) => (
              <article
                key={m.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{m.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      /predictions/{m.slug} · {m.totalVotes.toLocaleString()} votes
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Status: <span className="font-semibold">{m.status}</span>
                      {m.locksAt ? ` · Locks ${toDatetimeLocalValue(m.locksAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === m.id || m.status === "open"}
                      onClick={() => void updateStatus(m.id, "open")}
                    >
                      Open
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === m.id || m.status === "locked"}
                      onClick={() => void updateStatus(m.id, "locked")}
                    >
                      Lock
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === m.id || m.status === "resolved"}
                      onClick={() => void updateStatus(m.id, "resolved")}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

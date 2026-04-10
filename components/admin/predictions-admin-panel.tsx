"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Info,
  Pencil,
  TrendingUp,
  Type,
  Users,
} from "lucide-react";
import type { PredictionMarketView } from "@/lib/predictions/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [options, setOptions] = useState<string[]>(["Yes", "No"]);

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
    const cleanOptions = options.map((s) => s.trim()).filter(Boolean);
    if (title.trim().length < 4) {
      toast.error("Title must be at least 4 characters.");
      return;
    }
    if (cleanOptions.length < 2) {
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
          options: cleanOptions,
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
      setOptions(["Yes", "No"]);
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

  const setOptionAt = (index: number, value: string) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  };

  const addOption = () => {
    setOptions((prev) => [...prev, ""]);
  };

  const getStatusBadge = (status: PredictionMarketView["status"]) => {
    if (status === "open") {
      return (
        <Badge className="rounded-md border-0 bg-emerald-100 text-emerald-700">
          <span className="mr-1 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Active
        </Badge>
      );
    }
    if (status === "resolved") {
      return (
        <Badge className="rounded-md border-0 bg-sky-100 text-sky-700">Resolved</Badge>
      );
    }
    return (
      <Badge className="rounded-md border-0 bg-slate-200 text-slate-700">Closed</Badge>
    );
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-indigo-200/60 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-800">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
          <p>Users can change their vote while a topic is open.</p>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Create market</h2>
        <div className="grid gap-4">
          <Card className="gap-0 p-4">
            <h3 className="mb-3 text-sm font-medium text-slate-700">Question setup</h3>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <div className="relative">
                  <Type className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Will Team X win this weekend?"
                    maxLength={240}
                    className="pl-9"
                  />
                </div>
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
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Context, rules, and what counts as outcome."
                />
              </div>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="gap-0 p-4">
              <h3 className="mb-3 text-sm font-medium text-slate-700">Timing</h3>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Lock at (optional)
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="datetime-local"
                  value={locksAt}
                  onChange={(e) => setLocksAt(e.target.value)}
                  className="pl-9"
                />
              </div>
            </Card>

            <Card className="gap-0 p-4">
              <h3 className="mb-3 text-sm font-medium text-slate-700">Options</h3>
              <div className="space-y-2">
                {options.map((option, idx) => (
                  <Input
                    key={idx}
                    value={option}
                    onChange={(e) => setOptionAt(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 w-fit"
                onClick={addOption}
              >
                + Add Option
              </Button>
            </Card>
          </div>

          <div>
            <Button
              type="button"
              onClick={() => void createMarket()}
              disabled={creating}
              className="rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 text-white hover:from-rose-500 hover:to-orange-500"
            >
              <TrendingUp className="h-4 w-4" />
              {creating ? "Creating..." : "Create market"}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Existing markets</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-72" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-14" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No markets yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((m) => (
              <article
                key={m.id}
                className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.2)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-2">{getStatusBadge(m.status)}</div>
                    <h3 className="text-base font-semibold text-slate-900">{m.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {m.totalVotes.toLocaleString()} votes • 1.2k Votes • $450 Volume
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      /predictions/{m.slug}
                      {m.locksAt ? ` · Locks ${toDatetimeLocalValue(m.locksAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTitle(m.title);
                        setDescription(m.description ?? "");
                        setLocksAt(toDatetimeLocalValue(m.locksAt));
                        toast.message("Market loaded into editor.");
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === m.id || m.status === "locked"}
                      onClick={() => void updateStatus(m.id, "locked")}
                    >
                      Close
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === m.id || m.status === "resolved"}
                      onClick={() => void updateStatus(m.id, "resolved")}
                    >
                      Settle
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

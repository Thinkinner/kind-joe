"use client";

import { useEffect, useState } from "react";
import { Loader2, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type AutoCommentRunResult = {
  enabled: boolean;
  scanned: number;
  posted: number;
  skipped: number;
  reason: string;
  articles: AutoCommentArticleRunEntry[];
};

type AutoCommentArticleRunEntry = {
  articleId: string;
  slug: string;
  title: string;
  marketId: number | null;
  articleState: "draft" | "scheduled" | "published" | "unpublished";
  status: "posted" | "skipped";
  reason: string;
  commentPreview: string;
  authorId: string;
  delayMinutes: number;
  dueAtIso: string;
};

type AutoCommentScheduleSlot = {
  slotIndex: number;
  delayMinutes: number;
  dueAtIso: string | null;
  status:
    | "posted"
    | "pending"
    | "due_now"
    | "expired"
    | "missing_publish_time"
    | "blocked_previous_slot";
  timeLeftSeconds: number | null;
  postedCommentBody: string | null;
  postedAtIso: string | null;
};

type AutoCommentScheduleRow = {
  articleId: string;
  slug: string;
  title: string;
  marketId: number | null;
  articleState: "draft" | "scheduled" | "published" | "unpublished";
  publishedAtIso: string | null;
  commentTargetCount: number;
  postedCount: number;
  slots: AutoCommentScheduleSlot[];
};

type HumanCommentResult = {
  commentDraft?: string;
  commentPersona?: string;
  commentEmotion?: string;
  commentDelayLabel?: string;
  error?: string;
};

export default function AdminAutoCommentsPage() {
  const [forceDue, setForceDue] = useState(false);
  const [latestOnly, setLatestOnly] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [runResult, setRunResult] = useState<AutoCommentRunResult | null>(null);

  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentResult, setCommentResult] = useState<HumanCommentResult | null>(null);
  const [selectedArticle, setSelectedArticle] =
    useState<AutoCommentArticleRunEntry | null>(null);
  const [scheduleRows, setScheduleRows] = useState<AutoCommentScheduleRow[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleGeneratedAt, setScheduleGeneratedAt] = useState<string | null>(null);

  const loadSchedules = async (silent = false) => {
    if (!silent) setScheduleLoading(true);
    try {
      const res = await fetch("/api/admin/ai/auto-comments?limit=40", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await res.json().catch(() => ({}))) as {
        schedules?: AutoCommentScheduleRow[];
        generatedAt?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error || "Could not load schedules");
      setScheduleRows(payload.schedules ?? []);
      setScheduleGeneratedAt(payload.generatedAt ?? null);
    } catch (error) {
      if (!silent) {
        toast.error(
          error instanceof Error ? error.message : "Could not load schedules",
        );
      }
    } finally {
      if (!silent) setScheduleLoading(false);
    }
  };

  useEffect(() => {
    void loadSchedules();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadSchedules(true);
    }, 20_000);
    return () => window.clearInterval(id);
  }, []);

  const runAutoCommentsNow = async () => {
    setRunLoading(true);
    try {
      const res = await fetch("/api/admin/ai/auto-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceDue, latestOnly }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        autoComments?: AutoCommentRunResult;
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error || "Could not run auto-comments");
      const nextResult = payload.autoComments ?? null;
      setRunResult(nextResult);
      if (nextResult?.articles?.length) {
        const firstPosted =
          nextResult.articles.find((item) => item.status === "posted") ??
          nextResult.articles[0];
        setSelectedArticle(firstPosted);
      } else {
        setSelectedArticle(null);
      }
      toast.success("Auto-comment cycle finished");
      void loadSchedules(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not run auto-comments");
    } finally {
      setRunLoading(false);
    }
  };

  const generateComment = async () => {
    if (!title.trim() && !sourceText.trim()) {
      toast.message("Add article title or source text first");
      return;
    }
    setCommentLoading(true);
    try {
      const res = await fetch("/api/admin/ai/article-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "humanComment",
          title: title.trim(),
          html: sourceText.trim(),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as HumanCommentResult;
      if (!res.ok) throw new Error(payload.error || "Could not generate comment");
      setCommentResult(payload);
      toast.success("Comment generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate comment");
    } finally {
      setCommentLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Auto Comment Tester
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Run the auto-comment scheduler manually and preview human-like comments.
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Run Scheduler</h2>
            <p className="text-sm text-slate-600">
              Processes published/scheduled articles and posts due auto-comments.
            </p>
          </div>
          <Button onClick={runAutoCommentsNow} disabled={runLoading}>
            {runLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {runLoading ? "Running..." : "Run Auto Comments Now"}
          </Button>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
          <Switch checked={forceDue} onCheckedChange={setForceDue} />
          <div>
            <Label className="text-sm font-medium text-slate-800">
              Force due now (ignore random delay)
            </Label>
            <p className="text-xs text-slate-500">
              Useful for immediate testing.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
          <Switch checked={latestOnly} onCheckedChange={setLatestOnly} />
          <div>
            <Label className="text-sm font-medium text-slate-800">
              Target latest article only
            </Label>
            <p className="text-xs text-slate-500">
              Focus run on the newest eligible published article.
            </p>
          </div>
        </div>

        {runResult ? (
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric title="Enabled" value={runResult.enabled ? "Yes" : "No"} />
            <Metric title="Scanned" value={String(runResult.scanned)} />
            <Metric title="Posted" value={String(runResult.posted)} />
            <Metric title="Skipped" value={String(runResult.skipped)} />
          </div>
        ) : null}
        {runResult?.reason ? (
          <p className="text-sm text-amber-700">{runResult.reason}</p>
        ) : null}
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Schedule monitor</h2>
            <p className="text-sm text-slate-600">
              Live slot schedule for latest articles. Refreshes every 20 seconds.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadSchedules()}
              disabled={scheduleLoading}
            >
              {scheduleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh schedule"
              )}
            </Button>
          </div>
        </div>
        {scheduleGeneratedAt ? (
          <p className="text-xs text-slate-500">
            Updated: {new Date(scheduleGeneratedAt).toLocaleString()}
          </p>
        ) : null}
        {scheduleRows.length ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Article</th>
                    <th className="px-3 py-2 font-semibold">State</th>
                    <th className="px-3 py-2 font-semibold">Progress</th>
                    <th className="px-3 py-2 font-semibold">Slots</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleRows.map((row) => (
                    <tr
                      key={row.articleId}
                      className="border-t border-slate-100 align-top hover:bg-slate-50"
                    >
                      <td className="px-3 py-2">
                        <p className="max-w-[300px] truncate font-medium text-slate-800">
                          {row.title}
                        </p>
                        <p className="text-slate-500">/{row.slug}</p>
                        <p className="text-slate-500">
                          {row.marketId != null ? `Market #${row.marketId}` : "No market"}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-slate-700">{row.articleState}</p>
                        <p className="text-slate-500">
                          {row.publishedAtIso
                            ? new Date(row.publishedAtIso).toLocaleString()
                            : "No publish time"}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-800">
                          {row.postedCount}/{row.commentTargetCount} posted
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <div className="space-y-2">
                          {row.slots.map((slot) => (
                            <div
                              key={`${row.articleId}-slot-${slot.slotIndex}`}
                              className="rounded border border-slate-200 bg-slate-50 p-2"
                            >
                              <p className="font-semibold text-slate-800">
                                Slot {slot.slotIndex + 1} · {slot.delayMinutes} min
                              </p>
                              <p className="text-slate-600">
                                Status:{" "}
                                <span className="font-medium uppercase">{slot.status}</span>
                              </p>
                              <p className="text-slate-600">
                                Due:{" "}
                                {slot.dueAtIso
                                  ? new Date(slot.dueAtIso).toLocaleString()
                                  : "n/a"}
                              </p>
                              <p className="text-slate-600">
                                {slot.status === "posted"
                                  ? `Posted at ${slot.postedAtIso ? new Date(slot.postedAtIso).toLocaleString() : "unknown"}`
                                  : slot.timeLeftSeconds != null
                                    ? `Time left: ${Math.max(0, Math.floor(slot.timeLeftSeconds / 60))}m ${Math.max(0, slot.timeLeftSeconds % 60)}s`
                                    : "Time left: n/a"}
                              </p>
                              <p className="text-slate-700">
                                {slot.postedCommentBody
                                  ? `Comment: ${slot.postedCommentBody}`
                                  : "Comment: Will be generated at due time"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {scheduleLoading
              ? "Loading schedule..."
              : "No scheduled articles yet (publish and link predictions to see them)."}
          </p>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Generate One Comment</h2>
          <p className="text-sm text-slate-600">
            Quick check for how the AI comment voice looks before running scheduler.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="comment-title">Article title</Label>
          <Input
            id="comment-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter article title..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="comment-source">Article content or summary</Label>
          <Textarea
            id="comment-source"
            rows={7}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Paste content/excerpt here..."
          />
        </div>
        <Button
          onClick={generateComment}
          disabled={commentLoading}
          className="bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {commentLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {commentLoading ? "Generating..." : "Generate Comment"}
        </Button>

        {commentResult?.commentDraft ? (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Comment draft</p>
            <p className="text-sm text-slate-700">{commentResult.commentDraft}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Metric title="Persona" value={commentResult.commentPersona || "—"} />
              <Metric title="Emotion" value={commentResult.commentEmotion || "—"} />
              <Metric title="Delay" value={commentResult.commentDelayLabel || "—"} />
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Article run details</h2>
          <p className="text-sm text-slate-600">
            Click a row to view detailed comment info.
          </p>
        </div>
        {runResult?.articles?.length ? (
          <div className="space-y-2">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Article</th>
                      <th className="px-3 py-2 font-semibold">Article state</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Reason</th>
                      <th className="px-3 py-2 font-semibold">Market</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runResult.articles.map((item) => {
                      const isSelected =
                        selectedArticle?.articleId === item.articleId &&
                        selectedArticle?.reason === item.reason &&
                        selectedArticle?.status === item.status;
                      return (
                        <tr
                          key={`${item.articleId}-${item.status}-${item.reason}`}
                          className={`cursor-pointer border-t border-slate-100 ${
                            isSelected ? "bg-indigo-50" : "hover:bg-slate-50"
                          }`}
                          onClick={() => setSelectedArticle(item)}
                        >
                          <td className="px-3 py-2">
                            <div className="max-w-[360px]">
                              <p className="truncate font-medium text-slate-800">
                                {item.title}
                              </p>
                              <p className="truncate text-slate-500">/{item.slug}</p>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {item.articleState}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded px-2 py-0.5 font-semibold ${
                                item.status === "posted"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{item.reason}</td>
                          <td className="px-3 py-2 text-slate-700">
                            {item.marketId != null ? `#${item.marketId}` : "n/a"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {selectedArticle ? (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-900">
                  Comment info for: {selectedArticle.title}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <p className="text-xs text-slate-700">
                    <span className="font-semibold">Article state:</span>{" "}
                    {selectedArticle.articleState}
                  </p>
                  <p className="text-xs text-slate-700">
                    <span className="font-semibold">Reason:</span>{" "}
                    {selectedArticle.reason}
                  </p>
                  <p className="text-xs text-slate-700">
                    <span className="font-semibold">Status:</span>{" "}
                    {selectedArticle.status}
                  </p>
                  <p className="text-xs text-slate-700">
                    <span className="font-semibold">Delay:</span>{" "}
                    {selectedArticle.delayMinutes
                      ? `${selectedArticle.delayMinutes} min`
                      : "n/a"}
                  </p>
                  <p className="text-xs text-slate-700">
                    <span className="font-semibold">Due at:</span>{" "}
                    {selectedArticle.dueAtIso
                      ? new Date(selectedArticle.dueAtIso).toLocaleString()
                      : "n/a"}
                  </p>
                  <p className="text-xs text-slate-700">
                    <span className="font-semibold">Bot:</span>{" "}
                    {selectedArticle.authorId || "n/a"}
                  </p>
                  <p className="text-xs text-slate-700">
                    <span className="font-semibold">Market:</span>{" "}
                    {selectedArticle.marketId != null
                      ? `#${selectedArticle.marketId}`
                      : "n/a"}
                  </p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-2">
                  <p className="mb-1 text-xs font-semibold text-slate-600">
                    Comment Preview
                  </p>
                  <p className="text-sm text-slate-700">
                    {selectedArticle.commentPreview || "No comment text for this row."}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No run data yet. Run the scheduler to populate this table.
          </p>
        )}
      </Card>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

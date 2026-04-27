"use client";

import { useState } from "react";
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
  status: "posted" | "skipped";
  reason: string;
  commentPreview: string;
  authorId: string;
  delayMinutes: number;
  dueAtIso: string;
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

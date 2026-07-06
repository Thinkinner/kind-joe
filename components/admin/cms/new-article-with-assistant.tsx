"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Sparkles, WandSparkles } from "lucide-react";
import { AdminArticleForm } from "@/components/admin/cms/admin-article-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ARTICLE_ASSISTANT_MARKDOWN_PROMPT } from "@/lib/ai/article-assistant-prompt";

type PrefillData = {
  title?: string;
  slug?: string;
  category?: string;
  tags?: string[];
  excerpt?: string;
  draftMarkdown?: string;
  draftHtml?: string;
  seoDescription?: string;
};

type SourceFirstSource = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  snippet: string;
  extractedText: string;
  extractedLength: number;
};

type SourceFirstPayload = {
  query: string;
  sources: SourceFirstSource[];
  skipped?: Array<{
    url: string;
    title: string;
    reason: string;
  }>;
};

type InspectResult = {
  inspectOnly: true;
  scraped: boolean;
  sourceUrl?: string;
  sourceTitle?: string;
  previewText?: string;
  charCount?: number;
};

type RecentArticle = {
  id: string;
  title: string;
  category?: string | null;
  updatedAt?: string;
};

type SocialCopyPayload = {
  socialHeadlines?: string[];
  socialTightHeadline?: string;
  socialCaption?: string;
  error?: string;
};

type SourceFirstJobPayload = {
  id: string;
  topic: string;
  status: "queued" | "processing" | "done" | "failed" | string;
  result?: (PrefillData & { sourceFirst?: SourceFirstPayload }) | null;
  error?: string | null;
};

export function NewArticleWithAssistant() {
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [prefill, setPrefill] = useState<PrefillData | undefined>(undefined);
  const [sourceFirstResult, setSourceFirstResult] =
    useState<SourceFirstPayload | null>(null);
  const [sourceFirstJob, setSourceFirstJob] =
    useState<SourceFirstJobPayload | null>(null);
  const [scrapePreview, setScrapePreview] = useState<InspectResult | null>(null);
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [generatingForId, setGeneratingForId] = useState<string | null>(null);
  const [generatedFromId, setGeneratedFromId] = useState<string | null>(null);
  const [socialHeadlines, setSocialHeadlines] = useState<string[]>([]);
  const [socialTightHeadline, setSocialTightHeadline] = useState("");
  const [socialCaption, setSocialCaption] = useState("");

  const applyPrefillData = useCallback((data: PrefillData) => {
    setPrefill({
      title: String(data.title ?? ""),
      slug: String(data.slug ?? ""),
      category: String(data.category ?? "General"),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      excerpt: String(data.excerpt ?? ""),
      draftMarkdown: String(data.draftMarkdown ?? ""),
      draftHtml: String(data.draftHtml ?? ""),
      seoDescription: String(data.seoDescription ?? ""),
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRecentLoading(true);
      try {
        const res = await fetch("/api/admin/articles?mine=1&limit=5&offset=0", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Could not load your recent articles");
        const payload = (await res.json()) as { articles?: RecentArticle[] };
        if (cancelled) return;
        setRecentArticles(Array.isArray(payload.articles) ? payload.articles : []);
      } catch {
        if (cancelled) return;
        setRecentArticles([]);
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sourceFirstJob?.id || started) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const pollJob = async () => {
      try {
        const res = await fetch(
          `/api/admin/ai/source-first/jobs/${sourceFirstJob.id}`,
          { cache: "no-store" },
        );
        const payload = (await res.json().catch(() => ({}))) as {
          job?: SourceFirstJobPayload;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(payload.error || "Could not load source-first job");
        }
        if (cancelled || !payload.job) return;

        setSourceFirstJob(payload.job);

        if (payload.job.status === "done" && payload.job.result) {
          applyPrefillData(payload.job.result);
          setSourceFirstResult(payload.job.result.sourceFirst ?? null);
          setScrapePreview(null);
          setStarted(true);
          toast.success("Source-first draft is ready.");
          return;
        }

        if (payload.job.status === "failed") {
          toast.error(payload.job.error || "Source-first job failed");
          return;
        }

        timeoutId = setTimeout(pollJob, 4000);
      } catch (error) {
        if (cancelled) return;
        toast.error(
          error instanceof Error ? error.message : "Could not poll source-first job",
        );
      }
    };

    pollJob();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [applyPrefillData, sourceFirstJob?.id, started]);

  const copyText = async (value: string) => {
    const text = value.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const generateWithGemini = async (sourceInput: string): Promise<PrefillData> => {
    const res = await fetch("/api/admin/ai/article-assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "all",
        title: "",
        html: sourceInput,
        customPrompt: ARTICLE_ASSISTANT_MARKDOWN_PROMPT,
      }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || "Assistant request failed");
    }
    return (await res.json()) as PrefillData;
  };

  const runAssistant = async () => {
    if (!source.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai/article-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "all",
          inspectOnly: true,
          html: source,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Assistant request failed");
      }
      const inspect = (await res.json()) as InspectResult;
      if (inspect.inspectOnly && inspect.scraped) {
        setScrapePreview(inspect);
        toast.message("Scrape complete. Review then continue.");
        return;
      }

      const data = await generateWithGemini(source);
      applyPrefillData(data);
      setStarted(true);
      toast.success("Draft generated. Continue editing below.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not generate draft",
      );
    } finally {
      setLoading(false);
    }
  };

  const continueWithScraped = async () => {
    if (!source.trim()) return;
    setLoading(true);
    try {
      const data = await generateWithGemini(source);
      applyPrefillData(data);
      setScrapePreview(null);
      setStarted(true);
      toast.success("Draft generated. Continue editing below.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not generate draft",
      );
    } finally {
      setLoading(false);
    }
  };

  const startSourceFirstJob = async () => {
    if (!source.trim()) return;
    setLoading(true);
    setSourceFirstResult(null);
    setSourceFirstJob(null);
    try {
      const res = await fetch("/api/admin/ai/source-first/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: source,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        job?: SourceFirstJobPayload;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Source-first job request failed");
      }

      if (!data.job) throw new Error("Source-first job was not created.");
      setSourceFirstJob(data.job);
      setScrapePreview(null);
      toast.success("Source-first job queued. The worker will write the draft.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start source-first job",
      );
    } finally {
      setLoading(false);
    }
  };

  const generateSocialFromArticle = async (article: RecentArticle) => {
    setGeneratingForId(article.id);
    try {
      const articleRes = await fetch(`/api/admin/articles/${article.id}`, {
        cache: "no-store",
      });
      if (!articleRes.ok) throw new Error("Could not load article details");
      const articlePayload = (await articleRes.json()) as {
        title?: string;
        excerpt?: string;
        contentHtml?: string;
      };

      const sourceText = [
        String(articlePayload.excerpt ?? ""),
        String(articlePayload.contentHtml ?? ""),
      ]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 2600);

      const socialRes = await fetch("/api/admin/ai/article-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "socialCopy",
          title: String(articlePayload.title ?? article.title ?? ""),
          html: sourceText,
        }),
      });
      const socialPayload = (await socialRes.json().catch(() => ({}))) as SocialCopyPayload;
      if (!socialRes.ok) {
        throw new Error(socialPayload.error ?? "Could not generate social copy");
      }

      const headlines = Array.isArray(socialPayload.socialHeadlines)
        ? socialPayload.socialHeadlines
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 5)
        : [];

      setGeneratedFromId(article.id);
      setSocialHeadlines(headlines);
      setSocialTightHeadline(String(socialPayload.socialTightHeadline ?? "").trim());
      setSocialCaption(String(socialPayload.socialCaption ?? "").trim());
      toast.success("Headlines and caption generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not generate social copy",
      );
    } finally {
      setGeneratingForId(null);
    }
  };

  if (started) {
    return (
      <div className="space-y-6">
        {sourceFirstResult ? (
          <Card className="space-y-4 border border-emerald-200 bg-emerald-50/60 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Source-first research
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">
                Verified sources used
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Query: {sourceFirstResult.query}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {sourceFirstResult.sources.map((sourceItem) => (
                <a
                  key={sourceItem.id}
                  href={sourceItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-emerald-200 bg-white p-4 transition-colors hover:border-emerald-400"
                >
                  <p className="text-xs font-semibold text-emerald-700">
                    {sourceItem.id} · {sourceItem.publisher}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">
                    {sourceItem.title}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {sourceItem.snippet}
                  </p>
                </a>
              ))}
            </div>
            {sourceFirstResult.skipped?.length ? (
              <p className="text-xs text-muted-foreground">
                Skipped {sourceFirstResult.skipped.length} source
                {sourceFirstResult.skipped.length === 1 ? "" : "s"} that could not
                be extracted cleanly.
              </p>
            ) : null}
          </Card>
        ) : null}
        <AdminArticleForm initialValues={prefill} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Card className="space-y-5 border border-violet-500/20 bg-foreground p-6 text-background shadow-[0_0_28px_rgba(99,102,241,0.12)]">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-indigo-300" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Start with Gemini Assistant
          </h1>
        </div>
        <p className="text-sm text-background/80">
          Paste a topic, source URL, or raw article text first. Gemini prepares
          your draft, then opens the same article form with fields prefilled.
        </p>
        <p className="text-xs text-background/70">
          Use source-first mode when you want Google-backed sources with inline
          links embedded where claims are made.
        </p>
        <div className="relative">
          <WandSparkles className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-violet-300" />
          <Textarea
            rows={8}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Enter a topic, paste article URL, or raw text content here..."
            className="border-border bg-foreground pl-10 text-background placeholder:text-background/60"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={runAssistant}
            disabled={loading || !source.trim()}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? "Generating..." : "Ask Gemini and Continue"}
          </Button>
          <Button
            type="button"
            onClick={startSourceFirstJob}
            disabled={
              loading ||
              !source.trim() ||
              (!!sourceFirstJob && sourceFirstJob.status !== "failed")
            }
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? "Queueing..." : "Start source-first worker job"}
          </Button>
          <Button variant="ghost" onClick={() => setStarted(true)}>
            Skip and open empty form
          </Button>
        </div>
        {sourceFirstJob ? (
          <div className="space-y-4 rounded-xl border border-emerald-400/40 bg-emerald-950/20 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                Source-first worker
              </p>
              <h2 className="mt-1 text-lg font-semibold text-background">
                {sourceFirstJob.status === "failed"
                  ? "Job failed"
                  : "Draft job is running"}
              </h2>
              <p className="mt-1 text-sm text-background/75">
                Status: {sourceFirstJob.status}. The page will keep checking until
                the worker stores the finished article.
              </p>
            </div>
            {sourceFirstJob.status === "failed" ? (
              <p className="text-xs text-background/70">
                {sourceFirstJob.error || "The worker could not finish this draft."}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={startSourceFirstJob}
                disabled={loading || !source.trim() || sourceFirstJob.status !== "failed"}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Retry source-first job
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSourceFirstJob(null)}
                disabled={loading}
              >
                Clear job
              </Button>
            </div>
          </div>
        ) : null}
        {scrapePreview ? (
          <div className="space-y-3 rounded-xl border border-indigo-400/40 bg-foreground/80 p-4">
            <p className="text-sm font-medium text-indigo-200">
              Scraped article preview
            </p>
            <p className="text-xs text-background/80">
              Source: {scrapePreview.sourceTitle || scrapePreview.sourceUrl || "Unknown"}
            </p>
            <p className="text-xs text-background/80">
              Extracted length: {scrapePreview.charCount ?? 0} characters
            </p>
            <Textarea
              readOnly
              rows={7}
              value={scrapePreview.previewText || ""}
              className="border-border bg-foreground text-background"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={continueWithScraped}
                disabled={loading}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {loading ? "Preparing..." : "Continue with scraped content"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setScrapePreview(null)}
                disabled={loading}
              >
                Cancel preview
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4 border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Your latest 5 articles
          </h2>
          <p className="text-xs text-muted-foreground">
            Click Generate to create 5 headlines + caption.
          </p>
        </div>

        {recentLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your articles...
          </div>
        ) : recentArticles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent articles found for your user.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentArticles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell className="max-w-[320px] truncate">{article.title}</TableCell>
                  <TableCell>{article.category || "General"}</TableCell>
                  <TableCell>
                    {article.updatedAt
                      ? new Date(article.updatedAt).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={generatingForId === article.id}
                      onClick={() => void generateSocialFromArticle(article)}
                    >
                      {generatingForId === article.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Generate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {generatedFromId ? (
          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground">
              Generated from selected article
            </p>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                5 Headlines
              </p>
              {socialHeadlines.length ? (
                socialHeadlines.map((line, idx) => (
                  <div
                    key={`${line}-${idx}`}
                    className="flex items-start justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
                  >
                    <p className="text-sm text-foreground">{line}</p>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      aria-label={`Copy headline ${idx + 1}`}
                      onClick={() => void copyText(line)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No headlines generated.</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tight Headline
              </p>
              {socialTightHeadline ? (
                <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
                  <p className="text-sm text-foreground">{socialTightHeadline}</p>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    aria-label="Copy tight headline"
                    onClick={() => void copyText(socialTightHeadline)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tight headline generated.</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Caption
              </p>
              {socialCaption ? (
                <>
                  <Textarea readOnly rows={5} value={socialCaption} className="bg-background" />
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" onClick={() => void copyText(socialCaption)}>
                      <Copy className="h-4 w-4" />
                      Copy caption
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No caption generated.</p>
              )}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

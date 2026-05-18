"use client";

import { useEffect, useState } from "react";
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

export function NewArticleWithAssistant() {
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [prefill, setPrefill] = useState<PrefillData | undefined>(undefined);
  const [scrapePreview, setScrapePreview] = useState<InspectResult | null>(null);
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [generatingForId, setGeneratingForId] = useState<string | null>(null);
  const [generatedFromId, setGeneratedFromId] = useState<string | null>(null);
  const [socialHeadlines, setSocialHeadlines] = useState<string[]>([]);
  const [socialTightHeadline, setSocialTightHeadline] = useState("");
  const [socialCaption, setSocialCaption] = useState("");

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
    return <AdminArticleForm initialValues={prefill} />;
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
          Paste a source URL or raw article text first. Gemini prepares your
          draft, then opens the same article form with fields prefilled.
        </p>
        <p className="text-xs text-background/70">
          The article editor includes a live quality score and a non-blocking
          publish confirmation when quality is low.
        </p>
        <div className="relative">
          <WandSparkles className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-violet-300" />
          <Textarea
            rows={8}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Paste article URL or raw text content here..."
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
          <Button variant="ghost" onClick={() => setStarted(true)}>
            Skip and open empty form
          </Button>
        </div>
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

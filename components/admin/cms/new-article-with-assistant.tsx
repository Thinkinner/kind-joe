"use client";

import { useState } from "react";
import { Loader2, Sparkles, WandSparkles } from "lucide-react";
import { AdminArticleForm } from "@/components/admin/cms/admin-article-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type PrefillData = {
  title?: string;
  slug?: string;
  category?: string;
  tags?: string[];
  excerpt?: string;
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

export function NewArticleWithAssistant() {
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [prefill, setPrefill] = useState<PrefillData | undefined>(undefined);
  const [scrapePreview, setScrapePreview] = useState<InspectResult | null>(null);

  const generateWithGemini = async (sourceInput: string): Promise<PrefillData> => {
    const res = await fetch("/api/admin/ai/article-assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "all",
        title: "",
        html: sourceInput,
        customPrompt:
          "Treat input as a source article URL or raw article text. Produce a high-quality rewritten article with substantial original value. The draftHtml should target about 350 words (roughly 320-380) and be formatted in short paragraphs (1-2 sentences per paragraph). Return title, slug, category, tags (about 20), excerpt (at least 12 words), draftHtml, and seoDescription (70-160 chars).",
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

  if (started) {
    return <AdminArticleForm initialValues={prefill} />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Card className="space-y-5 border border-violet-500/20 bg-slate-950 p-6 text-slate-100 shadow-[0_0_28px_rgba(99,102,241,0.12)]">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-indigo-300" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Start with Gemini Assistant
          </h1>
        </div>
        <p className="text-sm text-slate-300">
          Paste a source URL or raw article text first. Gemini prepares your
          draft, then opens the same article form with fields prefilled.
        </p>
        <div className="relative">
          <WandSparkles className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-violet-300" />
          <Textarea
            rows={8}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Paste article URL or raw text content here..."
            className="border-slate-700 bg-slate-950 pl-10 text-slate-100 placeholder:text-slate-500"
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
          <div className="space-y-3 rounded-xl border border-indigo-400/40 bg-slate-900/80 p-4">
            <p className="text-sm font-medium text-indigo-200">
              Scraped article preview
            </p>
            <p className="text-xs text-slate-300">
              Source: {scrapePreview.sourceTitle || scrapePreview.sourceUrl || "Unknown"}
            </p>
            <p className="text-xs text-slate-300">
              Extracted length: {scrapePreview.charCount ?? 0} characters
            </p>
            <Textarea
              readOnly
              rows={7}
              value={scrapePreview.previewText || ""}
              className="border-slate-700 bg-slate-950 text-slate-200"
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
    </div>
  );
}

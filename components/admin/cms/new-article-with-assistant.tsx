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

export function NewArticleWithAssistant() {
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [prefill, setPrefill] = useState<PrefillData | undefined>(undefined);

  const runAssistant = async () => {
    if (!source.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai/article-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "all",
          title: "",
          html: source,
          customPrompt:
            "Treat input as a source article URL or raw article text. Produce a high-quality rewritten article with substantial original value. The draftHtml should target about 350 words (roughly 320-380) and be formatted in short paragraphs (1-2 sentences per paragraph). Return title, slug, category, tags (about 20), excerpt (at least 12 words), draftHtml, and seoDescription (70-160 chars).",
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Assistant request failed");
      }
      const data = (await res.json()) as PrefillData;
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

  if (started) {
    return (
      <AdminArticleForm
        assistantMode
        initialValues={prefill}
        postCreateRedirectTo="/admin/articles/ai-assistant"
      />
    );
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
      </Card>
    </div>
  );
}

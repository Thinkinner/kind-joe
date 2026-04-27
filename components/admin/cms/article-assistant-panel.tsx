"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Copy,
  Loader2,
  PenTool,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type AiTab = "rewrite" | "write" | "analyze" | "comment";

type AssistResult = {
  title: string;
  slug: string;
  category: string;
  tags: string[];
  excerpt: string;
  draftHtml: string;
  seoScore?: number;
  seoFeedback?: string;
  tone?: string;
  bias?: string;
  suggestions?: string[];
  commentDraft?: string;
  commentPersona?: string;
  commentEmotion?: string;
  commentIntent?: string;
  commentDelaySeconds?: number;
  commentDelayLabel?: string;
};

const emptyResult: AssistResult = {
  title: "",
  slug: "",
  category: "",
  tags: [],
  excerpt: "",
  draftHtml: "",
  seoScore: undefined,
  seoFeedback: "",
  tone: "",
  bias: "",
  suggestions: [],
  commentDraft: "",
  commentPersona: "",
  commentEmotion: "",
  commentIntent: "",
  commentDelaySeconds: undefined,
  commentDelayLabel: "",
};

export function ArticleAssistantPanel() {
  const [aiTab, setAiTab] = useState<AiTab>("rewrite");
  const [rewriteSource, setRewriteSource] = useState("");
  const [writePrompt, setWritePrompt] = useState("");
  const [isRewriting, setIsRewriting] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingComment, setIsGeneratingComment] = useState(false);
  const [assistResult, setAssistResult] = useState<AssistResult>(emptyResult);

  const currentHtml = useMemo(() => assistResult.draftHtml.trim(), [assistResult.draftHtml]);
  const isGenerating = isRewriting || isWriting || isAnalyzing || isGeneratingComment;

  const copyText = async (value: string, label: string) => {
    if (!value.trim()) return toast.message(`No ${label.toLowerCase()} to copy`);
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const clearAll = () => {
    setAiTab("rewrite");
    setRewriteSource("");
    setWritePrompt("");
    setAssistResult(emptyResult);
  };

  const copyAllOutput = async () => {
    const lines = [
      assistResult.title ? `Title: ${assistResult.title}` : "",
      assistResult.slug ? `Slug: ${assistResult.slug}` : "",
      assistResult.category ? `Category: ${assistResult.category}` : "",
      assistResult.tags.length ? `Tags: ${assistResult.tags.join(", ")}` : "",
      assistResult.excerpt ? `Excerpt:\n${assistResult.excerpt}` : "",
      assistResult.draftHtml ? `Draft HTML:\n${assistResult.draftHtml}` : "",
      assistResult.seoScore != null ? `SEO Score: ${assistResult.seoScore}/100` : "",
      assistResult.tone ? `Tone: ${assistResult.tone}` : "",
      assistResult.bias ? `Bias: ${assistResult.bias}` : "",
      assistResult.seoFeedback ? `SEO Feedback:\n${assistResult.seoFeedback}` : "",
      assistResult.suggestions?.length
        ? `Suggestions:\n${assistResult.suggestions.map((s) => `- ${s}`).join("\n")}`
        : "",
      assistResult.commentDraft ? `Human-like comment:\n${assistResult.commentDraft}` : "",
      assistResult.commentPersona ? `Comment persona: ${assistResult.commentPersona}` : "",
      assistResult.commentEmotion ? `Comment emotion: ${assistResult.commentEmotion}` : "",
      assistResult.commentIntent ? `Comment intent: ${assistResult.commentIntent}` : "",
      assistResult.commentDelayLabel
        ? `Suggested posting delay: ${assistResult.commentDelayLabel}`
        : "",
    ].filter(Boolean);

    if (!lines.length) {
      toast.message("No output yet");
      return;
    }

    try {
      await navigator.clipboard.writeText(lines.join("\n\n"));
      toast.success("All assistant output copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const runRewrite = async () => {
    if (!rewriteSource.trim()) return;
    setIsRewriting(true);
    try {
      const res = await fetch("/api/admin/ai/article-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "all",
          title: "",
          html: rewriteSource,
          customPrompt:
            "Treat input as a source article URL or raw article text. Produce a high-quality rewritten article with substantial original value. Target draftHtml around 350 words (roughly 320-380) and keep paragraphs short (1-2 sentences each). Return title, slug, category, tags (about 20), excerpt, and draftHtml.",
        }),
      });
      if (!res.ok) throw new Error("Rewrite failed");
      const data = (await res.json()) as Partial<AssistResult>;
      setAssistResult((prev) => ({
        ...prev,
        title: String(data.title ?? ""),
        slug: String(data.slug ?? ""),
        category: String(data.category ?? ""),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        excerpt: String(data.excerpt ?? ""),
        draftHtml: String(data.draftHtml ?? ""),
      }));
      setAiTab("write");
      toast.success("Rewrite complete");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rewrite failed");
    } finally {
      setIsRewriting(false);
    }
  };

  const runWriter = async () => {
    if (!writePrompt.trim()) return;
    setIsWriting(true);
    try {
      const res = await fetch("/api/admin/ai/article-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "content",
          title: assistResult.title,
          html: currentHtml,
          customPrompt: writePrompt,
        }),
      });
      if (!res.ok) throw new Error("Generate content failed");
      const data = (await res.json()) as Partial<AssistResult>;
      const generated = String(data.draftHtml ?? "").trim();
      if (!generated) throw new Error("No content generated");
      setAssistResult((prev) => ({
        ...prev,
        draftHtml: `${prev.draftHtml}\n${generated}`.trim(),
      }));
      setWritePrompt("");
      toast.success("Content added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generate failed");
    } finally {
      setIsWriting(false);
    }
  };

  const runAnalysis = async () => {
    if (!assistResult.title.trim() && !currentHtml) {
      toast.message("Run rewrite first or provide content");
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/admin/ai/article-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "seo",
          title: assistResult.title,
          html: currentHtml,
          customPrompt:
            "Return seoScore (0-100), seoFeedback, tone, bias, and suggestions (array of short actions).",
        }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = (await res.json()) as Partial<AssistResult>;
      setAssistResult((prev) => ({
        ...prev,
        seoScore: typeof data.seoScore === "number" ? data.seoScore : prev.seoScore,
        seoFeedback: String(data.seoFeedback ?? prev.seoFeedback ?? ""),
        tone: String(data.tone ?? prev.tone ?? ""),
        bias: String(data.bias ?? prev.bias ?? ""),
        suggestions: Array.isArray(data.suggestions)
          ? data.suggestions.map(String)
          : (prev.suggestions ?? []),
      }));
      toast.success("SEO analysis complete");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runCommentGenerator = async () => {
    const sourceForComment = currentHtml || rewriteSource;
    if (!assistResult.title.trim() && !sourceForComment.trim()) {
      toast.message("Generate article content first");
      return;
    }
    setIsGeneratingComment(true);
    try {
      const res = await fetch("/api/admin/ai/article-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "humanComment",
          title: assistResult.title,
          html: sourceForComment,
          customPrompt:
            "Write one realistic reader comment with emotion and natural human phrasing.",
        }),
      });
      if (!res.ok) throw new Error("Comment generation failed");
      const data = (await res.json()) as Partial<AssistResult>;
      const commentDraft = String(data.commentDraft ?? "").trim();
      if (!commentDraft) throw new Error("No comment generated");
      setAssistResult((prev) => ({
        ...prev,
        commentDraft,
        commentPersona: String(data.commentPersona ?? ""),
        commentEmotion: String(data.commentEmotion ?? ""),
        commentIntent: String(data.commentIntent ?? ""),
        commentDelaySeconds:
          typeof data.commentDelaySeconds === "number"
            ? data.commentDelaySeconds
            : undefined,
        commentDelayLabel: String(data.commentDelayLabel ?? ""),
      }));
      toast.success("Human-like comment generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Comment generation failed",
      );
    } finally {
      setIsGeneratingComment(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Article Assistant</h1>
        <Button variant="ghost" onClick={clearAll}>Clear All</Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="overflow-hidden border border-violet-500/20 bg-slate-950 text-slate-100 shadow-[0_0_28px_rgba(99,102,241,0.12)] lg:col-span-5">
          <div className="flex items-center gap-3 border-b border-slate-800/90 p-5">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h2 className="text-3xl font-semibold tracking-tight">Gemini AI Assistant</h2>
          </div>

          <div className="border-b border-slate-800/90 p-5 pb-4">
            <div className="grid grid-cols-4 gap-1 rounded-full border border-violet-500/20 bg-slate-900/80 p-1 text-sm font-medium">
              <TabButton active={aiTab === "rewrite"} onClick={() => setAiTab("rewrite")}>
                Auto-Rewrite
              </TabButton>
              <TabButton active={aiTab === "write"} onClick={() => setAiTab("write")}>
                Add Content
              </TabButton>
              <TabButton active={aiTab === "analyze"} onClick={() => setAiTab("analyze")}>
                SEO Check
              </TabButton>
              <TabButton active={aiTab === "comment"} onClick={() => setAiTab("comment")}>
                Human Comment
              </TabButton>
            </div>
          </div>

          <div className="space-y-4 p-5">
            {aiTab === "rewrite" && (
              <>
                <p className="text-sm text-slate-300">
                  Paste an article link or raw text. Gemini rewrites it and auto-fills title, excerpt, tags, and category.
                </p>
                <div className="relative">
                  <WandSparkles className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-violet-300" />
                  <Textarea
                    rows={7}
                    value={rewriteSource}
                    onChange={(e) => setRewriteSource(e.target.value)}
                    placeholder="Paste article URL or raw text content here..."
                    className="border-slate-700 bg-slate-950 pl-10 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <Button
                  type="button"
                  onClick={runRewrite}
                  disabled={isRewriting || !rewriteSource.trim()}
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {isRewriting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isRewriting ? "Generating..." : "Generate Content"}
                  {!isRewriting ? <ArrowRight className="h-4 w-4" /> : null}
                </Button>
              </>
            )}

            {aiTab === "write" && (
              <>
                <p className="text-sm text-slate-300">
                  Ask Gemini to expand or refine content. It appends to the current draft output.
                </p>
                <Textarea
                  rows={6}
                  value={writePrompt}
                  onChange={(e) => setWritePrompt(e.target.value)}
                  placeholder="e.g. Add a conclusion with key takeaways..."
                  className="border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500"
                />
                <Button
                  type="button"
                  onClick={runWriter}
                  disabled={isWriting || !writePrompt.trim()}
                  className="w-full bg-slate-100 text-slate-900 hover:bg-white"
                >
                  {isWriting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4" />}
                  {isWriting ? "Generating..." : "Generate & Insert"}
                </Button>
              </>
            )}

            {aiTab === "analyze" && (
              <>
                <p className="text-sm text-slate-300">
                  Analyze SEO strength, tone, and potential bias before publishing.
                </p>
                <Button
                  type="button"
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                  className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                >
                  {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {isAnalyzing ? "Analyzing..." : "Analyze Article"}
                </Button>
              </>
            )}

            {aiTab === "comment" && (
              <>
                <p className="text-sm text-slate-300">
                  Generate a natural reader-style comment with emotion and a suggested delay before posting.
                </p>
                <Button
                  type="button"
                  onClick={runCommentGenerator}
                  disabled={isGeneratingComment}
                  className="w-full bg-indigo-500 text-white hover:bg-indigo-600"
                >
                  {isGeneratingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isGeneratingComment ? "Generating..." : "Generate Human-like Comment"}
                </Button>
              </>
            )}
          </div>
        </Card>

        <Card className="space-y-4 p-5 lg:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Assistant Output</h3>
            <Button onClick={copyAllOutput} className="bg-indigo-600 text-white hover:bg-indigo-700">
              <Copy className="h-4 w-4" />
              Copy All to Clipboard
            </Button>
          </div>

          <OutputRow
            label="Title"
            value={assistResult.title}
            onCopy={() => copyText(assistResult.title, "Title")}
            isLoading={isGenerating}
          />
          <OutputRow
            label="Slug"
            value={assistResult.slug}
            onCopy={() => copyText(assistResult.slug, "Slug")}
            isLoading={isGenerating}
          />
          <OutputRow
            label="Category"
            value={assistResult.category}
            onCopy={() => copyText(assistResult.category, "Category")}
            isLoading={isGenerating}
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Tags</Label>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyText(assistResult.tags.join(", "), "Tags")}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex min-h-10 flex-wrap gap-2 rounded-xl border-b border-slate-200 bg-slate-50/80 p-3">
              {assistResult.tags.length ? (
                assistResult.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)
              ) : (
                <SkeletonBars bars={2} isLoading={isGenerating} />
              )}
            </div>
          </div>

          <OutputRow
            label="Excerpt"
            value={assistResult.excerpt}
            onCopy={() => copyText(assistResult.excerpt, "Excerpt")}
            multiline
            isLoading={isGenerating}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Draft HTML</Label>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyText(assistResult.draftHtml, "Draft HTML")}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            {assistResult.draftHtml ? (
              <AnimatedSurface className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100">
                {assistResult.draftHtml}
              </AnimatedSurface>
            ) : (
              <div className="rounded-xl border-b border-slate-200 bg-slate-50/80 p-3">
                <SkeletonBars bars={5} isLoading={isGenerating} />
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Metric title="SEO Score" value={assistResult.seoScore != null ? `${assistResult.seoScore}/100` : "—"} />
            <Metric title="Tone" value={assistResult.tone || "—"} />
            <Metric title="Bias" value={assistResult.bias || "—"} />
          </div>
          {assistResult.seoFeedback ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{assistResult.seoFeedback}</p>
          ) : null}
          {assistResult.suggestions?.length ? (
            <ul className="space-y-1 text-sm text-slate-700">
              {assistResult.suggestions.map((s, i) => (
                <li key={`${s}-${i}`} className="flex items-start gap-2">
                  <Activity className="mt-0.5 h-4 w-4 text-indigo-500" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <OutputRow
            label="Human-like Comment"
            value={assistResult.commentDraft ?? ""}
            onCopy={() => copyText(assistResult.commentDraft ?? "", "Human-like Comment")}
            multiline
            isLoading={isGeneratingComment}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric title="Persona" value={assistResult.commentPersona || "—"} />
            <Metric title="Emotion" value={assistResult.commentEmotion || "—"} />
            <Metric title="Post after" value={assistResult.commentDelayLabel || "—"} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-center transition-colors ${
        active
          ? "bg-indigo-500/20 text-indigo-200 shadow-[inset_0_0_0_1px_rgba(129,140,248,0.4)]"
          : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function OutputRow({
  label,
  value,
  onCopy,
  multiline = false,
  isLoading = false,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  multiline?: boolean;
  isLoading?: boolean;
}) {
  const hasValue = Boolean(value.trim());

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</Label>
      <AnimatedSurface className={`relative rounded-xl border-b border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-700 ${multiline ? "min-h-20" : "min-h-11"}`}>
        {hasValue ? (
          <p className={`pr-10 ${multiline ? "whitespace-pre-wrap" : "truncate"}`}>{value}</p>
        ) : (
          <SkeletonBars bars={multiline ? 3 : 1} isLoading={isLoading} />
        )}
        <Button
          size="icon"
          variant="ghost"
          className={`absolute right-2 ${multiline ? "top-2.5" : "top-1/2 -translate-y-1/2"} h-7 w-7 text-slate-500 hover:text-slate-800`}
          onClick={onCopy}
          disabled={!hasValue}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </AnimatedSurface>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase text-slate-500">{title}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SkeletonBars({ bars, isLoading }: { bars: number; isLoading?: boolean }) {
  return (
    <div className="w-full space-y-2">
      {Array.from({ length: bars }).map((_, index) => (
        <div
          key={index}
          className={`h-3 rounded-md bg-slate-300/65 ${isLoading ? "animate-pulse" : ""}`}
          style={{ width: `${100 - index * 12}%` }}
        />
      ))}
    </div>
  );
}

function AnimatedSurface({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.animate(
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
  }, [children]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

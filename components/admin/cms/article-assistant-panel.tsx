"use client";

import { useState } from "react";
import { Copy, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type AssistResult = {
  title: string;
  slug: string;
  category: string;
  tags: string[];
  excerpt: string;
  draftHtml: string;
};

const emptyResult: AssistResult = {
  title: "",
  slug: "",
  category: "",
  tags: [],
  excerpt: "",
  draftHtml: "",
};

export function ArticleAssistantPanel() {
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [rawLines, setRawLines] = useState("");
  const [assistBusy, setAssistBusy] = useState(false);
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [assistResult, setAssistResult] = useState<AssistResult>(emptyResult);
  const [layoutHtml, setLayoutHtml] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyText = async (value: string, field: string) => {
    if (!value.trim()) {
      toast.message("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success(`${field} copied`);
      setTimeout(() => {
        setCopiedField((prev) => (prev === field ? null : prev));
      }, 1200);
    } catch {
      toast.error("Copy failed");
    }
  };

  const clearAll = () => {
    setTitle("");
    setContentHtml("");
    setRawLines("");
    setLayoutHtml("");
    setAssistResult(emptyResult);
    setCopiedField(null);
  };

  const runAssist = async () => {
    setAssistBusy(true);
    try {
      const res = await fetch("/api/admin/ai/article-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          html: contentHtml,
          mode: "all",
        }),
      });
      if (!res.ok) throw new Error("AI assist failed");
      const data = (await res.json()) as Partial<AssistResult>;
      setAssistResult({
        title: String(data.title ?? ""),
        slug: String(data.slug ?? ""),
        category: String(data.category ?? ""),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        excerpt: String(data.excerpt ?? ""),
        draftHtml: String(data.draftHtml ?? ""),
      });
      toast.success("Assistant result generated");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "AI assist failed";
      toast.error(msg);
    } finally {
      setAssistBusy(false);
    }
  };

  const runLayoutHelper = async () => {
    if (!rawLines.trim()) {
      toast.message("Paste raw lines first");
      return;
    }
    setLayoutBusy(true);
    try {
      const res = await fetch("/api/admin/ai/block-editor-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawLines }),
      });
      if (!res.ok) throw new Error("Layout helper failed");
      const data = (await res.json()) as { html?: string };
      setLayoutHtml(String(data.html ?? ""));
      toast.success("Layout helper output ready");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Layout helper failed";
      toast.error(msg);
    } finally {
      setLayoutBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-indigo-50 px-3 py-1">
            <Wand2 className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              AI Workbench
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Article Assistant
          </h1>
          <p className="text-sm text-slate-600">
            Professional side-by-side studio for generating article metadata,
            structure, and draft output.
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={clearAll}>
          Clear All
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 rounded-2xl bg-slate-50/50 p-4 lg:col-span-5 lg:p-5">
          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <h2 className="font-semibold tracking-tight text-slate-900">
                Metadata + draft assist
              </h2>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assist-title" className="text-xs font-bold uppercase text-slate-500">
                Article title
              </Label>
              <Input
                id="assist-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title seed..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assist-html" className="text-xs font-bold uppercase text-slate-500">
                Article HTML
              </Label>
              <Textarea
                id="assist-html"
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                rows={9}
                placeholder="<p>Paste article HTML...</p>"
              />
            </div>
            <Button
              type="button"
              onClick={runAssist}
              disabled={assistBusy}
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {assistBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Generate suggestions
            </Button>
          </Card>

          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-slate-700" />
              <h2 className="font-semibold tracking-tight text-slate-900">
                Block editor helper
              </h2>
            </div>
            <div className="space-y-2">
              <Label htmlFor="layout-lines" className="text-xs font-bold uppercase text-slate-500">
                Raw lines
              </Label>
              <Textarea
                id="layout-lines"
                value={rawLines}
                onChange={(e) => setRawLines(e.target.value)}
                rows={11}
                placeholder="Paste plain text with line breaks..."
              />
            </div>
            <Button
              type="button"
              onClick={runLayoutHelper}
              disabled={layoutBusy}
              className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600"
            >
              {layoutBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Generate layout HTML
            </Button>
          </Card>
        </div>

        <div className="lg:col-span-7">
          <Card className="sticky top-6 space-y-5 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold tracking-tight text-slate-900">
                Assistant output
              </h2>
              {(assistBusy || layoutBusy) && (
                <span className="text-xs font-medium text-slate-500">
                  AI is thinking...
                </span>
              )}
            </div>

            <ResultBlock
              label="Title"
              value={assistResult.title}
              onCopy={() => copyText(assistResult.title, "Title")}
              copied={copiedField === "Title"}
              busy={assistBusy}
              isTitle
            />
            <ResultBlock
              label="Slug"
              value={assistResult.slug}
              onCopy={() => copyText(assistResult.slug, "Slug")}
              copied={copiedField === "Slug"}
              busy={assistBusy}
            />
            <ResultBlock
              label="Category"
              value={assistResult.category}
              onCopy={() => copyText(assistResult.category, "Category")}
              copied={copiedField === "Category"}
              busy={assistBusy}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase text-slate-500">
                  Tags
                </Label>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => copyText(assistResult.tags.join(", "), "Tags")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="relative rounded-xl border border-slate-200 bg-white p-3">
                {assistBusy && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-slate-100/70 via-white/60 to-slate-100/70 animate-pulse" />
                )}
                <div className="relative flex min-h-10 flex-wrap gap-2">
                  {assistResult.tags.length > 0 ? (
                    assistResult.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-700">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">No tags yet</span>
                  )}
                </div>
              </div>
            </div>

            <ResultBlock
              label="Excerpt"
              value={assistResult.excerpt}
              onCopy={() => copyText(assistResult.excerpt, "Excerpt")}
              copied={copiedField === "Excerpt"}
              busy={assistBusy}
              multiline
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase text-slate-500">
                  Draft HTML
                </Label>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => copyText(assistResult.draftHtml, "Draft HTML")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-3">
                {assistBusy && (
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 via-slate-700/30 to-slate-900/70 animate-pulse" />
                )}
                <pre className="relative max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-100">
                  {assistResult.draftHtml || "// No draft output yet"}
                </pre>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase text-slate-500">
                  Layout HTML
                </Label>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => copyText(layoutHtml, "Layout HTML")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-3">
                {layoutBusy && (
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 via-slate-700/30 to-slate-900/70 animate-pulse" />
                )}
                <pre className="relative max-h-52 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-100">
                  {layoutHtml || "// No layout output yet"}
                </pre>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ResultBlock({
  label,
  value,
  onCopy,
  copied,
  busy,
  multiline = false,
  isTitle = false,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  busy: boolean;
  multiline?: boolean;
  isTitle?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold uppercase text-slate-500">{label}</Label>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onCopy}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="relative rounded-xl border border-slate-200 bg-white p-3">
        {busy && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-slate-100/70 via-white/60 to-slate-100/70 animate-pulse" />
        )}
        <div
          className={
            isTitle
              ? "relative text-lg font-bold tracking-tight text-slate-900"
              : "relative text-sm text-slate-700"
          }
        >
          {value || (
            <span className={multiline ? "block min-h-16 text-slate-400" : "text-slate-400"}>
              {copied ? "Copied!" : "No result yet"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

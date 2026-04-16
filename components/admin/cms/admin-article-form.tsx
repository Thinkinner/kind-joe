"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ArrowLeft, ImagePlus, Loader2, WandSparkles } from "lucide-react";
import { AdminBlockEditor } from "@/components/admin/cms/admin-block-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/helpers/articles";
import {
  PREDICTION_CATEGORY_LABELS,
  type PredictionCategory,
} from "@/lib/predictions/categories";
import { toast } from "sonner";

type Props = {
  articleId?: string;
  postCreateRedirectTo?: string;
  assistantMode?: boolean;
  initialValues?: {
    title?: string;
    slug?: string;
    excerpt?: string;
    category?: string;
    tags?: string[];
    draftHtml?: string;
  };
};

type PredictionLookupItem = {
  id: number;
  title: string;
  slug: string;
  status: "open" | "locked" | "resolved";
};

type PredictionSuggestionPayload = {
  suggestionType?: "prediction" | "poll" | "";
  title?: string;
  description?: string;
  category?: string;
  options?: string[];
  rationale?: string;
};

function isLikelyOpenEndedPrompt(question: string): boolean {
  const q = question.trim().toLowerCase();
  if (!q) return false;
  if (/^(what|how|which|who|why|where)\b/.test(q)) return true;
  if (
    /^(will|is|are|do|does|did|can|could|should|would|has|have|had)\b/.test(q)
  ) {
    return false;
  }
  return q.includes("?");
}

function looksLikeYesNoOptions(options: string[]): boolean {
  if (options.length !== 2) return false;
  const normalized = options.map((opt) => opt.trim().toLowerCase()).sort();
  return normalized[0] === "no" && normalized[1] === "yes";
}

function defaultEngagementOptions(): string[] {
  return ["Strongly agree", "Somewhat agree", "Not sure", "Somewhat disagree"];
}

function mapArticleCategoryToPredictionCategory(
  articleCategory: string,
): PredictionCategory {
  const value = articleCategory.trim().toLowerCase();
  if (!value) return "general";
  if (value.includes("politic")) return "politics";
  if (
    value.includes("business") ||
    value.includes("finance") ||
    value.includes("market") ||
    value.includes("econom")
  ) {
    return "economy";
  }
  if (
    value.includes("tech") ||
    value.includes("ai") ||
    value.includes("crypto") ||
    value.includes("web3")
  ) {
    return "technology";
  }
  if (value.includes("science") || value.includes("health")) return "science";
  if (value.includes("sport") || value.includes("nfl") || value.includes("nba")) {
    return "sports";
  }
  if (
    value.includes("world") ||
    value.includes("international") ||
    value.includes("global")
  ) {
    return "world";
  }
  if (
    value.includes("culture") ||
    value.includes("entertainment") ||
    value.includes("lifestyle")
  ) {
    return "culture";
  }
  return "general";
}

export function AdminArticleForm({
  articleId,
  postCreateRedirectTo = "/admin/articles",
  assistantMode = false,
  initialValues,
}: Props) {
  const router = useRouter();
  const editorRef = useRef<Editor | null>(null);
  const [loading, setLoading] = useState(!!articleId);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("General");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isDraft, setIsDraft] = useState(true);
  const [publishAt, setPublishAt] = useState("");
  const [blocks, setBlocks] = useState<object>({
    type: "doc",
    content: [{ type: "paragraph" }],
  });
  const [contentHtml, setContentHtml] = useState("");
  const [uploading, setUploading] = useState(false);
  const [postImageUrl, setPostImageUrl] = useState("");
  const [postImageUploading, setPostImageUploading] = useState(false);
  const [postImageDragging, setPostImageDragging] = useState(false);
  const [showPostPrompt, setShowPostPrompt] = useState(false);
  const [postPromptContext, setPostPromptContext] = useState<"createFlow" | "manual">(
    "createFlow",
  );
  const [pendingCreatedSlug, setPendingCreatedSlug] = useState("");
  const [pendingCreatedArticleId, setPendingCreatedArticleId] = useState("");
  const [savingPostCard, setSavingPostCard] = useState(false);
  const [showPredictionPrompt, setShowPredictionPrompt] = useState(false);
  const [predictionPromptContext, setPredictionPromptContext] = useState<
    "createFlow" | "manual"
  >("createFlow");
  const [predictionTitle, setPredictionTitle] = useState("");
  const [predictionBody, setPredictionBody] = useState("");
  const [predictionCategory, setPredictionCategory] =
    useState<PredictionCategory>("general");
  const [predictionDraftOptions, setPredictionDraftOptions] = useState<string[]>([
    "Yes",
    "No",
  ]);
  const [predictionSuggestionType, setPredictionSuggestionType] = useState<
    "prediction" | "poll" | ""
  >("");
  const [predictionSuggestionRationale, setPredictionSuggestionRationale] =
    useState("");
  const [suggestingPrediction, setSuggestingPrediction] = useState(false);
  const [savingPrediction, setSavingPrediction] = useState(false);
  const [predictionId, setPredictionId] = useState<number | null>(null);
  const [predictionSearch, setPredictionSearch] = useState("");
  const [predictionOptions, setPredictionOptions] = useState<PredictionLookupItem[]>([]);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionLoaded, setPredictionLoaded] = useState(false);
  const postImageInputRef = useRef<HTMLInputElement | null>(null);
  const appliedInitialRef = useRef(false);

  useEffect(() => {
    if (!articleId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/articles/${articleId}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        if (cancelled) return;
        setTitle(data.title ?? "");
        setSlug(data.slug ?? "");
        setExcerpt(data.excerpt ?? "");
        setCategory(data.category ?? "General");
        setTags(Array.isArray(data.tags) ? data.tags : []);
        setCoverImageUrl(data.coverImageUrl ?? "");
        setIsDraft(!!data.isDraft);
        setPredictionId(
          typeof data.predictionId === "number" && Number.isFinite(data.predictionId)
            ? data.predictionId
            : null,
        );
        if (data.publishAt) {
          const d = new Date(data.publishAt);
          setPublishAt(d.toISOString().slice(0, 16));
        }
        if (data.content && typeof data.content === "object") {
          setBlocks(data.content);
        }
        setContentHtml(data.contentHtml ?? "");
      } catch {
        toast.error("Could not load article");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  useEffect(() => {
    if (articleId || appliedInitialRef.current || !initialValues) return;
    appliedInitialRef.current = true;
    if (initialValues.title) setTitle(initialValues.title);
    if (initialValues.slug) setSlug(initialValues.slug);
    if (initialValues.excerpt) setExcerpt(initialValues.excerpt);
    if (initialValues.category) setCategory(initialValues.category);
    if (Array.isArray(initialValues.tags)) setTags(initialValues.tags);
    if (initialValues.draftHtml) setContentHtml(initialValues.draftHtml);
  }, [articleId, initialValues]);

  const onTitle = (v: string) => {
    setTitle(v);
    if (!articleId) setSlug(slugify(v));
  };

  const addTag = (raw: string) => {
    const next = raw.trim().toLowerCase();
    if (!next) return;
    if (tags.includes(next)) return;
    setTags((prev) => [...prev, next]);
  };

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const buildMeta = (opts: { publishNow?: boolean; schedule?: boolean }) => {
    const meta: Record<string, unknown> = {
      title,
      slug,
      excerpt: excerpt || null,
      category,
      tags,
      coverImageUrl: coverImageUrl || null,
      isDraft: opts.publishNow || opts.schedule ? false : isDraft,
      contentHtml,
      predictionId,
    };

    if (opts.publishNow) {
      meta.publishedAt = new Date().toISOString();
      meta.publishAt = null;
    } else if (opts.schedule && publishAt) {
      meta.publishAt = new Date(publishAt).toISOString();
      meta.publishedAt = null;
    } else {
      meta.publishedAt = null;
      meta.publishAt = publishAt
        ? new Date(publishAt).toISOString()
        : null;
    }

    return meta;
  };

  const loadPredictions = useCallback(async (force = false) => {
    if (!force && (predictionLoaded || predictionLoading)) return;
    setPredictionLoading(true);
    try {
      const res = await fetch("/api/admin/predictions", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load predictions");
      const data = await res.json();
      const markets = Array.isArray(data?.markets) ? data.markets : [];
      const normalized: PredictionLookupItem[] = markets
        .filter((market: unknown) => {
          if (!market || typeof market !== "object") return false;
          const row = market as Record<string, unknown>;
          return typeof row.id === "number" && typeof row.title === "string";
        })
        .map((market: Record<string, unknown>) => ({
          id: Number(market.id),
          title: String(market.title),
          slug: String(market.slug ?? ""),
          status: (market.status === "locked" || market.status === "resolved"
            ? market.status
            : "open") as "open" | "locked" | "resolved",
        }));
      setPredictionOptions(normalized);
      setPredictionLoaded(true);
    } catch {
      toast.error("Could not load predictions");
    } finally {
      setPredictionLoading(false);
    }
  }, [
    predictionLoaded,
    predictionLoading,
    setPredictionLoaded,
    setPredictionLoading,
    setPredictionOptions,
  ]);

  useEffect(() => {
    if (!articleId) return;
    void loadPredictions();
  }, [articleId, loadPredictions]);

  const filteredPredictionOptions = predictionSearch.trim()
    ? predictionOptions.filter((item) => {
        const q = predictionSearch.trim().toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q) ||
          String(item.id).includes(q)
        );
      })
    : predictionOptions;

  const selectedPrediction =
    predictionId == null ? null : predictionOptions.find((item) => item.id === predictionId) ?? null;

  const save = async (opts: { publishNow?: boolean; schedule?: boolean }) => {
    setSaving(true);
    try {
      const meta = buildMeta(opts);
      if (articleId) {
        const res = await fetch(`/api/admin/articles/${articleId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...meta, content: blocks }),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Saved");
        router.refresh();
        return;
      }
      const baseSlug = slugify(slug || title) || `article-${Date.now()}`;
      let finalCreateSlug = baseSlug;
      let data: Record<string, unknown> | null = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        const res = await fetch("/api/admin/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...meta,
            slug: finalCreateSlug,
            blocks,
          }),
        });
        if (res.ok) {
          data = (await res.json()) as Record<string, unknown>;
          break;
        }
        const err = await res.json().catch(() => ({}));
        const message =
          typeof err.error === "string" ? err.error : "Create failed";
        const isSlugConflict =
          /slug/i.test(message) &&
          /(exist|conflict|use|duplicate)/i.test(message);
        if (isSlugConflict && attempt < 3) {
          finalCreateSlug = `${baseSlug}-${attempt + 2}`;
          continue;
        }
        throw new Error(message);
      }
      if (!data) throw new Error("Create failed");

      if (slug !== finalCreateSlug) setSlug(finalCreateSlug);
      toast.success("Created");
      setPendingCreatedSlug(finalCreateSlug || String(data.slug ?? ""));
      setPendingCreatedArticleId(String(data.id ?? ""));
      setPredictionTitle(title.trim() ? `Will ${title.trim()}?` : "");
      setPredictionBody(excerpt.trim() || "How do you think this story will unfold?");
      setPredictionCategory(mapArticleCategoryToPredictionCategory(category));
      setPredictionDraftOptions(["Yes", "No"]);
      setPredictionSuggestionType("");
      setPredictionSuggestionRationale("");
      setPostPromptContext("createFlow");
      setPredictionPromptContext("createFlow");
      setShowPostPrompt(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const uploadPostImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setPostImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.url) setPostImageUrl(String(data.url));
      toast.success("Post image uploaded");
    } catch {
      toast.error("Upload failed — check Cloudinary env");
    } finally {
      setPostImageUploading(false);
    }
  };

  const finishAfterCreate = () => {
    setShowPostPrompt(false);
    if (postPromptContext === "manual") {
      return;
    }
    if (pendingCreatedArticleId) {
      setPredictionPromptContext("createFlow");
      setShowPredictionPrompt(true);
      return;
    }
    router.replace(postCreateRedirectTo);
    router.refresh();
  };

  const finishAfterPrediction = () => {
    setShowPredictionPrompt(false);
    if (predictionPromptContext === "manual") {
      setPendingCreatedArticleId(articleId ?? "");
      setPendingCreatedSlug(slug.trim());
      router.refresh();
      return;
    }
    setPendingCreatedArticleId("");
    setPendingCreatedSlug("");
    router.replace(postCreateRedirectTo);
    router.refresh();
  };

  const submitPredictionPrompt = async () => {
    if (!pendingCreatedArticleId) {
      finishAfterPrediction();
      return;
    }
    const cleanedTitle = predictionTitle.trim();
    if (!cleanedTitle) {
      toast.error("Prediction title is required");
      return;
    }
    const cleanedOptions = predictionDraftOptions
      .map((opt) => opt.trim())
      .filter(Boolean);
    const dedupedOptions = [
      ...new Map(cleanedOptions.map((opt) => [opt.toLowerCase(), opt])).values(),
    ];
    if (dedupedOptions.length < 2) {
      toast.error("Please add at least two unique options");
      return;
    }

    setSavingPrediction(true);
    try {
      const createRes = await fetch("/api/admin/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanedTitle,
          description: predictionBody.trim() || undefined,
          category: predictionCategory,
          options: dedupedOptions,
        }),
      });
      const createPayload = (await createRes.json().catch(() => ({}))) as {
        market?: { id?: number } | null;
        error?: string;
      };
      if (!createRes.ok || !createPayload.market?.id) {
        toast.error(createPayload.error ?? "Could not create prediction");
        return;
      }

      const linkRes = await fetch(
        `/api/admin/articles/${pendingCreatedArticleId}/prediction`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ predictionId: createPayload.market.id }),
        },
      );
      const linkPayload = (await linkRes.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!linkRes.ok) {
        toast.error(linkPayload.error ?? "Created prediction but could not link");
        return;
      }

      toast.success("Prediction created and linked");
      setPredictionId(createPayload.market.id);
      await loadPredictions(true);
      finishAfterPrediction();
    } catch {
      toast.error("Could not create and link prediction");
    } finally {
      setSavingPrediction(false);
    }
  };

  const suggestPredictionPrompt = async () => {
    const sourceHtml = contentHtml?.trim() || "";
    const sourceExcerpt = excerpt?.trim() || "";
    if (!title.trim() && !sourceHtml && !sourceExcerpt) {
      toast.error("Add article title or content so AI can suggest a poll.");
      return;
    }
    setSuggestingPrediction(true);
    const loadingToastId = assistantMode
      ? null
      : toast.loading("AI is generating prediction ideas... this can take 2-3 minutes.");
    try {
      const res = await fetch("/api/admin/ai/article-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "predictionSuggestion",
          title: title.trim(),
          html: sourceHtml || sourceExcerpt,
          blocks,
          customPrompt:
            "Provide one best suggestion for either a prediction market or a simple polling vote for this article. Keep options actionable and neutral.",
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as
        | PredictionSuggestionPayload
        | { error?: string };
      if (!res.ok) {
        const message =
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Could not generate suggestion";
        if (loadingToastId) {
          toast.error(message, { id: loadingToastId });
        } else {
          toast.error(message);
        }
        return;
      }
      const suggestion = payload as PredictionSuggestionPayload;
      if (typeof suggestion.title === "string" && suggestion.title.trim()) {
        setPredictionTitle(suggestion.title.trim());
      }
      if (
        typeof suggestion.description === "string" &&
        suggestion.description.trim()
      ) {
        setPredictionBody(suggestion.description.trim());
      }
      if (typeof suggestion.category === "string" && suggestion.category.trim()) {
        setPredictionCategory(
          mapArticleCategoryToPredictionCategory(suggestion.category),
        );
      }
      if (Array.isArray(suggestion.options) && suggestion.options.length > 0) {
        const cleanedOptions = suggestion.options
          .map((option) => option.trim())
          .filter(Boolean);
        const dedupedOptions = [
          ...new Map(cleanedOptions.map((opt) => [opt.toLowerCase(), opt])).values(),
        ];
        if (dedupedOptions.length >= 2) {
          const nextOptions =
            suggestion.suggestionType === "poll" &&
            looksLikeYesNoOptions(dedupedOptions) &&
            isLikelyOpenEndedPrompt(
              (typeof suggestion.title === "string" && suggestion.title.trim()) ||
                predictionTitle,
            )
              ? defaultEngagementOptions()
              : dedupedOptions.slice(0, 6);
          setPredictionDraftOptions(nextOptions);
        }
      }
      setPredictionSuggestionType(
        suggestion.suggestionType === "poll" ||
          suggestion.suggestionType === "prediction"
          ? suggestion.suggestionType
          : "",
      );
      setPredictionSuggestionRationale(
        typeof suggestion.rationale === "string" ? suggestion.rationale.trim() : "",
      );
      if (loadingToastId) {
        toast.success("AI suggestion applied. Review and edit before creating.", {
          id: loadingToastId,
        });
      } else {
        toast.success("AI suggestion applied. Review and edit before creating.");
      }
    } catch {
      if (loadingToastId) {
        toast.error("Could not generate suggestion", { id: loadingToastId });
      } else {
        toast.error("Could not generate suggestion");
      }
    } finally {
      setSuggestingPrediction(false);
    }
  };

  const createPostCard = async () => {
    if (!postImageUrl.trim()) {
      toast.message("Upload a post image first");
      return;
    }
    if (!pendingCreatedSlug.trim()) {
      finishAfterCreate();
      return;
    }
    setSavingPostCard(true);
    try {
      const siteBase = (
        process.env.NEXT_PUBLIC_SITE_URL || "https://www.kindjoe.com"
      ).replace(/\/$/, "");
      const targetSlug = pendingCreatedSlug.trim() || slugify(slug || title);
      if (!targetSlug) {
        throw new Error("Missing article slug");
      }
      const lowerCategory = category.trim().toLowerCase();
      const isVentura =
        lowerCategory.includes("ventura") ||
        tags.some((tag) => tag.toLowerCase().includes("ventura"));
      const destinationUrl = isVentura
        ? `${siteBase}/ventura/${targetSlug}`
        : `${siteBase}/${targetSlug}`;
      const endpoint = isVentura ? "/api/admin/ventura-posts" : "/api/admin/posts";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: postImageUrl,
          destinationUrl,
        }),
      });
      if (!res.ok) throw new Error("Could not create post card");
      toast.success("Post card created");
      finishAfterCreate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create post card",
      );
    } finally {
      setSavingPostCard(false);
    }
  };

  const openManualPostModal = () => {
    const currentArticleId = articleId ?? pendingCreatedArticleId;
    if (!currentArticleId) {
      toast.message("Save the article first.");
      return;
    }
    const currentSlug = slug.trim() || pendingCreatedSlug.trim();
    if (!currentSlug) {
      toast.error("Please set a slug before creating a post card.");
      return;
    }
    setPendingCreatedArticleId(currentArticleId);
    setPendingCreatedSlug(currentSlug);
    setPostPromptContext("manual");
    setShowPostPrompt(true);
  };

  const openManualPredictionModal = () => {
    const currentArticleId = articleId ?? pendingCreatedArticleId;
    if (!currentArticleId) {
      toast.message("Save the article first.");
      return;
    }
    setPendingCreatedArticleId(currentArticleId);
    if (!predictionTitle.trim()) {
      setPredictionTitle(title.trim() ? `Will ${title.trim()}?` : "");
    }
    if (!predictionBody.trim()) {
      setPredictionBody(excerpt.trim() || "How do you think this story will unfold?");
    }
    if (predictionDraftOptions.length < 2) {
      setPredictionDraftOptions(["Yes", "No"]);
    }
    setPredictionCategory(mapArticleCategoryToPredictionCategory(category));
    setPredictionPromptContext("manual");
    setShowPredictionPrompt(true);
  };

  const onUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.url) setCoverImageUrl(String(data.url));
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed — check Cloudinary env");
    } finally {
      setUploading(false);
    }
  };

  const onEditorChange = useCallback(
    ({ json, html }: { json: object; html: string }) => {
      setBlocks(json);
      setContentHtml(html);
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-3 z-20 rounded-xl border border-slate-200/70 bg-white/95 px-4 py-3 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.24)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/articles" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <h1 className="text-sm font-medium tracking-tight text-slate-900">
              {articleId ? "Edit Article" : "New Article"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving || !publishAt}
              onClick={() => save({ schedule: true })}
            >
              Schedule
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => save({})}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => save({ publishNow: true })}
            >
              Publish now
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 xl:col-span-9">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
            <Input
              id="title"
              value={title}
              onChange={(e) => onTitle(e.target.value)}
              placeholder="Untitled article"
              className="h-auto border-none bg-transparent px-0 text-4xl font-bold tracking-tight placeholder:opacity-50 focus-visible:ring-0"
            />

            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={4}
              placeholder="Write a concise excerpt..."
              className="rounded-xl border-slate-200/70 bg-white text-base leading-relaxed"
            />

            <div className="space-y-2">
              <Label className="text-sm font-medium tracking-tight">Main editor</Label>
              <AdminBlockEditor
                initialDoc={blocks}
                initialHtml={contentHtml || undefined}
                onChange={onEditorChange}
                onEditorReady={(ed) => {
                  editorRef.current = ed;
                }}
                className="rounded-xl border-slate-200/70"
              />
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:col-span-4 xl:col-span-3">
          <Card className="gap-0 p-5">
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-xs tracking-tight text-muted-foreground">
                Slug
              </Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-slug"
              />
            </div>
          </Card>

          <Card className="gap-0 p-5">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-xs tracking-tight text-muted-foreground">
                Category
              </Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          </Card>

          <Card className="gap-0 p-5">
            <div className="space-y-2">
              <Label className="text-xs tracking-tight text-muted-foreground">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-200"
                    title="Remove tag"
                  >
                    {tag} ×
                  </button>
                ))}
              </div>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== ",") return;
                  e.preventDefault();
                  addTag(tagInput);
                  setTagInput("");
                }}
                onBlur={() => {
                  if (!tagInput.trim()) return;
                  addTag(tagInput);
                  setTagInput("");
                }}
                placeholder="Type tag and press Enter"
              />
            </div>
          </Card>

          <Card className="gap-0 p-5">
            <div className="space-y-3">
              <Label className="text-xs tracking-tight text-muted-foreground">
                Cover image
              </Label>
              {coverImageUrl ? (
                <img
                  src={coverImageUrl}
                  alt="Cover preview"
                  className="aspect-[16/10] w-full rounded-lg border border-slate-200/60 object-cover"
                />
              ) : null}
              <Input
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
              />
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-indigo-700">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onUploadCover}
                />
                <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 font-medium hover:bg-indigo-100">
                  {uploading ? "Uploading..." : "Upload file"}
                </span>
              </label>
            </div>
          </Card>

          <Card className="gap-0 p-5">
            <div className="space-y-3">
              <Label className="text-xs tracking-tight text-muted-foreground">
                Publishing
              </Label>
              <div className="flex items-center justify-between rounded-lg border border-slate-200/70 px-3 py-2">
                <span className="text-sm text-slate-700">Draft mode</span>
                <Switch checked={isDraft} onCheckedChange={setIsDraft} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pub" className="text-xs tracking-tight text-muted-foreground">
                  Schedule (optional)
                </Label>
                <Input
                  id="pub"
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card className="gap-0 p-5">
            <div className="space-y-3">
              <Label className="text-xs tracking-tight text-muted-foreground">
                Linked prediction
              </Label>
              {!articleId ? (
                <p className="text-xs text-slate-500">
                  Save the article first, then link a prediction from Edit mode.
                </p>
              ) : (
                <>
                  <Input
                    value={predictionSearch}
                    onFocus={() => {
                      void loadPredictions();
                    }}
                    onChange={(e) => setPredictionSearch(e.target.value)}
                    placeholder="Search prediction by title or slug"
                  />
                  {selectedPrediction ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-sm font-medium text-slate-900">
                        {selectedPrediction.title}
                      </p>
                      <p className="text-xs text-slate-600">
                        #{selectedPrediction.id} · {selectedPrediction.slug || "no-slug"} ·{" "}
                        {selectedPrediction.status}
                      </p>
                    </div>
                  ) : predictionId != null ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-600">Linked prediction #{predictionId}</p>
                    </div>
                  ) : null}
                  <div className="max-h-44 space-y-2 overflow-auto rounded-lg border border-slate-200 bg-white p-2">
                    {predictionLoading ? (
                      <p className="px-1 py-1 text-xs text-slate-500">Loading predictions...</p>
                    ) : filteredPredictionOptions.length > 0 ? (
                      filteredPredictionOptions.slice(0, 25).map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setPredictionId(option.id)}
                          className={cn(
                            "block w-full rounded px-2 py-1.5 text-left text-xs transition",
                            predictionId === option.id
                              ? "bg-indigo-50 text-indigo-900"
                              : "text-slate-700 hover:bg-slate-100",
                          )}
                        >
                          <div className="font-medium">{option.title}</div>
                          <div className="text-[11px] text-slate-500">
                            #{option.id} · {option.slug || "no-slug"} · {option.status}
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="px-1 py-1 text-xs text-slate-500">No predictions found.</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPredictionId(null)}
                      disabled={predictionId == null}
                    >
                      Clear link
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void loadPredictions(true)}
                      disabled={predictionLoading}
                    >
                      Refresh list
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card className="gap-0 p-5">
            <div className="space-y-3">
              <Label className="text-xs tracking-tight text-muted-foreground">
                Post & prediction modals
              </Label>
              {!articleId ? (
                <p className="text-xs text-slate-500">
                  Save this article first. Then you can open the post card modal and prediction modal any time.
                </p>
              ) : (
                <>
                  <p className="text-xs text-slate-600">
                    Use these tools directly from the article editor. AI suggestion is available inside the prediction modal.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={openManualPostModal}>
                      Open Post Modal
                    </Button>
                    <Button type="button" variant="outline" onClick={openManualPredictionModal}>
                      Open Prediction Modal
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <Dialog open={showPostPrompt} onOpenChange={setShowPostPrompt}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Post Image</DialogTitle>
            <DialogDescription>
              Upload a tile image for this article post card. Link URL is
              generated automatically from the article slug.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <input
              ref={postImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void uploadPostImageFile(file);
                e.currentTarget.value = "";
              }}
            />

            {postImageUrl ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img
                    src={postImageUrl}
                    alt="Post preview"
                    className="h-[200px] w-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPostImageUrl("")}
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => postImageInputRef.current?.click()}
                  >
                    Change
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => postImageInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!postImageDragging) setPostImageDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setPostImageDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setPostImageDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (!file) return;
                  void uploadPostImageFile(file);
                }}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-8 text-sm transition-colors",
                  postImageDragging
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-300 bg-slate-50 text-slate-600 hover:border-slate-400 hover:bg-slate-100/70",
                )}
              >
                {postImageUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading image...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4" />
                    Drag & drop image, or click to browse
                  </>
                )}
              </button>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={finishAfterCreate}>
              Skip
            </Button>
            <Button
              onClick={createPostCard}
              disabled={savingPostCard || postImageUploading || !postImageUrl}
            >
              {savingPostCard ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Post Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPredictionPrompt} onOpenChange={setShowPredictionPrompt}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Linked Prediction</DialogTitle>
            <DialogDescription>
              Add a prediction for this article now. It will be linked automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-indigo-900">
                Need ideas? Let AI suggest a prediction or poll from this article.
              </p>
              <Button
                type="button"
                variant="outline"
                className="border-indigo-300 bg-white text-indigo-900 hover:bg-indigo-100"
                disabled={suggestingPrediction}
                onClick={() => void suggestPredictionPrompt()}
              >
                {suggestingPrediction ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <WandSparkles className="h-4 w-4" />
                )}
                {suggestingPrediction ? "Suggesting..." : "Suggest with AI"}
              </Button>
            </div>
            {suggestingPrediction && !assistantMode ? (
              <p className="mt-2 text-xs text-indigo-800/80">
                AI help can take up to 2-3 minutes.
              </p>
            ) : null}
            {predictionSuggestionType ? (
              <p className="mt-2 text-xs text-indigo-800">
                Suggested format:{" "}
                <span className="font-semibold capitalize">
                  {predictionSuggestionType}
                </span>
              </p>
            ) : null}
            {predictionSuggestionRationale ? (
              <p className="mt-1 text-xs text-indigo-800/90">
                {predictionSuggestionRationale}
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prediction-title">Prediction title</Label>
              <Input
                id="prediction-title"
                value={predictionTitle}
                onChange={(e) => setPredictionTitle(e.target.value)}
                placeholder="Will this event happen by a specific date?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prediction-description">Description (optional)</Label>
              <Textarea
                id="prediction-description"
                rows={3}
                value={predictionBody}
                onChange={(e) => setPredictionBody(e.target.value)}
                placeholder="Add context and resolution criteria"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Linked to article category:{" "}
                <span className="font-semibold">
                  {PREDICTION_CATEGORY_LABELS[predictionCategory]}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Options</Label>
              {predictionDraftOptions.map((option, idx) => (
                <Input
                  key={idx}
                  value={option}
                  onChange={(e) =>
                    setPredictionDraftOptions((prev) =>
                      prev.map((item, i) => (i === idx ? e.target.value : item)),
                    )
                  }
                  placeholder={`Option ${idx + 1}`}
                />
              ))}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setPredictionDraftOptions((prev) => [
                      ...prev,
                      `Option ${prev.length + 1}`,
                    ])
                  }
                  disabled={predictionDraftOptions.length >= 6}
                >
                  Add option
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setPredictionDraftOptions((prev) =>
                      prev.length > 2 ? prev.slice(0, -1) : prev,
                    )
                  }
                  disabled={predictionDraftOptions.length <= 2}
                >
                  Remove option
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={finishAfterPrediction}>
              Skip
            </Button>
            <Button onClick={submitPredictionPrompt} disabled={savingPrediction}>
              {savingPrediction ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Create & Link Prediction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

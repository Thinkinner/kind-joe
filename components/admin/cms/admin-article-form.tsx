"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  ImagePlus,
  Loader2,
  WandSparkles,
} from "lucide-react";
import { AdminBlockEditor } from "@/components/admin/cms/admin-block-editor";
import { Button } from "@/components/ui/button";
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
import { renderPromptTemplate } from "@/lib/ai/prompt-settings";
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
    seoDescription?: string;
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

type SocialCopyPayload = {
  socialHeadlines?: string[];
  socialTightHeadline?: string;
  socialCaption?: string;
  error?: string;
};

type AdminProfileResponse = {
  aliasFullName?: string | null;
};

type ArticleSeoFields = {
  description?: string | null;
};

type SeoAssistPayload = {
  seoScore?: number;
  seoFeedback?: string;
  suggestions?: string[];
  error?: string;
};

function countWords(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return 0;
  return normalized.split(" ").length;
}

function countWordsFromHtmlText(html: string) {
  if (!html.trim()) return 0;
  const plain = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return countWords(plain);
}

function stripHtmlToText(input: string) {
  return input
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractParagraphTextsFromHtml(html: string) {
  const paragraphMatches = Array.from(html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => stripHtmlToText(match[1] ?? ""))
    .filter(Boolean);

  if (paragraphMatches.length > 0) return paragraphMatches;

  const fallback = stripHtmlToText(html);
  if (!fallback) return [];
  return fallback
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function countParagraphsFromHtml(html: string) {
  if (!html.trim()) return 0;
  const paragraphMatches = html.match(/<p\b[^>]*>/gi) ?? [];
  if (paragraphMatches.length > 0) return paragraphMatches.length;
  const plain = stripHtmlToText(html);
  if (!plain) return 0;
  const fallbackParagraphs = plain
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  return fallbackParagraphs.length || 1;
}

function hasSourceAttributionSignals(html: string) {
  const plain = stripHtmlToText(html).toLowerCase();
  if (!plain) return false;
  const sourcePattern =
    /\b(source|sources|according to|reported by|data from|official statement|court filing|press release)\b/;
  const hasAttributionWords = sourcePattern.test(plain);
  const outboundLinks = (html.match(/https?:\/\//gi) ?? []).length;
  return hasAttributionWords || outboundLinks >= 2;
}

function countAttributionMentions(html: string) {
  const plain = stripHtmlToText(html).toLowerCase();
  if (!plain) return 0;
  const attributionMatches =
    plain.match(
      /\b(according to|reported by|reporting by|said|stated|told|wrote|announced|confirmed|statement from|press release|court filing|senate records|house records|officials said)\b/g,
    ) ?? [];
  const linkedSources = html.match(/<a\b[^>]*href=/gi)?.length ?? 0;
  const rawUrlMentions = html.match(/https?:\/\//gi)?.length ?? 0;
  return attributionMatches.length + linkedSources + rawUrlMentions;
}

function countDirectQuotes(html: string) {
  const plain = stripHtmlToText(html);
  if (!plain) return 0;
  const quoteMatches = plain.match(/["“][^"”]{18,}["”]/g) ?? [];
  return quoteMatches.length;
}

function hasOpposingViewParagraph(html: string) {
  const paragraphs = extractParagraphTextsFromHtml(html);
  return paragraphs.some((paragraph) =>
    /\b(however|critics|opponents|counterargument|on the other hand|in contrast|supporters argue|opponents argue)\b/i.test(
      paragraph,
    ),
  );
}

function hasTemplateLabels(html: string) {
  const plain = stripHtmlToText(html).toLowerCase();
  return /\b(hook|quick recap|your analysis|local\/reader impact|actionable takeaway)\s*:/.test(
    plain,
  );
}

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
  const [seoDescription, setSeoDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [postImageUrl, setPostImageUrl] = useState("");
  const [postImageUploading, setPostImageUploading] = useState(false);
  const [postImageDragging, setPostImageDragging] = useState(false);
  const [showPostPrompt, setShowPostPrompt] = useState(false);
  const [showSocialCopyPrompt, setShowSocialCopyPrompt] = useState(false);
  const [socialCopyLoading, setSocialCopyLoading] = useState(false);
  const [socialHeadlines, setSocialHeadlines] = useState<string[]>([]);
  const [socialTightHeadline, setSocialTightHeadline] = useState("");
  const [socialCaption, setSocialCaption] = useState("");
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
  const [authorAlias, setAuthorAlias] = useState("");
  const [aliasLoading, setAliasLoading] = useState(true);
  const [aliasModalOpen, setAliasModalOpen] = useState(false);
  const [qualityConfirmOpen, setQualityConfirmOpen] = useState(false);
  const [aiPublishReviewOpen, setAiPublishReviewOpen] = useState(false);
  const [aiPublishReviewLoading, setAiPublishReviewLoading] = useState(false);
  const [aiPublishReviewSummary, setAiPublishReviewSummary] = useState("");
  const [aiPublishReviewItems, setAiPublishReviewItems] = useState<string[]>([]);
  const [aiFixSamplesLoading, setAiFixSamplesLoading] = useState(false);
  const [aiFixSamplesSummary, setAiFixSamplesSummary] = useState("");
  const [aiFixSamples, setAiFixSamples] = useState<string[]>([]);
  const [promptSettings, setPromptSettings] = useState<Record<string, string>>({});
  const [pendingPublishOpts, setPendingPublishOpts] = useState<{
    publishNow?: boolean;
    schedule?: boolean;
  } | null>(null);
  const postImageInputRef = useRef<HTMLInputElement | null>(null);
  const appliedInitialRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/profile", { cache: "no-store" });
        if (!res.ok) throw new Error("Could not load author alias.");
        const data = (await res.json()) as AdminProfileResponse;
        if (cancelled) return;
        const alias = (data.aliasFullName ?? "").trim();
        setAuthorAlias(alias);
      } catch {
        if (cancelled) return;
        setAuthorAlias("");
      } finally {
        if (!cancelled) setAliasLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        const seoRaw =
          data.seo && typeof data.seo === "object" && !Array.isArray(data.seo)
            ? (data.seo as ArticleSeoFields)
            : {};
        setSeoDescription((seoRaw.description ?? "").trim());
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
    if (initialValues.seoDescription) setSeoDescription(initialValues.seoDescription);
  }, [articleId, initialValues]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/prompt-settings", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as {
          prompts?: Record<string, string>;
        };
        if (!cancelled && payload.prompts) {
          setPromptSettings(payload.prompts);
        }
      } catch {
        // Keep built-in prompts if settings are unavailable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onTitle = (v: string) => {
    setTitle(v);
    if (!articleId) setSlug(slugify(v));
  };

  const normalizeTag = (raw: string) => {
    const cleaned = raw
      .trim()
      .replace(/^[\s,;.|/\\-]+|[\s,;.|/\\-]+$/g, "")
      .replace(/\s+/g, " ");
    return cleaned.toLowerCase();
  };

  const addTag = (raw: string) => {
    const next = normalizeTag(raw);
    if (!next) return;
    if (tags.includes(next)) return;
    setTags((prev) => [...prev, next]);
  };

  const addTagsFromInput = (raw: string) => {
    const parts = raw
      .split(/[\n,;]+/g)
      .map((part) => normalizeTag(part))
      .filter(Boolean);

    if (parts.length === 0) return;

    setTags((prev) => {
      const seen = new Set(prev);
      const next = [...prev];
      for (const part of parts) {
        if (seen.has(part)) continue;
        seen.add(part);
        next.push(part);
      }
      return next;
    });
  };

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const buildMeta = (opts: { publishNow?: boolean; schedule?: boolean }) => {
    const nextSeo: Record<string, unknown> = {};
    if (seoDescription.trim()) {
      nextSeo.description = seoDescription.trim();
    }
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
      seo: nextSeo,
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
  const aliasMissing = !authorAlias.trim();
  const excerptWordCount = countWords(excerpt);
  const titleWordCount = countWords(title);
  const bodyWordCount = countWordsFromHtmlText(contentHtml);
  const paragraphCount = countParagraphsFromHtml(contentHtml);
  const hasSourceSignals = hasSourceAttributionSignals(contentHtml);
  const attributionMentions = countAttributionMentions(contentHtml);
  const directQuoteCount = countDirectQuotes(contentHtml);
  const hasCounterView = hasOpposingViewParagraph(contentHtml);
  const hasTemplateOutput = hasTemplateLabels(contentHtml);
  const metaCharCount = seoDescription.trim().length;
  const qualityChecks = [
    {
      id: "title",
      label: "Headline has enough detail",
      pass: titleWordCount >= 7,
      weight: 10,
    },
    {
      id: "excerpt",
      label: "Summary is substantial",
      pass: excerptWordCount >= 20,
      weight: 10,
    },
    {
      id: "body",
      label: "Body depth meets AdSense baseline (600+ words)",
      pass: bodyWordCount >= 600,
      weight: 30,
    },
    {
      id: "structure",
      label: "Body uses readable paragraph structure",
      pass: paragraphCount >= 8,
      weight: 10,
    },
    {
      id: "sources",
      label: "Sources or attribution signals are present",
      pass: hasSourceSignals && attributionMentions >= 3,
      weight: 15,
    },
    {
      id: "quotes",
      label: "Includes at least 2 direct quotes",
      pass: directQuoteCount >= 2,
      weight: 10,
    },
    {
      id: "balance",
      label: "Includes opposing/counter-view context",
      pass: hasCounterView,
      weight: 10,
    },
    {
      id: "meta",
      label: "Meta description is publish-ready (110-160 chars)",
      pass: metaCharCount >= 110 && metaCharCount <= 160,
      weight: 10,
    },
    {
      id: "tags",
      label: "Tags added for discoverability",
      pass: tags.length >= 4,
      weight: 5,
    },
  ] as const;
  const qualityScore = qualityChecks.reduce(
    (total, check) => total + (check.pass ? check.weight : 0),
    0,
  );
  const qualityIssues = qualityChecks
    .filter((check) => !check.pass)
    .map((check) => check.label);
  const qualityTier =
    qualityScore >= 90
      ? "AdSense Ready"
      : qualityScore >= 75
        ? "Almost Ready"
        : "Needs Revision";
  const shouldWarnBeforePublish = qualityScore < 85;
  const failsWordGate = bodyWordCount < 600;
  const failsQuoteGate = directQuoteCount < 2;
  const failsAttributionGate = attributionMentions < 3;
  const failsBalanceGate = !hasCounterView;
  const failsTemplateGate = hasTemplateOutput;
  const hasStrictPublishBlocker =
    failsWordGate ||
    failsQuoteGate ||
    failsAttributionGate ||
    failsBalanceGate ||
    failsTemplateGate;
  const strictPublishIssues: string[] = [];
  const strictPublishGuides: Array<{ issue: string; fix: string }> = [];
  if (failsWordGate) {
    strictPublishIssues.push("Body has fewer than 600 words");
    strictPublishGuides.push({
      issue: "Body depth is below 600 words",
      fix: `Add at least ${600 - bodyWordCount} more words. Best place: add a short 'what happens next' section (2-3 paragraphs) with concrete timeline and outcomes.`,
    });
  }
  if (failsQuoteGate) {
    strictPublishIssues.push("Fewer than 2 direct quotes");
    strictPublishGuides.push({
      issue: "Not enough direct quotes",
      fix: `Add ${2 - directQuoteCount} more quote(s) from named sources. Format example: "..." [Name] said [where/when].`,
    });
  }
  if (failsAttributionGate) {
    strictPublishIssues.push("Fewer than 3 in-body attributions");
    strictPublishGuides.push({
      issue: "Not enough in-body attributions",
      fix: `Add ${3 - attributionMentions} more attribution line(s) inside the body, e.g. 'According to Reuters...' or 'Per Senate records...'.`,
    });
  }
  if (failsBalanceGate) {
    strictPublishIssues.push("Missing opposing-view paragraph");
    strictPublishGuides.push({
      issue: "Opposing-view context is missing",
      fix: "Add one paragraph with the other side's framing, or include a no-response line (e.g. 'X office did not immediately respond').",
    });
  }
  if (failsTemplateGate) {
    strictPublishIssues.push("Template labels detected (Hook/Quick recap/etc.)");
    strictPublishGuides.push({
      issue: "Template labels are still present",
      fix: "Rewrite labels like 'Hook:' and 'Quick recap:' into natural prose paragraphs so the article reads like a real newsroom draft.",
    });
  }

  useEffect(() => {
    if (aliasLoading) return;
    setAliasModalOpen(aliasMissing);
  }, [aliasLoading, aliasMissing]);

  const copySocialText = async (value: string) => {
    const text = value.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const prepareSocialCopyPrompt = async () => {
    const sourceExcerpt = excerpt.trim();
    const sourceHtml = contentHtml?.trim() || "";
    const sourceTitle = title.trim();
    if (!sourceTitle && !sourceExcerpt && !sourceHtml) {
      setShowPostPrompt(true);
      return;
    }

    setSocialCopyLoading(true);
    setSocialHeadlines([]);
    setSocialTightHeadline("");
    setSocialCaption("");
    try {
      const res = await fetch("/api/admin/ai/article-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "socialCopy",
          title: sourceTitle,
          html: [sourceExcerpt, sourceHtml].filter(Boolean).join("\n\n").slice(0, 2600),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as SocialCopyPayload;
      if (!res.ok) {
        toast.error(payload.error ?? "Could not generate social copy");
        setShowPostPrompt(true);
        return;
      }

      const nextHeadlines = Array.isArray(payload.socialHeadlines)
        ? payload.socialHeadlines
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 5)
        : [];
      const tight = String(payload.socialTightHeadline ?? "").trim();
      const caption = String(payload.socialCaption ?? "").trim();

      if (!nextHeadlines.length && !tight && !caption) {
        toast.error("Social copy came back empty");
        setShowPostPrompt(true);
        return;
      }

      setSocialHeadlines(nextHeadlines);
      setSocialTightHeadline(tight);
      setSocialCaption(caption);
      setShowSocialCopyPrompt(true);
    } catch {
      toast.error("Could not generate social copy");
      setShowPostPrompt(true);
    } finally {
      setSocialCopyLoading(false);
    }
  };

  const save = async (opts: { publishNow?: boolean; schedule?: boolean }) => {
    if (aliasMissing) {
      toast.error(
        "Set your author alias in Security before creating or publishing articles.",
      );
      return;
    }
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
      if (assistantMode) {
        await prepareSocialCopyPrompt();
      } else {
        setShowPostPrompt(true);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const requestSave = (opts: { publishNow?: boolean; schedule?: boolean }) => {
    void requestSaveWithReview(opts);
  };

  const runAiPrePublishReview = async () => {
    const sourceTitle = title.trim();
    const sourceText = [excerpt.trim(), contentHtml.trim()]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 3600);
    if (!sourceTitle && !sourceText) {
      return null;
    }

    setAiPublishReviewLoading(true);
    try {
      const res = await fetch("/api/admin/ai/article-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "seo",
          title: sourceTitle,
          html: sourceText,
          customPrompt:
            promptSettings.articlePrePublishRiskCustomPrompt ||
            "You are a strict pre-publish newsroom risk editor.\nReview the draft using this checklist:\n1) Verify risky factual claim: flag any superlative or potentially inaccurate/ambiguous claim unless exact date/source is cited.\n2) Tone/word choice risk: charged phrases must be clearly attributed and neutrally framed.\n3) Source precision: flag vague attribution like 'reports say' without specific outlet/document/transcript.\n4) Balance line for fairness: require one sentence with opposing framing or note no-response context.\n5) End stronger: require concrete what-happens-next timing and outcome scenarios.\nReturn only high-impact issues.\nIf there are no high-impact issues, set seoFeedback EXACTLY to 'No high-risk pre-publish issues found.' and suggestions to an empty array.\nIf issues exist, seoFeedback should be one short sentence and suggestions should be 3-6 concise fix actions.",
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as SeoAssistPayload;
      if (!res.ok) {
        throw new Error(payload.error ?? "Could not run AI pre-publish review");
      }

      const summary = String(payload.seoFeedback ?? "").trim();
      const items = Array.isArray(payload.suggestions)
        ? payload.suggestions
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 8)
        : [];
      const cleanSummary =
        summary || (items.length > 0 ? "High-impact issues found before publish." : "");

      if (
        cleanSummary === "No high-risk pre-publish issues found." &&
        items.length === 0
      ) {
        return null;
      }

      return { summary: cleanSummary, items };
    } finally {
      setAiPublishReviewLoading(false);
    }
  };

  const generateAiFixSamples = async () => {
    const missingItems: string[] = [];
    if (failsWordGate) missingItems.push("600+ body words");
    if (failsQuoteGate) missingItems.push("2+ direct quotes");
    if (failsAttributionGate) missingItems.push("3+ in-body attributions");
    if (failsBalanceGate) missingItems.push("opposing-view paragraph");
    if (failsTemplateGate) missingItems.push("remove template labels");
    if (missingItems.length === 0) {
      setAiFixSamplesSummary("");
      setAiFixSamples([]);
      return;
    }

    const sourceTitle = title.trim();
    const sourceText = [excerpt.trim(), contentHtml.trim()]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 3600);
    if (!sourceTitle && !sourceText) return;

    setAiFixSamplesLoading(true);
    try {
      const fixPromptTemplate =
        promptSettings.articleFixSamplesCustomPrompt ||
        "Generate realistic, ready-to-paste fix examples for the missing publish requirements.\nMissing requirements: {{missingItems}}.\nReturn JSON with seoFeedback and suggestions.\nseoFeedback: one short sentence summary.\nsuggestions: 3-6 concrete examples the writer can paste or adapt immediately.\nInclude a sample direct quote format when quote requirement is missing.\nInclude a sample attribution sentence when attribution requirement is missing.\nInclude one sample opposing-view sentence when balance requirement is missing.\nKeep suggestions practical and specific to political/news writing tone.";
      const res = await fetch("/api/admin/ai/article-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "seo",
          title: sourceTitle,
          html: sourceText,
          customPrompt: renderPromptTemplate(fixPromptTemplate, {
            missingItems: missingItems.join(", "),
          }),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as SeoAssistPayload;
      if (!res.ok) {
        throw new Error(payload.error ?? "Could not generate AI fix samples");
      }

      const summary = String(payload.seoFeedback ?? "").trim();
      const items = Array.isArray(payload.suggestions)
        ? payload.suggestions
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 8)
        : [];
      setAiFixSamplesSummary(summary);
      setAiFixSamples(items);
    } catch {
      setAiFixSamplesSummary("");
      setAiFixSamples([]);
    } finally {
      setAiFixSamplesLoading(false);
    }
  };

  const continuePublishWithQualityChecks = (
    opts: { publishNow?: boolean; schedule?: boolean },
  ) => {
    const isPublishAction = Boolean(opts.publishNow || opts.schedule);
    if (!isPublishAction) {
      void save(opts);
      return;
    }

    if (hasStrictPublishBlocker || shouldWarnBeforePublish) {
      setPendingPublishOpts(opts);
      setQualityConfirmOpen(true);
      if (hasStrictPublishBlocker) {
        void generateAiFixSamples();
      } else {
        setAiFixSamplesSummary("");
        setAiFixSamples([]);
      }
      return;
    }

    if (!shouldWarnBeforePublish) {
      void save(opts);
      return;
    }
  };

  const requestSaveWithReview = async (opts: {
    publishNow?: boolean;
    schedule?: boolean;
  }) => {
    if (aliasMissing) {
      setAliasModalOpen(true);
      toast.error(
        "Set your author alias in Security before creating or publishing articles.",
      );
      return;
    }
    const isPublishAction = Boolean(opts.publishNow || opts.schedule);
    if (!isPublishAction) {
      continuePublishWithQualityChecks(opts);
      return;
    }
    try {
      const review = await runAiPrePublishReview();
      if (review) {
        setAiPublishReviewSummary(review.summary);
        setAiPublishReviewItems(review.items);
        setPendingPublishOpts(opts);
        setAiPublishReviewOpen(true);
        return;
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "AI pre-publish review failed",
      );
    }
    continuePublishWithQualityChecks(opts);
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
          html: (sourceHtml || sourceExcerpt).slice(0, 2200),
          customPrompt:
            promptSettings.articlePredictionSuggestionCustomPrompt ||
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="fixed left-0 right-0 top-11 z-50 border-y border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6 lg:left-52 lg:top-0 lg:px-8 xl:left-56 xl:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/articles" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <h1 className="text-sm font-medium tracking-tight text-foreground">
              {articleId ? "Edit Article" : "New Article"}
            </h1>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                qualityScore >= 85
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : qualityScore >= 70
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-rose-300 bg-rose-50 text-rose-700",
              )}
            >
              Quality {qualityScore}/100
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={
                saving ||
                !publishAt ||
                aliasLoading
              }
              onClick={() => requestSave({ schedule: true })}
            >
              Schedule
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving || aliasLoading}
              onClick={() => save({})}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
            <Button
              type="button"
              disabled={saving || aliasLoading}
              onClick={() => requestSave({ publishNow: true })}
            >
              Publish now
            </Button>
          </div>
        </div>
      </div>
      <div className="h-[62px] lg:h-[64px]" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 xl:col-span-9">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
            <div className="space-y-2">
              <Label
                htmlFor="title"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Article title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => onTitle(e.target.value)}
                placeholder="Enter article title..."
                className="h-auto rounded-lg border border-border bg-background px-4 py-4 text-4xl font-bold tracking-tight placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              />
            </div>

            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={4}
              placeholder="Write a concise excerpt..."
              className="rounded-none border-border bg-card text-base leading-relaxed"
            />

            <div className="space-y-2">
              <Label className="text-sm font-semibold tracking-tight text-foreground">
                Main editor
              </Label>
              <AdminBlockEditor
                initialDoc={blocks}
                initialHtml={contentHtml || undefined}
                onChange={onEditorChange}
                onEditorReady={(ed) => {
                  editorRef.current = ed;
                }}
                className="rounded-none border-border"
              />
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:col-span-4 lg:sticky lg:top-20 lg:self-start xl:col-span-3">
          <div className="border-t border-border pt-5">
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
          </div>

          <div className="border-t border-border pt-5">
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
          </div>

          <div className="border-t border-border pt-5">
            <div className="space-y-2">
              <Label className="text-xs tracking-tight text-muted-foreground">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-foreground hover:bg-muted/80"
                    title="Remove tag"
                  >
                    {tag} ×
                  </button>
                ))}
              </div>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text");
                  if (!pasted.trim()) return;
                  e.preventDefault();
                  addTagsFromInput(pasted);
                  setTagInput("");
                }}
                onKeyDown={(e) => {
                  if (
                    e.key !== "Enter" &&
                    e.key !== "," &&
                    e.key !== "Tab"
                  ) {
                    return;
                  }
                  e.preventDefault();
                  addTagsFromInput(tagInput);
                  setTagInput("");
                }}
                onBlur={() => {
                  if (!tagInput.trim()) return;
                  addTagsFromInput(tagInput);
                  setTagInput("");
                }}
                placeholder="Paste tags or type and press Enter"
              />
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <div className="space-y-3">
              <Label className="text-xs tracking-tight text-muted-foreground">
                Cover image
              </Label>
              {coverImageUrl ? (
                <img
                  src={coverImageUrl}
                  alt="Cover preview"
                  className="aspect-[16/10] w-full rounded-lg border border-border object-cover"
                />
              ) : null}
              <Input
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
              />
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onUploadCover}
                />
                <span className="inline-flex min-w-[120px] items-center justify-center border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                  {uploading ? "Uploading..." : "Upload image"}
                </span>
              </label>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <div className="space-y-3">
              <Label className="text-xs tracking-tight text-muted-foreground">
                Publishing
              </Label>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-sm text-foreground">Draft mode</span>
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
          </div>

          <div className="border-t border-border pt-5">
            <div className="space-y-3">
              <Label htmlFor="meta-description" className="text-xs tracking-tight text-muted-foreground">
                Meta description
              </Label>
              <Textarea
                id="meta-description"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={3}
                placeholder="Write a unique search description in your own voice (110-160 chars)."
              />
              <p className="text-[11px] text-muted-foreground">
                {seoDescription.trim().length} chars - target range: 110-160 for best quality score.
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <p>
                Quality score:{" "}
                <span className="font-semibold text-foreground">{qualityScore}/100</span>{" "}
                ({qualityTier})
              </p>
              <p>Body words: {bodyWordCount}</p>
              <p>Paragraphs: {paragraphCount}</p>
              <p>Summary words: {excerptWordCount}</p>
              <p>Source signals: {hasSourceSignals ? "Detected" : "Missing"}</p>
              <p>Attributions: {attributionMentions}</p>
              <p>Direct quotes: {directQuoteCount}</p>
              <p>Opposing view: {hasCounterView ? "Included" : "Missing"}</p>
              <p>Template labels: {hasTemplateOutput ? "Detected" : "Clean"}</p>
              <p>
                Publish/schedule requires: 600+ words, 2+ quotes, 3+ attributions, opposing view, and no template labels.
              </p>
              {failsWordGate ? (
                <p className="text-rose-600">
                  Publish gate: add at least {600 - bodyWordCount} more body words.
                </p>
              ) : null}
              {failsQuoteGate ? (
                <p className="text-rose-600">
                  Publish gate: add at least {2 - directQuoteCount} more direct quote(s).
                </p>
              ) : null}
              {failsAttributionGate ? (
                <p className="text-rose-600">
                  Publish gate: add at least {3 - attributionMentions} more in-body attribution(s).
                </p>
              ) : null}
              {failsBalanceGate ? (
                <p className="text-rose-600">
                  Publish gate: include one paragraph that presents an opposing or skeptical view.
                </p>
              ) : null}
              {failsTemplateGate ? (
                <p className="text-rose-600">
                  Publish gate: remove template labels like Hook/Quick recap/Your analysis.
                </p>
              ) : null}
              {qualityIssues.length > 0 ? (
                <p className="text-amber-600">Improve: {qualityIssues.join(" • ")}</p>
              ) : null}
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <div className="space-y-3">
              <Label className="text-xs tracking-tight text-muted-foreground">
                Linked prediction
              </Label>
              {!articleId ? (
                <p className="text-xs text-muted-foreground">
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
                    <div className="rounded-lg border border-border bg-muted px-3 py-2">
                      <p className="text-sm font-medium text-foreground">
                        {selectedPrediction.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        #{selectedPrediction.id} · {selectedPrediction.slug || "no-slug"} ·{" "}
                        {selectedPrediction.status}
                      </p>
                    </div>
                  ) : predictionId != null ? (
                    <div className="rounded-lg border border-border bg-muted px-3 py-2">
                      <p className="text-xs text-muted-foreground">Linked prediction #{predictionId}</p>
                    </div>
                  ) : null}
                  <div className="max-h-44 space-y-2 overflow-auto rounded-lg border border-border bg-card p-2">
                    {predictionLoading ? (
                      <p className="px-1 py-1 text-xs text-muted-foreground">Loading predictions...</p>
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
                              : "text-foreground hover:bg-muted",
                          )}
                        >
                          <div className="font-medium">{option.title}</div>
                          <div className="text-[11px] text-muted-foreground">
                            #{option.id} · {option.slug || "no-slug"} · {option.status}
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="px-1 py-1 text-xs text-muted-foreground">No predictions found.</p>
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
          </div>

          <div className="border-t border-border pt-5">
            <div className="space-y-3">
              <Label className="text-xs tracking-tight text-muted-foreground">
                Post & prediction modals
              </Label>
              {!articleId ? (
                <p className="text-xs text-muted-foreground">
                  Save this article first. Then you can open the post card modal and prediction modal any time.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
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
          </div>
        </aside>
      </div>

      <Dialog
        open={showSocialCopyPrompt}
        onOpenChange={(open) => {
          if (open) {
            setShowSocialCopyPrompt(true);
            return;
          }
          if (socialCopyLoading) return;
          setShowSocialCopyPrompt(false);
          setShowPostPrompt(true);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Carousel Headlines & Caption</DialogTitle>
            <DialogDescription>
              Review and copy these generated lines before creating the post card.
            </DialogDescription>
          </DialogHeader>

          {socialCopyLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating headlines and caption...
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">5 headline options</Label>
                {socialHeadlines.length ? (
                  <div className="space-y-2">
                    {socialHeadlines.map((line, idx) => (
                      <div
                        key={`${line}-${idx}`}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2"
                      >
                        <p className="text-sm text-foreground">{line}</p>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          aria-label={`Copy headline ${idx + 1}`}
                          onClick={() => void copySocialText(line)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No headline options generated.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Tight headline</Label>
                {socialTightHeadline ? (
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2">
                    <p className="text-sm text-foreground">{socialTightHeadline}</p>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      aria-label="Copy tight headline"
                      onClick={() => void copySocialText(socialTightHeadline)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tight headline generated.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Caption</Label>
                {socialCaption ? (
                  <div className="space-y-2">
                    <Textarea readOnly rows={6} value={socialCaption} className="bg-muted" />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void copySocialText(socialCaption)}
                      >
                        <Copy className="h-4 w-4" />
                        Copy caption
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No caption generated.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowSocialCopyPrompt(false);
                setShowPostPrompt(true);
              }}
            >
              Continue to post modal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showPostPrompt}
        onOpenChange={(open) => {
          if (open) {
            setShowPostPrompt(true);
            return;
          }
          if (savingPostCard || postImageUploading) return;
          if (postPromptContext === "createFlow") {
            finishAfterCreate();
            return;
          }
          setShowPostPrompt(false);
        }}
      >
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
                <div className="overflow-hidden rounded-xl border border-border bg-muted">
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
                    : "border-border bg-muted text-muted-foreground hover:border-border hover:bg-muted/80",
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
                className="border-indigo-300 bg-card text-indigo-900 hover:bg-indigo-100"
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
              <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">
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

      <Dialog open={aliasModalOpen} onOpenChange={setAliasModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Set author alias first
            </DialogTitle>
            <DialogDescription>
              Creating and publishing is blocked until you set your profile alias.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAliasModalOpen(false)}>
              Continue editing
            </Button>
            <Button type="button" asChild>
              <Link href="/admin/security">Go to profile settings</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qualityConfirmOpen} onOpenChange={setQualityConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {hasStrictPublishBlocker
                ? "Publish with unmet requirements?"
                : "Publish with low quality score?"}
            </DialogTitle>
            <DialogDescription>
              {hasStrictPublishBlocker
                ? `This draft still misses required checks. You can continue anyway, but please confirm before sending.`
                : `This article is currently scored at ${qualityScore}/100. You can still continue, but consider improving the flagged items first.`}
            </DialogDescription>
          </DialogHeader>
          {strictPublishIssues.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-rose-600">
              {strictPublishIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
          {strictPublishGuides.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted px-3 py-3">
              <p className="text-sm font-medium text-foreground">
                How to fix quickly
              </p>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {strictPublishGuides.map((guide) => (
                  <li key={guide.issue}>
                    <span className="font-medium text-foreground">{guide.issue}:</span>{" "}
                    {guide.fix}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {qualityIssues.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {qualityIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
          {hasStrictPublishBlocker ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted px-3 py-3">
              <p className="text-sm font-medium text-foreground">
                AI sample fixes (realistic examples)
              </p>
              {aiFixSamplesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating examples...
                </div>
              ) : (
                <>
                  {aiFixSamplesSummary ? (
                    <p className="text-sm text-muted-foreground">{aiFixSamplesSummary}</p>
                  ) : null}
                  {aiFixSamples.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {aiFixSamples.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No AI examples generated yet. You can still continue or fix manually.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingPublishOpts(null);
                setQualityConfirmOpen(false);
                setAiFixSamplesSummary("");
                setAiFixSamples([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const opts = pendingPublishOpts;
                setPendingPublishOpts(null);
                setQualityConfirmOpen(false);
                setAiFixSamplesSummary("");
                setAiFixSamples([]);
                if (opts) {
                  void save(opts);
                }
              }}
            >
              Yes, continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={aiPublishReviewOpen}
        onOpenChange={(open) => {
          setAiPublishReviewOpen(open);
          if (!open) {
            setPendingPublishOpts(null);
            setAiPublishReviewSummary("");
            setAiPublishReviewItems([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>AI Pre-Publish Review</DialogTitle>
            <DialogDescription>
              A final AI risk scan ran before publish. Review these fixes first.
            </DialogDescription>
          </DialogHeader>
          {aiPublishReviewLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Running pre-publish analysis...
            </div>
          ) : (
            <div className="space-y-3">
              {aiPublishReviewSummary ? (
                <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">
                  {aiPublishReviewSummary}
                </p>
              ) : null}
              {aiPublishReviewItems.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {aiPublishReviewItems.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAiPublishReviewOpen(false);
                setPendingPublishOpts(null);
              }}
            >
              Fix now
            </Button>
            <Button
              type="button"
              onClick={() => {
                const opts = pendingPublishOpts;
                setAiPublishReviewOpen(false);
                setAiPublishReviewSummary("");
                setAiPublishReviewItems([]);
                setPendingPublishOpts(null);
                if (opts) {
                  continuePublishWithQualityChecks(opts);
                }
              }}
            >
              Continue anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

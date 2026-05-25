"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Loader2,
  UploadCloud,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Save,
  Send,
  Eye,
  Edit3,
  Copy,
  ExternalLink, // <-- Add this
  Link as LinkIcon, // <-- Add this
  GripVertical, // <-- Add this
  Trash2, // <-- Add this
  Plus, // <-- Add this
  Sparkles,
} from "lucide-react";

// --- SERVICES & TYPES ---
import {
  processNewsletterImages,
  uploadBase64ImageToCloudinary,
  uploadImage,
} from "@/lib/(newsletter-automations)/cloudinary-service";
import {
  NewsletterDraft,
  NewsletterData,
  NewsletterStory,
  DbArticle,
  WebhookPayload,
} from "@/lib/(newsletter-automations)/types";
import {
  buildNewsletterPreviewUrl,
  normalizeSiteBase,
  normalizeStorySlug,
} from "@/lib/(newsletter-automations)/newsletter-links";
import { marked } from "marked";
import { normalizeArticleMarkdown } from "@/lib/content/normalize-article-markdown";
import NewsletterPreview from "./newsletter-preview";
import {
  saveDraft,
  getSettings,
  publishNewsletterToArticles,
  deleteDraft,
  clearDraftArticlesForRegeneration,
  getPublishedArticlesForDraft,
  deletePublishedNewsletterArticle,
} from "@/lib/(newsletter-automations)/storage-services";
import { sendToWebhook } from "@/lib/(newsletter-automations)/web-hook-services";
import {
  generateFullArticleContent,
  suggestNewsletterEmailSubject,
} from "@/lib/(newsletter-automations)/gemini-service";
import { AdminBlockEditor } from "@/components/admin/cms/admin-block-editor";
import { deriveNewsletterLeadFromStories } from "@/lib/(newsletter-automations)/newsletter-lead";
import { generateEmailHtml } from "@/lib/(newsletter-automations)/email-template-service";
import {
  formatGenerationError,
  formatGenerationErrorMessage,
  type FormattedGenerationError,
  type GenerationErrorContext,
} from "@/lib/(newsletter-automations)/generation-errors";
import ArticleSelectionModal from "./article-selection-modal";

/** Keep manual lead text when set; otherwise auto-fill from story summaries. */
function introAfterStoriesChange(
  prevIntro: string | undefined,
  newStories: NewsletterStory[],
): string {
  if ((prevIntro || "").trim().length > 0) return prevIntro ?? "";
  return deriveNewsletterLeadFromStories(newStories) || "";
}

const createSlug = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove non-word chars
    .replace(/[\s_-]+/g, "-") // Replace spaces with dashes
    .replace(/^-+|-+$/g, ""); // Trim start/end dashes
};

function buildNewsletterDataWithFinalSlugs(
  newsletterData: NewsletterData,
  draftArticles: DbArticle[],
): NewsletterData {
  const stories = (newsletterData.stories || []).map((story, idx) => {
    const article = draftArticles[idx];
    const slugFromArticleTitle = createSlug(article?.title || "");
    const manualSlug = normalizeStorySlug(story.slug);
    const fallbackSlug = createSlug(story.headline || "");
    // Manual slug should win so copied email links match what editors set.
    const finalSlug = manualSlug || slugFromArticleTitle || fallbackSlug;
    return { ...story, slug: finalSlug };
  });

  return {
    ...newsletterData,
    stories,
    intro:
      (newsletterData.intro || "").trim() ||
      deriveNewsletterLeadFromStories(stories) ||
      "",
  };
}

/** Overview edit fields: neutral surface (theme `input` is blue-tinted). */
const OVERVIEW_FIELD_CLASS =
  "border border-neutral-200 bg-white text-sm text-neutral-900 outline-none transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500/25 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-orange-500";

const OVERVIEW_TEXTAREA_SCROLLBAR =
  "scrollbar-thin scrollbar-track-neutral-100 scrollbar-thumb-neutral-300 dark:scrollbar-track-neutral-800 dark:scrollbar-thumb-neutral-600 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-track]:bg-neutral-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-neutral-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600";

interface ReviewEditorProps {
  draft: NewsletterDraft;
  onBack: () => void;
  onUpdate: () => void;
}

type TabMode = "overview" | number;
type PublishedDraftArticle = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  updatedAt: string;
  duplicateCount: number;
  isDuplicate: boolean;
};

const ReviewEditor: React.FC<ReviewEditorProps> = ({
  draft,
  onBack,
  onUpdate,
}) => {
  // --- STATE ---
  // Initialize with defaults to prevent uncontrolled input errors
  const [data, setData] = useState<NewsletterData>(() => {
    const d = draft.data || {
      title: "",
      intro: "",
      stories: [],
      signOff: "",
    };
    const intro =
      (d.intro || "").trim() ||
      deriveNewsletterLeadFromStories(d.stories) ||
      "";
    return { ...d, intro };
  });
  const [articles, setArticles] = useState<DbArticle[]>(draft.articles || []);
  const [activeTab, setActiveTab] = useState<TabMode>("overview");

  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [generationError, setGenerationError] =
    useState<FormattedGenerationError | null>(null);

  const reportGenerationError = (
    error: unknown,
    context: GenerationErrorContext = {},
  ) => {
    setGenerationError(formatGenerationError(error, context));
    setErrorMsg(formatGenerationErrorMessage(error, context));
    setSuccessMsg("");
  };

  const clearGenerationError = () => {
    setGenerationError(null);
    setErrorMsg("");
  };
  const [successMsg, setSuccessMsg] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [suggestingSubject, setSuggestingSubject] = useState(false);
  const [draftStatus, setDraftStatus] = useState<NewsletterDraft["status"]>(
    draft.status,
  );
  const [isAlreadyPublished, setIsAlreadyPublished] = useState(
    draft.status === "sent",
  );
  const [publishedArticles, setPublishedArticles] = useState<PublishedDraftArticle[]>(
    [],
  );
  const [loadingPublishedArticles, setLoadingPublishedArticles] = useState(false);

  const handleSuggestEmailSubject = async () => {
    try {
      setSuggestingSubject(true);
      setErrorMsg("");
      const subject = await suggestNewsletterEmailSubject(data.stories[0]);
      setData((prev) => ({ ...prev, title: subject }));
      setSuccessMsg("Subject line updated from Story 1.");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (e: unknown) {
      setErrorMsg(
        e instanceof Error ? e.message : "Could not suggest subject line.",
      );
    } finally {
      setSuggestingSubject(false);
    }
  };

  const handleRegenerateDailyBriefLead = () => {
    const regeneratedLead = deriveNewsletterLeadFromStories(data.stories);
    if (!regeneratedLead) {
      setErrorMsg(
        "Could not regenerate Daily brief lead. Add or improve story summaries first.",
      );
      return;
    }
    setErrorMsg("");
    setData((prev) => ({ ...prev, intro: regeneratedLead }));
    setSuccessMsg("Daily brief lead regenerated from current story summaries.");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const loadPublishedArticles = async () => {
    setLoadingPublishedArticles(true);
    try {
      const rows = await getPublishedArticlesForDraft(draft.id);
      setPublishedArticles(Array.isArray(rows) ? (rows as PublishedDraftArticle[]) : []);
    } finally {
      setLoadingPublishedArticles(false);
    }
  };

  useEffect(() => {
    void loadPublishedArticles();
  }, [draft.id]);

  useEffect(() => {
    // Wait 1.5 seconds after the user stops typing/changing things before saving
    const timer = setTimeout(async () => {
      setIsAutoSaving(true);

      const updatedDraft: NewsletterDraft = {
        ...draft,
        status: draftStatus,
        data: data,
        articles: articles,
      };

      try {
        await saveDraft(updatedDraft);

        // Format the time (e.g., "10:45 AM")
        const now = new Date();
        setLastSavedTime(
          now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        );
      } catch (err) {
        console.error("Auto-save failed:", err);
      } finally {
        setIsAutoSaving(false);
      }
    }, 1500);

    // Cleanup the timer if the user types again before 1.5 seconds is up
    return () => clearTimeout(timer);
  }, [data, articles, draft, draftStatus]); // Listen for changes to draft payload

  // One-time migration: swap non-Cloudinary image URLs to Cloudinary URLs when possible.
  useEffect(() => {
    if (didCloudinarySyncRef.current) return;
    didCloudinarySyncRef.current = true;

    const sourceStories = draft.data?.stories || [];
    const hasNonCloudinaryImages = sourceStories.some(
      (story) =>
        Boolean(story.imageUrl?.trim()) &&
        !story.imageUrl.includes("res.cloudinary.com"),
    );
    if (!hasNonCloudinaryImages) return;

    let cancelled = false;
    (async () => {
      try {
        const hydrated = await processNewsletterImages(draft.data);
        if (cancelled) return;

        const changed = hydrated.stories.some(
          (story, idx) => story.imageUrl !== sourceStories[idx]?.imageUrl,
        );
        if (!changed) return;

        setData({
          ...hydrated,
          intro: introAfterStoriesChange(hydrated.intro, hydrated.stories),
        });
        setArticles((prev) =>
          prev.map((article, idx) =>
            article
              ? { ...article, coverImageUrl: hydrated.stories[idx]?.imageUrl || null }
              : article,
          ),
        );
      } catch (err) {
        console.error("Cloudinary image sync failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draft]);

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    dropIndex: number,
  ) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    // 1. Reorder Stories
    const newStories = [...data.stories];
    const [draggedStory] = newStories.splice(draggedIndex, 1);
    newStories.splice(dropIndex, 0, draggedStory);

    // 2. Reorder Articles (CRITICAL so the generated HTML follows the story)
    const newArticles = [...articles];
    const [draggedArticle] = newArticles.splice(draggedIndex, 1);
    newArticles.splice(dropIndex, 0, draggedArticle);

    setData({
      ...data,
      stories: newStories,
      intro: introAfterStoriesChange(data.intro, newStories),
    });
    setArticles(newArticles);
    setDraggedIndex(null);
  };

  const handleAddStory = () => {
    const newIndex = data.stories.length + 1;
    const newStory: NewsletterStory = {
      slotName: `Slot ${newIndex}`,
      headline: "",
      summary: "",
      imageUrl: "",
      sourceUrl: "",
      sourceName: "Custom Addition",
      category: "General",
    };

    const nextStories = [...data.stories, newStory];
    setData({
      ...data,
      stories: nextStories,
      intro: introAfterStoriesChange(data.intro, nextStories),
    });
    // Append a placeholder for the article so the indices match perfectly
    setArticles([...articles, undefined as any]);
  };

  const handleDeleteStory = (index: number) => {
    if (window.confirm("Are you sure you want to delete this story?")) {
      const newStories = [...data.stories];
      newStories.splice(index, 1);

      const newArticles = [...articles];
      newArticles.splice(index, 1);

      setData({
        ...data,
        stories: newStories,
        intro: introAfterStoriesChange(data.intro, newStories),
      });
      setArticles(newArticles);

      // Safety reset if they delete the tab they are currently viewing
      if (activeTab === index) setActiveTab("overview");
    }
  };

  // Maps story index to uploading state for manual image uploads
  const [isUploadingMap, setIsUploadingMap] = useState<Record<number, boolean>>(
    {},
  );
  const [isRehostingMap, setIsRehostingMap] = useState<Record<number, boolean>>(
    {},
  );
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const didCloudinarySyncRef = useRef(false);

  // Regeneration State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);

  // --- VALIDATION ---

  const openReplacementModal = (index: number) => {
    setReplaceIndex(index);
    setIsModalOpen(true);
  };

  const handleStoryReplaced = (newStory: NewsletterStory) => {
    if (replaceIndex === null) return;

    // Update the story
    const newStories = [...data.stories];
    newStories[replaceIndex] = newStory;
    setData({
      ...data,
      stories: newStories,
      intro: introAfterStoriesChange(data.intro, newStories),
    });

    // Clear out the previously generated HTML/Article for this slot so it is forced to regenerate
    if (articles[replaceIndex]) {
      const updatedArticles = [...articles];
      updatedArticles[replaceIndex] = {
        ...updatedArticles[replaceIndex],
        title: newStory.headline,
        contentMarkdown: "", // Wipe markdown so the "Generate" button appears again
        coverImageUrl: newStory.imageUrl || null,
      };
      setArticles(updatedArticles);
    }

    setIsModalOpen(false);
    setReplaceIndex(null);
    setSuccessMsg("Story replaced successfully!");
    setTimeout(() => setSuccessMsg(""), 2500);
  };

  const handleCopyHtml = async () => {
    try {
      const linkSafeData = buildNewsletterDataWithFinalSlugs(data, articles);
      const html = generateEmailHtml(linkSafeData);

      await navigator.clipboard.writeText(html);
      setSuccessMsg("Email HTML copied with publish-matching links.");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (err) {
      setErrorMsg("Failed to copy HTML to clipboard");
    }
  };

  const handleCopyPreviewLink = async () => {
    try {
      const previewUrl = buildNewsletterPreviewUrl(
        draft.id,
        typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SITE_URL : undefined,
      );
      await navigator.clipboard.writeText(previewUrl);
      setSuccessMsg("Public preview link copied.");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch {
      setErrorMsg("Failed to copy preview link.");
    }
  };

  const hasMissingImages = data.stories.some(
    (story) => !story.imageUrl || story.imageUrl.trim() === "",
  );

  // 2. Check if draft is fully ready to publish
  const isDraftComplete =
    articles.length === data.stories.length &&
    articles.every(
      (art) =>
        art &&
        art.title &&
        art.title.trim() !== "" &&
        art.contentMarkdown &&
        art.contentMarkdown.trim().length > 50,
    );
  const missingArticleSlots = data.stories
    .map((story, idx) => {
      const article = articles[idx];
      const missing =
        !article ||
        !article.title?.trim() ||
        !article.contentMarkdown ||
        article.contentMarkdown.trim().length < 50;
      if (!missing) return null;
      return `Story ${idx + 1}${story.headline?.trim() ? ` (${story.headline.trim()})` : ""}`;
    })
    .filter((value): value is string => Boolean(value));

  // --- HELPERS ---

  const updateStory = (
    index: number,
    field: keyof NewsletterStory,
    value: string,
  ) => {
    const newStories = [...data.stories];
    newStories[index] = { ...newStories[index], [field]: value };
    setData({
      ...data,
      stories: newStories,
      intro: introAfterStoriesChange(data.intro, newStories),
    });
  };

  const updateArticle = (index: number, field: keyof DbArticle, value: any) => {
    const newArticles = [...articles];
    newArticles[index] = { ...newArticles[index], [field]: value };
    setArticles(newArticles);
  };

  // --- ACTIONS ---

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select an image file.");
      return;
    }

    setIsUploadingMap((prev) => ({ ...prev, [index]: true }));
    setErrorMsg("");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onloadend = async () => {
        const base64data = reader.result as string;
        try {
          const newUrl = await uploadBase64ImageToCloudinary(base64data);
          updateStory(index, "imageUrl", newUrl);
          setSuccessMsg("Image uploaded to Cloudinary!");
          setTimeout(() => setSuccessMsg(""), 2000);
        } catch (uploadErr: any) {
          console.error(uploadErr);
          setErrorMsg("Upload failed: " + uploadErr.message);
        } finally {
          setIsUploadingMap((prev) => ({ ...prev, [index]: false }));
          if (fileInputRefs.current[index]) {
            fileInputRefs.current[index]!.value = "";
          }
        }
      };
    } catch (err) {
      console.error("File reading error", err);
      setErrorMsg("Failed to process file.");
      setIsUploadingMap((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleRehostImage = async (index: number) => {
    const currentUrl = data.stories[index]?.imageUrl?.trim();
    if (!currentUrl) {
      setErrorMsg("No image URL to upload.");
      return;
    }
    if (currentUrl.includes("res.cloudinary.com")) return;

    setIsRehostingMap((prev) => ({ ...prev, [index]: true }));
    setErrorMsg("");

    try {
      const cloudinaryUrl = await uploadImage(currentUrl);
      if (!cloudinaryUrl || cloudinaryUrl === currentUrl) {
        throw new Error("Could not upload this source image to Cloudinary.");
      }

      updateStory(index, "imageUrl", cloudinaryUrl);
      if (articles[index]) {
        updateArticle(index, "coverImageUrl", cloudinaryUrl);
      }
      setSuccessMsg("Image rehosted to Cloudinary!");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? `Cloudinary upload failed: ${err.message}`
          : "Cloudinary upload failed.",
      );
    } finally {
      setIsRehostingMap((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleSaveDraft = () => {
    const payloadData = { ...data, intro: (data.intro || "").trim() };
    setData(payloadData);
    const updatedDraft: NewsletterDraft = {
      ...draft,
      status: draftStatus,
      data: payloadData,
      articles: articles,
    };
    saveDraft(updatedDraft);
    setSuccessMsg("Draft saved locally.");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const handleDeleteNewsletter = async () => {
    const confirmDelete = window.confirm(
      "Delete this newsletter draft? This cannot be undone.",
    );
    if (!confirmDelete) return;
    setIsProcessing(true);
    setLoadingText("Deleting newsletter...");
    setErrorMsg("");
    try {
      const result = await deleteDraft(draft.id);
      if (!result.success) {
        throw new Error("Failed to delete newsletter.");
      }
      setSuccessMsg("Newsletter deleted.");
      setTimeout(() => onUpdate(), 400);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setIsProcessing(false);
      setLoadingText("");
    }
  };

  const handleDeletePublishedArticle = async (
    articleId: string,
    articleTitle: string,
  ) => {
    const confirmDelete = window.confirm(
      `Delete published article "${articleTitle}"?`,
    );
    if (!confirmDelete) return;
    setIsProcessing(true);
    setLoadingText("Deleting published article...");
    setErrorMsg("");
    try {
      const result = await deletePublishedNewsletterArticle(articleId);
      if (!result.success) {
        throw new Error("Failed to delete published article.");
      }
      setSuccessMsg("Published article deleted.");
      await loadPublishedArticles();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not delete published article.",
      );
    } finally {
      setIsProcessing(false);
      setLoadingText("");
    }
  };

  const handleClearSubmittedArticles = async () => {
    const hasArticles = (articles || []).length > 0;
    if (!hasArticles) {
      setErrorMsg("No submitted/generated articles found in this newsletter.");
      return;
    }
    const confirmClear = window.confirm(
      "Clear all submitted/generated articles in this newsletter so you can regenerate them?",
    );
    if (!confirmClear) return;

    setIsProcessing(true);
    setLoadingText("Clearing submitted articles...");
    setErrorMsg("");
    try {
      const result = await clearDraftArticlesForRegeneration(draft.id);
      if (!result.success) {
        throw new Error("Failed to clear submitted articles.");
      }
      setArticles([]);
      setDraftStatus("draft");
      setIsAlreadyPublished(false);
      setActiveTab("overview");
      setSuccessMsg("Submitted articles cleared. You can regenerate now.");
      setTimeout(() => setSuccessMsg(""), 2500);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not clear submitted articles.",
      );
    } finally {
      setIsProcessing(false);
      setLoadingText("");
    }
  };

  // Batch Generation (Skips already generated ones)
  const handleGenerateArticles = async () => {
    if (hasMissingImages) {
      clearGenerationError();
      setErrorMsg("Each story needs an image URL before generating articles.");
      return;
    }

    setIsProcessing(true);
    setLoadingText("Initializing writer...");
    clearGenerationError();
    setSuccessMsg("");

    try {
      const settings = await getSettings();
      if (!settings.authorId) {
        throw new Error(
          "Please set Author ID in newsletter settings (Admin → Newsletter).",
        );
      }

      let currentArticles = [...articles];
      let currentStories = [...data.stories];

      for (let i = 0; i < data.stories.length; i++) {
        // Skip if content already exists
        if (currentArticles[i]?.contentMarkdown?.trim().length > 50) continue;

        const story = data.stories[i];
        setLoadingText(
          `Writing article ${i + 1}/${data.stories.length}: ${story.headline}...`,
        );

        // Rate limit pause
        if (i > 0) await new Promise((res) => setTimeout(res, 2000));

        try {
          const content = await generateFullArticleContent(story);
          const uniqueSlug = createSlug(content.title);

          const newArt: DbArticle = {
            id: crypto.randomUUID(),
            slug: uniqueSlug,
            title: content.title,
            excerpt: content.excerpt,
            contentMarkdown: content.contentMarkdown,
            coverImageUrl: story.imageUrl || null,
            category: story.category || "General",
            authorId: settings.authorId,
            readingMinutes: content.readingMinutes || 3,
            isDraft: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            seo: {
              title: content.seoTitle,
              description: content.seoDescription,
              keywords: content.seoKeywords,
            },
            publishedAt: null,
            publishAt: null,
            publishedBy: null,
            deletedAt: null,
          };

          currentArticles[i] = newArt;
          currentStories[i] = { ...story, slug: uniqueSlug };

          setArticles([...currentArticles]);
          setData((prev) => ({
            ...prev,
            stories: [...currentStories],
            intro: introAfterStoriesChange(prev.intro, currentStories),
          }));

          // Save progress
          await saveDraft({
            ...draft,
            status: draftStatus,
            data: {
              ...data,
              stories: currentStories,
              intro: introAfterStoriesChange(data.intro, currentStories),
            },
            articles: currentArticles,
          });
        } catch (artError: unknown) {
          console.error(`Failed at article ${i + 1}:`, artError);
          reportGenerationError(artError, {
            step: "ai_article",
            storyIndex: i,
            storyTotal: data.stories.length,
            headline: story.headline,
          });
          break;
        }
      }

      if (
        currentArticles.every((a) => a?.contentMarkdown?.trim().length > 50)
      ) {
        setSuccessMsg("All articles generated!");
        clearGenerationError();
      }
    } catch (err: unknown) {
      reportGenerationError(err, { step: "settings" });
    } finally {
      setIsProcessing(false);
      setLoadingText("");
    }
  };

  // Single Article Regeneration
  const handleRegenerateSingleArticle = async (index: number) => {
    setIsProcessing(true);
    setLoadingText("Regenerating article...");
    clearGenerationError();

    try {
      const story = data.stories[index];
      const settings = await getSettings();

      const content = await generateFullArticleContent(story);
      const uniqueSlug = createSlug(content.title);
      const newArt: DbArticle = {
        // Preserve ID if it existed, or new one
        id: articles[index]?.id || crypto.randomUUID(),
        slug: uniqueSlug,
        title: content.title,
        excerpt: content.excerpt,
        contentMarkdown: content.contentMarkdown,
        coverImageUrl: story.imageUrl || null,
        category: story.category || "General",
        authorId: settings.authorId || "default",
        readingMinutes: content.readingMinutes || 3,
        isDraft: true,
        createdAt: articles[index]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        seo: {
          title: content.seoTitle,
          description: content.seoDescription,
          keywords: content.seoKeywords,
        },
        publishedAt: null,
        publishAt: null,
        publishedBy: null,
        deletedAt: null,
      };

      const newArticles = [...articles];
      newArticles[index] = newArt;
      setArticles(newArticles);

      const newStories = [...data.stories];
      newStories[index] = { ...story, slug: uniqueSlug };
      setData((prev) => ({
        ...prev,
        stories: newStories,
        intro: introAfterStoriesChange(prev.intro, newStories),
      }));

      await saveDraft({
        ...draft,
        status: draftStatus,
        data: {
          ...data,
          stories: newStories,
          intro: introAfterStoriesChange(data.intro, newStories),
        },
        articles: newArticles,
      });

      setSuccessMsg("Article regenerated successfully!");
      clearGenerationError();
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (err: unknown) {
      reportGenerationError(err, {
        step: "ai_article",
        storyIndex: index,
        storyTotal: data.stories.length,
        headline: data.stories[index]?.headline,
      });
    } finally {
      setIsProcessing(false);
      setLoadingText("");
    }
  };

  const handleApproveAndSend = async () => {
    if (isAlreadyPublished) {
      setErrorMsg("This newsletter is already published. Duplicate publish is blocked.");
      return;
    }
    if (missingArticleSlots.length > 0) {
      const preview = missingArticleSlots.slice(0, 3).join(", ");
      const remainder =
        missingArticleSlots.length > 3
          ? ` and ${missingArticleSlots.length - 3} more`
          : "";
      setErrorMsg(
        `Missing article content in: ${preview}${remainder}. Generate these before publishing.`,
      );
      return;
    }
    if (!isDraftComplete) {
      setErrorMsg("All articles must be generated before publishing.");
      return;
    }

    const confirmPublish = window.confirm(
      "This will publish articles to the DB and trigger the webhook. Continue?",
    );
    if (!confirmPublish) return;

    setIsProcessing(true);
    setLoadingText("Publishing & Syncing...");
    setErrorMsg("");

    try {
      const settings = await getSettings();
      if (!settings.webhookUrl)
        throw new Error("Webhook URL missing in settings.");

      // 1. Save final state
      await saveDraft({ ...draft, status: draftStatus, data, articles });

      // 2. Publish to DB
      const dbResult = await publishNewsletterToArticles(draft.id);
      if (!dbResult.success) {
        throw new Error(
          "error" in dbResult && dbResult.error
            ? String(dbResult.error)
            : "DB Publish failed.",
        );
      }
      setDraftStatus("sent");
      setIsAlreadyPublished(true);
      await loadPublishedArticles();

      // 3. Prepare Payload
      const dataWithFinalSlugs = buildNewsletterDataWithFinalSlugs(data, articles);
      const publishedSlugByIndex = new Map<number, string>();
      if ("published" in dbResult && Array.isArray(dbResult.published)) {
        for (const row of dbResult.published) {
          if (
            row &&
            typeof row.index === "number" &&
            typeof row.slug === "string" &&
            row.slug.trim()
          ) {
            publishedSlugByIndex.set(row.index, row.slug.trim());
          }
        }
      }
      const storiesWithPublishedSlugs = dataWithFinalSlugs.stories.map((story, idx) => {
        const publishedSlug = publishedSlugByIndex.get(idx);
        return publishedSlug ? { ...story, slug: publishedSlug } : story;
      });
      const dataWithPublishedSlugs = {
        ...dataWithFinalSlugs,
        stories: storiesWithPublishedSlugs,
      };
      const articlesWithPublishedSlugs = articles.map((article, idx) => {
        const publishedSlug = publishedSlugByIndex.get(idx);
        if (!publishedSlug || !article) return article;
        return { ...article, slug: publishedSlug };
      });
      const emailHtml = generateEmailHtml(dataWithPublishedSlugs);
      const flatArticles: Record<string, any> = {};
      articlesWithPublishedSlugs.forEach((art, idx) => {
        flatArticles[`article_${idx + 1}`] = art;
      });
      const flatStories: Record<string, any> = {};
      dataWithPublishedSlugs.stories.forEach((story, idx) => {
        const n = idx + 1;
        flatStories[`story_${n}_headline`] = story.headline;
        flatStories[`story_${n}_summary`] = story.summary;
        flatStories[`story_${n}_imageUrl`] = story.imageUrl;
        flatStories[`story_${n}_sourceUrl`] = story.sourceUrl;
        flatStories[`story_${n}_sourceName`] = story.sourceName;
        flatStories[`story_${n}_slug`] = story.slug;
      });

      const payload: WebhookPayload = {
        newsletter: {
          subject: dataWithPublishedSlugs.title,
          html: emailHtml,
          data: dataWithPublishedSlugs,
        },
        articles: articlesWithPublishedSlugs,
        ...flatArticles,
        ...flatStories,
        newsletter_title: dataWithPublishedSlugs.title,
        newsletter_html: emailHtml,
      };

      setData((prev) => ({
        ...prev,
        stories: storiesWithPublishedSlugs,
      }));
      setArticles(articlesWithPublishedSlugs);

      // 4. Send Webhook
      await sendToWebhook(settings.webhookUrl, payload);

      setSuccessMsg("Published Successfully!");
      setTimeout(() => onUpdate(), 1500);
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error && err.message ? err.message : "Publishing failed.";
      if (
        typeof message === "string" &&
        message.toLowerCase().includes("already published")
      ) {
        setDraftStatus("sent");
        setIsAlreadyPublished(true);
        setErrorMsg(message);
      } else {
        reportGenerationError(err, { step: "publish" });
      }
    } finally {
      setIsProcessing(false);
      setLoadingText("");
    }
  };

  // --- RENDER ---

  const tabSelectValue =
    activeTab === "overview" ? "overview" : String(activeTab);

  const storyNeedsArticle = (idx: number) =>
    !articles[idx] ||
    !articles[idx].contentMarkdown ||
    articles[idx].contentMarkdown.length < 50;
  const activeArticle = activeTab === "overview" ? null : articles[activeTab as number];
  const activeArticlePreviewHtml = useMemo(() => {
    const markdown = activeArticle?.contentMarkdown || "";
    if (!markdown.trim()) return "";
    return marked(normalizeArticleMarkdown(markdown));
  }, [activeArticle?.contentMarkdown]);

  return (
    <div className="flex h-full min-h-0 flex-col animate-fade-in bg-background text-foreground">
      {/* HEADER — single column: back + status, section picker (all sizes), actions */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground shrink-0 text-sm transition-colors"
          >
            &larr; Back
          </button>
          <div
            className="min-w-0 text-right text-xs text-muted-foreground"
            title="Autosave"
          >
            {isAutoSaving ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                Saving…
              </span>
            ) : lastSavedTime ? (
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                Saved {lastSavedTime}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Save className="h-3.5 w-3.5 shrink-0 opacity-60" />
                Draft
              </span>
            )}
          </div>
        </div>

        {(errorMsg || successMsg) && (
          <div className="space-y-2 border-t border-border px-3 py-2 sm:px-4">
            {errorMsg && (
              <div className="flex items-start gap-2 border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 space-y-2">
                  {generationError ? (
                    <>
                      <p className="font-semibold">{generationError.title}</p>
                      <p>
                        <span className="font-medium">Reason:</span>{" "}
                        {generationError.reason}
                      </p>
                      {generationError.hints.length > 0 ? (
                        <div>
                          <p className="font-medium">What to try:</p>
                          <ul className="mt-1 list-disc space-y-1 pl-5">
                            {generationError.hints.map((hint) => (
                              <li key={hint}>{hint}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <span className="min-w-0 break-words whitespace-pre-wrap">
                      {errorMsg}
                    </span>
                  )}
                </div>
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-2 border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {successMsg}
              </div>
            )}
          </div>
        )}

        {/* Section: one control for all breakpoints (no cramped tab strip) */}
        <div className="border-t border-border bg-muted/25 px-3 py-3 sm:px-4">
          <label
            htmlFor="review-section"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Jump to
          </label>
          <select
            id="review-section"
            value={tabSelectValue}
            onChange={(e) => {
              const v = e.target.value;
              setActiveTab(v === "overview" ? "overview" : parseInt(v, 10));
            }}
            className="min-h-12 w-full border border-neutral-300 bg-white px-3 py-2.5 text-base text-neutral-900 shadow-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100 sm:min-h-10 sm:text-sm"
          >
            <option value="overview">Overview — preview &amp; edit</option>
            {data.stories.map((story, idx) => {
              const flag = storyNeedsArticle(idx) ? " (!) " : " ";
              return (
                <option key={idx} value={String(idx)}>
                  Story {idx + 1}
                  {flag}— {story.headline || "Untitled"}
                </option>
              );
            })}
          </select>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            (!) = story still needs generated article text.
          </p>
        </div>

        {/* Actions: flex-wrap so any button count lays out cleanly */}
        <div className="flex flex-wrap gap-2 border-t border-border bg-background px-3 py-3 sm:px-4">
          {activeTab === "overview" && !isProcessing && (
            <button
              type="button"
              onClick={handleCopyHtml}
              title="Copy newsletter HTML"
              className="inline-flex min-h-11 flex-1 basis-[calc(50%-0.25rem)] items-center justify-center gap-2 border border-border bg-white px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-neutral-50 sm:basis-auto sm:flex-initial dark:bg-neutral-900 dark:hover:bg-neutral-800"
            >
              <Copy className="h-4 w-4 shrink-0" />
              Copy HTML
            </button>
          )}
          {activeTab === "overview" && !isProcessing && (
            <button
              type="button"
              onClick={handleCopyPreviewLink}
              title="Copy public preview link"
              className="inline-flex min-h-11 flex-1 basis-[calc(50%-0.25rem)] items-center justify-center gap-2 border border-border bg-white px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-neutral-50 sm:basis-auto sm:flex-initial dark:bg-neutral-900 dark:hover:bg-neutral-800"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              Preview Link
            </button>
          )}
          {activeTab === "overview" && (
            <button
              type="button"
              onClick={() => setEditMode(!editMode)}
              title={editMode ? "Preview" : "Edit fields"}
              className="inline-flex min-h-11 flex-1 basis-[calc(50%-0.25rem)] items-center justify-center gap-2 border border-border bg-white px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-neutral-50 sm:basis-auto sm:flex-initial dark:bg-neutral-900 dark:hover:bg-neutral-800"
            >
              {editMode ? (
                <Eye className="h-4 w-4 shrink-0" />
              ) : (
                <Edit3 className="h-4 w-4 shrink-0" />
              )}
              {editMode ? "Preview" : "Edit overview"}
            </button>
          )}
          {!isDraftComplete && (
            <button
              type="button"
              onClick={handleGenerateArticles}
              disabled={isProcessing || hasMissingImages}
              title={
                hasMissingImages
                  ? "Add an image URL to every story before generating articles"
                  : "Generate full articles for all stories"
              }
              className="inline-flex min-h-11 flex-1 basis-full items-center justify-center gap-2 border border-orange-700 bg-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 sm:basis-auto sm:flex-initial"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 shrink-0" />
              )}
              Generate articles
            </button>
          )}
          <button
            type="button"
            onClick={handleApproveAndSend}
            disabled={isProcessing || isAlreadyPublished}
            title={
              isAlreadyPublished
                ? "Already published"
                : !isDraftComplete
                  ? "Generate all articles first"
                  : "Publish"
            }
            className={`inline-flex min-h-11 flex-1 basis-full items-center justify-center gap-2 border px-4 text-sm font-semibold shadow-sm transition-colors sm:basis-auto sm:flex-initial ${
              isAlreadyPublished
                ? "cursor-not-allowed border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                : isDraftComplete
                ? "border-emerald-800 bg-emerald-600 text-white hover:bg-emerald-500"
                : "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"
            }`}
          >
            <Send className="h-4 w-4 shrink-0" />
            {isAlreadyPublished ? "Already published" : "Approve & publish"}
          </button>
          <button
            type="button"
            onClick={handleDeleteNewsletter}
            disabled={isProcessing}
            title="Delete this newsletter draft"
            className="inline-flex min-h-11 flex-1 basis-full items-center justify-center gap-2 border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 shadow-sm transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 sm:basis-auto sm:flex-initial dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            Delete newsletter
          </button>
          <button
            type="button"
            onClick={handleClearSubmittedArticles}
            disabled={isProcessing || articles.length === 0}
            title="Clear submitted/generated articles in this newsletter"
            className="inline-flex min-h-11 flex-1 basis-full items-center justify-center gap-2 border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900 shadow-sm transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 sm:basis-auto sm:flex-initial dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"
          >
            <RefreshCw className="h-4 w-4 shrink-0" />
            Clear submitted articles
          </button>
          {missingArticleSlots.length > 0 ? (
            <div className="basis-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Missing article content: {missingArticleSlots.slice(0, 3).join(", ")}
              {missingArticleSlots.length > 3
                ? ` and ${missingArticleSlots.length - 3} more.`
                : "."}
            </div>
          ) : null}
        </div>

        <div className="border-t border-border bg-muted/20 px-3 py-3 sm:px-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Published from this newsletter
            </p>
            <button
              type="button"
              onClick={() => void loadPublishedArticles()}
              disabled={loadingPublishedArticles || isProcessing}
              className="inline-flex items-center gap-1.5 rounded border border-border bg-white px-2 py-1 text-xs text-foreground hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            >
              {loadingPublishedArticles ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </button>
          </div>
          {publishedArticles.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No published articles found for this draft yet.
            </p>
          ) : (
            <div className="space-y-2">
              {publishedArticles.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-background px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      /{item.slug}
                      {item.isDuplicate ? ` • duplicate x${item.duplicateCount}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeletePublishedArticle(item.id, item.title)}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1 rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
        {activeTab === "overview" ? (
          <div className="flex h-full min-h-0 flex-col lg:flex-row">
            {/* EDIT OVERVIEW SIDEBAR */}
            {editMode ? (
              <div className="w-full overflow-y-auto border-r border-border bg-background p-4 pb-20 scrollbar-thin sm:p-6 lg:w-1/2">
                <div className="flex flex-col gap-6">
                  {/* NEWSLETTER TITLE — inbox email subject */}
                  <div className="p-4  border border-border bg-card shadow-sm">
                    <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                      Newsletter title (email subject)
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Short hook from Story 1 — aim for ≤6 words. This is what
                      subscribers see in their inbox.
                    </p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                      <input
                        className={`min-w-0 flex-1 p-3 ${OVERVIEW_FIELD_CLASS}`}
                        value={data.title || ""}
                        onChange={(e) =>
                          setData({ ...data, title: e.target.value })
                        }
                        placeholder="e.g. Vance’s Flight Into Iran Chaos"
                      />
                      <button
                        type="button"
                        onClick={handleSuggestEmailSubject}
                        disabled={
                          suggestingSubject ||
                          !data.stories[0]?.headline?.trim()
                        }
                        title="Generate a hooky subject from Story 1 headline & summary"
                        className="inline-flex shrink-0 items-center justify-center gap-2 border border-orange-600 bg-orange-50 px-3 py-2.5 text-sm font-semibold text-orange-950 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-700 dark:bg-orange-950/50 dark:text-orange-100 dark:hover:bg-orange-950/80"
                      >
                        {suggestingSubject ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 shrink-0" />
                        )}
                        From Story 1
                      </button>
                    </div>
                  </div>

                  {/* DAILY BRIEF LEAD — italic callout under header in preview & email */}
                  <div className="border border-border bg-card p-4 shadow-sm">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                      Daily brief lead
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Optional. Leave empty to auto-fill from the first sentences
                      of your story summaries, or regenerate from the latest
                      summaries after edits.
                    </p>
                    <textarea
                      className={`mt-2 min-h-[100px] w-full resize-y p-3 leading-relaxed ${OVERVIEW_FIELD_CLASS} ${OVERVIEW_TEXTAREA_SCROLLBAR}`}
                      value={data.intro || ""}
                      onChange={(e) =>
                        setData({ ...data, intro: e.target.value })
                      }
                      placeholder="One or two sentences for the blue callout under DAILY BRIEF…"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRegenerateDailyBriefLead}
                        className="inline-flex items-center gap-2 border border-orange-600 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-950 transition-colors hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-950/50 dark:text-orange-100 dark:hover:bg-orange-950/80"
                        title="Regenerate Daily brief lead from current story summaries"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Regenerate lead
                      </button>
                      <button
                        type="button"
                        onClick={() => setData((prev) => ({ ...prev, intro: "" }))}
                        className="inline-flex items-center gap-2 border border-border bg-white px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                        title="Clear manual text and use auto-fill"
                      >
                        Clear manual lead
                      </button>
                    </div>
                  </div>

                  {/* STORIES LIST */}
                  {data.stories.map((story, idx) => {
                    return (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, idx)}
                        className={`p-5  border shadow-sm transition-all duration-200 ${
                          draggedIndex === idx
                            ? "border-primary opacity-40 scale-[0.98]"
                            : "border-border bg-card hover:border-border/80"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-5">
                          {/* DRAG HANDLE */}
                          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-grab active:cursor-grabbing p-1.5 -ml-1.5 hover:bg-muted  transition-colors">
                            <GripVertical className="h-4 w-4" />
                            Story {idx + 1}
                          </div>

                          {/* BUTTONS CONTAINER */}
                          <div className="flex items-center gap-2">
                            {story.sourceUrl && (
                              <a
                                href={story.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1.5  border border-primary/20 transition-colors"
                                title="Read Original Article"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span className="hidden sm:inline">Source</span>
                              </a>
                            )}

                            <button
                              onClick={() => openReplacementModal(idx)}
                              className="text-xs flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-2.5 py-1.5  border border-border transition-colors"
                              title="Select a different article from RSS feeds"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span className="hidden sm:inline">Replace</span>
                            </button>

                            <button
                              onClick={() => handleDeleteStory(idx)}
                              className="text-xs flex items-center justify-center bg-destructive/10 hover:bg-destructive/20 text-destructive px-2.5 py-1.5  border border-destructive/20 transition-colors"
                              title="Delete this story"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* HEADLINE */}
                        <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
                          Headline
                        </label>
                        <input
                          className={`mb-4 w-full p-2.5 ${OVERVIEW_FIELD_CLASS}`}
                          value={story.headline || ""}
                          onChange={(e) =>
                            updateStory(idx, "headline", e.target.value)
                          }
                        />

                        {/* NEWSLETTER LINK SLUG */}
                        <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
                          Link slug (for copied newsletter links)
                        </label>
                        <input
                          className={`mb-4 w-full p-2.5 ${OVERVIEW_FIELD_CLASS}`}
                          value={story.slug || ""}
                          onChange={(e) =>
                            updateStory(idx, "slug", normalizeStorySlug(e.target.value))
                          }
                          placeholder="e.g. trump-says-he-wont-run"
                        />

                        {/* IMAGE URL */}
                        <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
                          Image URL
                        </label>
                        <div className="flex gap-2 mb-4">
                          <input
                            className={`flex-1 p-2.5 ${OVERVIEW_FIELD_CLASS}`}
                            value={story.imageUrl || ""}
                            onChange={(e) =>
                              updateStory(idx, "imageUrl", e.target.value)
                            }
                          />
                          <input
                            type="file"
                            className="hidden"
                            ref={(el) => {
                              fileInputRefs.current[idx] = el;
                            }}
                            onChange={(e) => handleFileUpload(e, idx)}
                            accept="image/*"
                          />
                          <button
                            onClick={() => fileInputRefs.current[idx]?.click()}
                            disabled={isUploadingMap[idx]}
                            className="p-2.5 bg-secondary hover:bg-secondary/80  border border-border text-secondary-foreground transition-colors flex items-center justify-center min-w-[44px]"
                          >
                            {isUploadingMap[idx] ? (
                              <Loader2 className="animate-spin h-4 w-4" />
                            ) : (
                              <UploadCloud className="h-4 w-4" />
                            )}
                          </button>
                          {story.imageUrl?.trim() &&
                            !story.imageUrl.includes("res.cloudinary.com") && (
                              <button
                                type="button"
                                onClick={() => handleRehostImage(idx)}
                                disabled={isRehostingMap[idx]}
                                className="inline-flex min-w-[44px] items-center justify-center gap-1.5 border border-orange-300 bg-orange-50 px-2.5 text-xs font-semibold text-orange-900 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Upload this source URL to Cloudinary"
                              >
                                {isRehostingMap[idx] ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <LinkIcon className="h-3.5 w-3.5" />
                                )}
                                <span className="hidden sm:inline">Rehost</span>
                              </button>
                            )}
                        </div>

                        {/* SUMMARY */}
                        <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
                          Summary
                        </label>
                        <textarea
                          className={`h-32 w-full resize-y p-3 leading-relaxed ${OVERVIEW_FIELD_CLASS} ${OVERVIEW_TEXTAREA_SCROLLBAR}`}
                          value={story.summary || ""}
                          onChange={(e) =>
                            updateStory(idx, "summary", e.target.value)
                          }
                        />
                      </div>
                    );
                  })}

                  {/* ADD NEW STORY BUTTON */}
                  <button
                    onClick={handleAddStory}
                    className="w-full py-5 border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary hover:bg-muted/50  flex items-center justify-center gap-2 font-bold transition-all mt-2"
                  >
                    <Plus className="h-5 w-5" /> Add New Story Slot
                  </button>
                </div>
              </div>
            ) : (
              // PREVIEW OVERVIEW
              <div className="w-full h-full overflow-y-auto p-4 lg:p-12 bg-muted/30">
                <div className="mx-auto max-w-2xl">
                  <NewsletterPreview data={data} />
                </div>
              </div>
            )}

            {/* PREVIEW SIDEBAR */}
            {editMode && (
              <div className="hidden w-1/2 overflow-y-auto border-l border-border bg-muted/30 p-4 sm:p-8 lg:block">
                <div className="mx-auto max-w-[600px] origin-top scale-90">
                  <NewsletterPreview data={data} />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* --- ARTICLE EDITOR TAB --- */
          <div className="flex h-full min-h-0 flex-col lg:flex-row">
            {/* LEFT: EDITOR */}
            <div className="flex w-full flex-col overflow-y-auto border-r border-border bg-background p-4 sm:p-6 lg:w-1/2">
              <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Article editor
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    handleRegenerateSingleArticle(activeTab as number)
                  }
                  disabled={isProcessing}
                  className="inline-flex w-full items-center justify-center gap-2 border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary transition-colors hover:bg-primary/20 sm:w-auto"
                >
                  <RefreshCw
                    className={`h-3 w-3 shrink-0 ${isProcessing ? "animate-spin" : ""}`}
                  />
                  <span className="sm:hidden">Regenerate</span>
                  <span className="hidden sm:inline">Regenerate this article</span>
                </button>
              </div>

              {articles[activeTab as number] ? (
                <>
                  <input
                    className="mb-4 w-full border-b border-border bg-transparent pb-2 text-xl font-bold text-foreground focus:border-primary focus:outline-none sm:mb-6 sm:text-2xl"
                    value={articles[activeTab as number].title || ""}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      const newSlug = createSlug(newTitle);

                      updateArticle(activeTab as number, "title", newTitle);
                      updateArticle(activeTab as number, "slug", newSlug);

                      const newStories = [...data.stories];
                      newStories[activeTab as number] = {
                        ...newStories[activeTab as number],
                        slug: newSlug,
                      };
                      setData({
                        ...data,
                        stories: newStories,
                        intro: introAfterStoriesChange(data.intro, newStories),
                      });
                    }}
                    placeholder="Article Title..."
                  />
                  <AdminBlockEditor
                    initialMarkdown={
                      articles[activeTab as number].contentMarkdown || ""
                    }
                    onChange={({ markdown }) => {
                      updateArticle(activeTab as number, "contentMarkdown", markdown);
                    }}
                    className="min-h-[520px]"
                  />
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border  text-muted-foreground p-8 text-center">
                  <p className="mb-4">
                    This article content has not been generated yet.
                  </p>
                  <button
                    onClick={() =>
                      handleRegenerateSingleArticle(activeTab as number)
                    }
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground  font-bold flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" /> Generate Now
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT: PREVIEW */}
            <div className="w-full overflow-y-auto bg-card p-4 text-foreground sm:p-8 lg:w-1/2 lg:p-12">
              <div className="prose prose-lg prose-invert mx-auto max-w-2xl">
                {activeArticlePreviewHtml ? (
                  <>
                    {activeArticle?.coverImageUrl && (
                      <img
                        src={activeArticle.coverImageUrl}
                        alt="Cover"
                        className="mb-8 h-64 w-full object-cover"
                      />
                    )}
                    <h1 className="mb-4 text-2xl font-black leading-tight sm:mb-6 sm:text-4xl">
                      {activeArticle?.title}
                    </h1>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: activeArticlePreviewHtml,
                      }}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground italic">
                    Article preview will appear here...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GLOBAL LOADING OVERLAY */}
      {isProcessing && (
        <div className="fixed inset-0 bg-background/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex w-full max-w-sm flex-col items-center border border-border bg-card p-8 text-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <h3 className="text-foreground font-bold text-lg mb-2">
              Processing...
            </h3>
            <p className="text-muted-foreground text-sm">{loadingText}</p>
          </div>
        </div>
      )}

      {/* ARTICLE SELECTION MODAL */}
      <ArticleSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sourcePool={draft.sourcePool}
        currentStories={data.stories}
        targetSlotName={
          replaceIndex !== null ? data.stories[replaceIndex].slotName : ""
        }
        onStoryGenerated={handleStoryReplaced}
      />
    </div>
  );
};

export default ReviewEditor;

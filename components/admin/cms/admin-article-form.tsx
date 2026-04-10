"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { AdminBlockEditor } from "@/components/admin/cms/admin-block-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/helpers/articles";
import { toast } from "sonner";

type Props = {
  articleId?: string;
};

export function AdminArticleForm({ articleId }: Props) {
  const router = useRouter();
  const editorRef = useRef<Editor | null>(null);
  const [loading, setLoading] = useState(!!articleId);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("General");
  const [tagsRaw, setTagsRaw] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isDraft, setIsDraft] = useState(true);
  const [publishAt, setPublishAt] = useState("");
  const [blocks, setBlocks] = useState<object>({
    type: "doc",
    content: [{ type: "paragraph" }],
  });
  const [contentHtml, setContentHtml] = useState("");
  const [helperPaste, setHelperPaste] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        setTagsRaw(
          Array.isArray(data.tags) ? data.tags.join(", ") : "",
        );
        setCoverImageUrl(data.coverImageUrl ?? "");
        setIsDraft(!!data.isDraft);
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

  const onTitle = (v: string) => {
    setTitle(v);
    if (!articleId) setSlug(slugify(v));
  };

  const buildMeta = (opts: { publishNow?: boolean; schedule?: boolean }) => {
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const meta: Record<string, unknown> = {
      title,
      slug,
      excerpt: excerpt || null,
      category,
      tags,
      coverImageUrl: coverImageUrl || null,
      isDraft: opts.publishNow || opts.schedule ? false : isDraft,
      contentHtml,
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
        router.push("/admin/articles");
        return;
      }
      const res = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...meta,
          slug: slug || slugify(title),
          blocks,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.error === "string" ? err.error : "Create failed",
        );
      }
      const data = await res.json();
      toast.success("Created");
      router.push(`/admin/articles/${data.id}/edit`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runAssist = async () => {
    setAiBusy(true);
    try {
      const res = await fetch("/api/admin/ai/article-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          html: contentHtml,
          blocks,
          mode: "all",
        }),
      });
      if (!res.ok) throw new Error("Assist failed");
      const data = await res.json();
      if (data.slug) setSlug(String(data.slug));
      if (data.category) setCategory(String(data.category));
      if (Array.isArray(data.tags) && data.tags.length) {
        setTagsRaw(data.tags.join(", "));
      }
      if (data.excerpt) setExcerpt(String(data.excerpt));
      if (data.title) setTitle(String(data.title));
      if (data.draftHtml && editorRef.current) {
        editorRef.current.commands.setContent(String(data.draftHtml));
      }
      toast.success("AI suggestions applied");
    } catch {
      toast.error("AI assist failed");
    } finally {
      setAiBusy(false);
    }
  };

  const runLayoutHelper = async () => {
    if (!helperPaste.trim()) {
      toast.message("Paste text with line breaks first");
      return;
    }
    setAiBusy(true);
    try {
      const res = await fetch("/api/admin/ai/block-editor-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: helperPaste }),
      });
      if (!res.ok) throw new Error("Helper failed");
      const data = await res.json();
      if (data.html && editorRef.current) {
        editorRef.current.chain().focus().setContent(String(data.html)).run();
      }
      toast.success("Layout applied");
    } catch {
      toast.error("Layout helper failed");
    } finally {
      setAiBusy(false);
    }
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
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder="Headline"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="url-slug"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea
            id="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="politics, california, …"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Cover image</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://…"
              className="max-w-xl"
            />
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-orange-700">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onUploadCover}
              />
              <span className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 font-medium hover:bg-orange-100">
                {uploading ? "Uploading…" : "Upload file"}
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
        <Sparkles className="h-4 w-4 text-orange-600" />
        <span className="text-sm font-medium text-neutral-800">
          Article AI assist
        </span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={aiBusy}
          onClick={runAssist}
        >
          {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Fill metadata &amp; draft
        </Button>
      </div>

      <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-neutral-600" />
          <span className="text-sm font-medium">Block editor helper</span>
        </div>
        <p className="text-xs text-neutral-600">
          Paste plain text with line breaks. AI assigns headings vs paragraphs
          without rewriting wording, then replaces the editor body.
        </p>
        <Textarea
          value={helperPaste}
          onChange={(e) => setHelperPaste(e.target.value)}
          rows={5}
          placeholder="Paste raw lines…"
          className="bg-white"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={aiBusy}
          onClick={runLayoutHelper}
        >
          Apply layout to editor
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Body</Label>
        <AdminBlockEditor
          initialDoc={blocks}
          initialHtml={articleId ? contentHtml : undefined}
          onChange={onEditorChange}
          onEditorReady={(ed) => {
            editorRef.current = ed;
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <input
            id="draft"
            type="checkbox"
            checked={isDraft}
            onChange={(e) => setIsDraft(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300"
          />
          <Label htmlFor="draft">Draft</Label>
        </div>
        <div className="space-y-1">
          <Label htmlFor="pub">Schedule (optional)</Label>
          <Input
            id="pub"
            type="datetime-local"
            value={publishAt}
            onChange={(e) => setPublishAt(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-6">
        <Button
          type="button"
          disabled={saving}
          onClick={() => save({})}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={() => save({ publishNow: true })}
        >
          Publish now
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving || !publishAt}
          onClick={() => save({ schedule: true })}
        >
          Schedule
        </Button>
      </div>
    </div>
  );
}

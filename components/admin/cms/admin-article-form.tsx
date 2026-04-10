"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AdminBlockEditor } from "@/components/admin/cms/admin-block-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
        router.refresh();
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
                initialHtml={articleId ? contentHtml : undefined}
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
        </aside>
      </div>
    </div>
  );
}

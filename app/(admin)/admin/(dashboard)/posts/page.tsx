"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Copy,
  ExternalLink,
  ImagePlus,
  Layout,
  Loader2,
  MousePointerClick,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Post = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
  caption: string | null;
  isPinned: boolean | null;
  order: number | null;
  isActive: boolean | null;
  clickCount?: number | null;
};

type FeedType = "kindjoe" | "ventura" | "joeknowsla";
const INITIAL_VISIBLE = 8;
const LOAD_MORE_STEP = 4;

export default function AdminPostsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState<FeedType>("kindjoe");
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draggingImage, setDraggingImage] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [search, setSearch] = useState("");
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);

  const apiBase =
    feedType === "ventura"
      ? "/api/admin/ventura-posts"
      : feedType === "joeknowsla"
        ? "/api/admin/joeknowsla-posts"
        : "/api/admin/posts";
  const feedLabel =
    feedType === "ventura"
      ? "Ventura posts"
      : feedType === "joeknowsla"
        ? "JoeKnowsLA posts"
        : "Posts";
  const addButtonLabel =
    feedType === "ventura"
      ? "Add Ventura post"
      : feedType === "joeknowsla"
        ? "Add JoeKnowsLA post"
        : "Add post";
  const singularPostLabel =
    feedType === "ventura"
      ? "Ventura post"
      : feedType === "joeknowsla"
        ? "JoeKnowsLA post"
        : "post";

  useEffect(() => {
    const queryFeed = searchParams.get("feed");
    if (queryFeed === "ventura" || queryFeed === "joeknowsla") {
      setFeedType(queryFeed);
    } else {
      setFeedType("kindjoe");
    }
    setVisibleCount(INITIAL_VISIBLE);
  }, [searchParams]);

  const load = async () => {
    const res = await fetch(`${apiBase}?limit=200`, { cache: "no-store" });
    if (!res.ok) throw new Error("load");
    setPosts(await res.json());
  };

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() =>
        toast.error(
          `Could not load ${
            feedType === "ventura"
              ? "ventura posts"
              : feedType === "joeknowsla"
                ? "JoeKnowsLA posts"
                : "posts"
          }`,
        ),
      )
      .finally(() => setLoading(false));
  }, [feedType]);

  const create = async () => {
    setSaving(true);
    try {
      const endpoint = editingPost ? `${apiBase}/${editingPost.id}` : apiBase;
      const res = await fetch(endpoint, {
        method: editingPost ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          destinationUrl,
        }),
      });
      if (!res.ok) throw new Error("create");
      toast.success(
        editingPost ? `${singularPostLabel} updated` : `${singularPostLabel} created`,
      );
      setOpen(false);
      setEditingPost(null);
      setImageUrl("");
      setDestinationUrl("");
      await load();
    } catch {
      toast.error("Could not create post");
    } finally {
      setSaving(false);
    }
  };

  const uploadImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.error === "string" ? err.error : "Image upload failed",
        );
      }
      const data = await res.json();
      if (!data.url || typeof data.url !== "string") {
        throw new Error("Image upload failed");
      }
      setImageUrl(data.url);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const togglePin = async (p: Post) => {
    try {
      const res = await fetch(`${apiBase}/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !p.isPinned }),
      });
      if (!res.ok) throw new Error("pin");
      await load();
    } catch {
      toast.error("Update failed");
    }
  };

  const remove = async (id: number) => {
    if (!confirm(`Delete this ${singularPostLabel}?`)) return;
    try {
      const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("del");
      setPosts((prev) => prev.filter((x) => x.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading{" "}
          {feedType === "ventura"
            ? "ventura posts"
            : feedType === "joeknowsla"
              ? "JoeKnowsLA posts"
              : "posts"}
          ...
        </div>
      </div>
    );
  }

  const filteredPosts = posts.filter((p) => {
    const haystack = `${p.caption ?? ""} ${p.destinationUrl}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });
  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const remainingCount = Math.max(0, filteredPosts.length - visibleCount);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            {feedLabel}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Link-in-bio tiles for social landing pages.
          </p>
          <Tabs value={feedType} className="mt-3">
            <TabsList className="h-10 rounded-full border border-border bg-muted/70 p-1">
              <TabsTrigger
                value="kindjoe"
                className="rounded-full px-4 text-xs"
                onClick={() => {
                  const nextFeed: FeedType = "kindjoe";
                  setFeedType(nextFeed);
                  router.replace(`${pathname}?feed=${nextFeed}`, { scroll: false });
                }}
              >
                KindJoe posts
              </TabsTrigger>
              <TabsTrigger
                value="ventura"
                className="rounded-full px-4 text-xs"
                onClick={() => {
                  const nextFeed: FeedType = "ventura";
                  setFeedType(nextFeed);
                  router.replace(`${pathname}?feed=${nextFeed}`, { scroll: false });
                }}
              >
                Ventura posts
              </TabsTrigger>
              <TabsTrigger
                value="joeknowsla"
                className="rounded-full px-4 text-xs"
                onClick={() => {
                  const nextFeed: FeedType = "joeknowsla";
                  setFeedType(nextFeed);
                  router.replace(`${pathname}?feed=${nextFeed}`, { scroll: false });
                }}
              >
                JoeKnowsLA posts
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <div className="relative w-full min-w-[14rem] sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="rounded-xl border-border bg-card pl-9"
            />
          </div>
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setEditingPost(null);
            }}
          >
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              {addButtonLabel}
            </Button>
          </DialogTrigger>
          <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="px-8 pt-7">
                {editingPost
                  ? `Edit ${
                      feedType === "ventura"
                        ? "Ventura post"
                        : feedType === "joeknowsla"
                          ? "JoeKnowsLA post"
                          : "post"
                    }`
                  : "Create Post"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 px-8 py-6">
              <div>
                <Label htmlFor="img" className="mb-2 block">Image</Label>
                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    void uploadImageFile(file);
                    e.currentTarget.value = "";
                  }}
                />
                {imageUrl.trim() ? (
                  <div className="mt-2 space-y-3">
                    <div className="overflow-hidden rounded-xl border border-border bg-muted">
                      <img
                        src={imageUrl}
                        alt="Selected post media"
                        className="h-[200px] w-full object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => setImageUrl("")}
                      >
                        Clear
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-lg"
                        onClick={() => imageFileInputRef.current?.click()}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => imageFileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (!draggingImage) setDraggingImage(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setDraggingImage(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDraggingImage(false);
                        const file = e.dataTransfer.files?.[0];
                        if (!file) return;
                        void uploadImageFile(file);
                      }}
                      className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-5 text-sm transition-colors",
                        draggingImage
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-muted text-muted-foreground hover:border-border hover:bg-muted/80",
                      )}
                    >
                      {uploadingImage ? (
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
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="dest">Link URL</Label>
                <Input
                  id="dest"
                  type="url"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://…"
                  className="rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end border-t border-border px-8 py-5">
              <Button
                disabled={
                  saving ||
                  uploadingImage ||
                  !imageUrl.trim() ||
                  !destinationUrl.trim()
                }
                onClick={create}
                className="rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingPost ? "Update" : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {visiblePosts.length > 0 ? (
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {visiblePosts.map((p) => (
          <div
            key={p.id}
            className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-muted transition-transform duration-200 hover:scale-[1.02]"
          >
            <Image
              src={p.imageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            {p.isPinned && (
              <div className="absolute left-2 top-2 rounded-md bg-foreground/70 p-1 text-white">
                <Pin className="h-3.5 w-3.5" />
              </div>
            )}
            {!p.isActive && (
              <div className="absolute left-2 bottom-2 rounded-md bg-amber-100/90 px-2 py-1 text-[11px] font-medium text-amber-700">
                Scheduled
              </div>
            )}
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-foreground/45 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              <MousePointerClick className="h-3 w-3" />
              {new Intl.NumberFormat("en", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(p.clickCount ?? 0)}{" "}
              clicks
            </div>
            <div className="absolute inset-0 bg-foreground/45 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="absolute right-2 top-2 flex gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => {
                    setEditingPost(p);
                    setImageUrl(p.imageUrl);
                    setDestinationUrl(p.destinationUrl);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="destructive"
                  className="rounded-full"
                  onClick={() => remove(p.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex h-full items-center justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(p.destinationUrl);
                      toast.success("Link copied");
                    } catch {
                      toast.error("Could not copy link");
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>
              </div>
              <a
                href={p.destinationUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-xs text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                className="absolute bottom-2 right-2 rounded-full"
                onClick={() => togglePin(p)}
              >
                <Pin className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/60 p-8 text-center">
          <div className="mb-3 rounded-full bg-card p-3 shadow-sm">
            <Layout className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium tracking-tight text-foreground">
            No posts found
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first post to start building your studio grid.
          </p>
          <Button
            className="mt-4 rounded-xl"
            onClick={() => {
              setEditingPost(null);
              setImageUrl("");
              setDestinationUrl("");
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Create your first post
          </Button>
        </div>
      )}

      {remainingCount > 0 && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setVisibleCount((prev) => prev + LOAD_MORE_STEP)
            }
          >
            Load more ({Math.min(LOAD_MORE_STEP, remainingCount)})
          </Button>
        </div>
      )}
    </div>
  );
}

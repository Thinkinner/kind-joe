"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Pin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Post = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
  caption: string | null;
  isPinned: boolean | null;
  order: number | null;
  isActive: boolean | null;
};

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/admin/posts", { cache: "no-store" });
    if (!res.ok) throw new Error("load");
    setPosts(await res.json());
  };

  useEffect(() => {
    load()
      .catch(() => toast.error("Could not load posts"))
      .finally(() => setLoading(false));
  }, []);

  const create = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, destinationUrl, caption }),
      });
      if (!res.ok) throw new Error("create");
      toast.success("Post created");
      setOpen(false);
      setImageUrl("");
      setDestinationUrl("");
      setCaption("");
      await load();
    } catch {
      toast.error("Could not create post");
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (p: Post) => {
    try {
      const res = await fetch(`/api/admin/posts/${p.id}`, {
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
    if (!confirm("Delete this post?")) return;
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("del");
      setPosts((prev) => prev.filter((x) => x.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="space-y-2">
              <Skeleton className="aspect-[4/5] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Posts
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Link-in-bio style tiles (image + outbound URL).
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Add post
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New post</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label htmlFor="img">Image URL</Label>
                <Input
                  id="img"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://res.cloudinary.com/…"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Use{" "}
                  <Link
                    href="/admin/articles/new"
                    className="text-orange-700 underline"
                  >
                    article editor
                  </Link>{" "}
                  upload or Cloudinary.
                </p>
              </div>
              <div>
                <Label htmlFor="dest">Destination URL</Label>
                <Input
                  id="dest"
                  type="url"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div>
                <Label htmlFor="cap">Caption (optional)</Label>
                <Textarea
                  id="cap"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={
                  saving || !imageUrl.trim() || !destinationUrl.trim()
                }
                onClick={create}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {posts.map((p) => (
          <div
            key={p.id}
            className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
          >
            <Image
              src={p.imageUrl}
              alt=""
              fill
              className="object-cover transition group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            {p.isPinned && (
              <div className="absolute left-2 top-2 rounded-md bg-black/70 p-1 text-white">
                <Pin className="h-3.5 w-3.5" />
              </div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 opacity-0 transition group-hover:opacity-100">
              <a
                href={p.destinationUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white p-2 text-neutral-900"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => togglePin(p)}
              >
                <Pin className="mr-1 h-3 w-3" />
                {p.isPinned ? "Unpin" : "Pin"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => remove(p.id)}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

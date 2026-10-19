"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ARTICLE_BANNER_VIDEO_URL, getYouTubeId } from "@/lib/media/youtube";

type Promo = {
  videoUrl: string;
  bannerImageUrl: string | null;
};

async function uploadFile(endpoint: string, file: File) {
  const body = new FormData();
  body.set("file", file);
  const res = await fetch(endpoint, { method: "POST", body });
  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.url;
}

export function ArticlePromoSettingsPanel() {
  const [videoUrl, setVideoUrl] = useState(ARTICLE_BANNER_VIDEO_URL);
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/article-promo")
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load settings");
        return (await res.json()) as Promo;
      })
      .then((data) => {
        if (cancelled) return;
        setVideoUrl(data.videoUrl || ARTICLE_BANNER_VIDEO_URL);
        setBannerImageUrl(data.bannerImageUrl ?? "");
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Could not load settings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(next?: Promo) {
    const payload = next ?? {
      videoUrl,
      bannerImageUrl: bannerImageUrl.trim() || null,
    };
    setSaving(true);
    try {
      const res = await fetch("/api/admin/article-promo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as (Promo & { error?: string }) | null;
      if (!res.ok || !data?.videoUrl) {
        throw new Error(data?.error || "Could not save");
      }
      setVideoUrl(data.videoUrl);
      setBannerImageUrl(data.bannerImageUrl ?? "");
      toast.success("Article promo saved");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function onVideoFile(file: File | null) {
    if (!file) return;
    setUploadingVideo(true);
    try {
      const url = await uploadFile("/api/admin/upload-video", file);
      setVideoUrl(url);
      toast.success("Video uploaded. Save to use it on articles.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadingVideo(false);
    }
  }

  async function onBannerFile(file: File | null) {
    if (!file) return;
    setUploadingBanner(true);
    try {
      const url = await uploadFile("/api/admin/upload-image", file);
      setBannerImageUrl(url);
      toast.success("Banner uploaded. Save to use it on articles.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadingBanner(false);
    }
  }

  const youtubeId = getYouTubeId(videoUrl);
  const busy = loading || saving || uploadingVideo || uploadingBanner;

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Article promo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This video and banner sit in the middle of every article. Paste a link or upload a file to Cloudinary.
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="promo-video-url">Video link</Label>
        <Input
          id="promo-video-url"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          placeholder="YouTube link or uploaded video URL"
          disabled={busy}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" disabled={busy} asChild>
            <label className="cursor-pointer">
              {uploadingVideo ? "Uploading video..." : "Upload video"}
              <input
                type="file"
                accept="video/*"
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  void onVideoFile(file);
                }}
              />
            </label>
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => setVideoUrl(ARTICLE_BANNER_VIDEO_URL)}
          >
            Use default video
          </Button>
        </div>
        {youtubeId ? (
          <div className="aspect-video overflow-hidden rounded-xl bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title="Video preview"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : videoUrl.trim() ? (
          <video src={videoUrl} controls className="aspect-video w-full rounded-xl bg-black" />
        ) : null}
      </div>

      <div className="space-y-3">
        <Label htmlFor="promo-banner">Banner image</Label>
        <p className="text-xs text-muted-foreground">
          Upload a banner to show under the video. With no image, the sponsor card stays.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" disabled={busy} asChild>
            <label className="cursor-pointer">
              {uploadingBanner ? "Uploading banner..." : "Upload banner"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  void onBannerFile(file);
                }}
              />
            </label>
          </Button>
          {bannerImageUrl ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setBannerImageUrl("")}
            >
              Remove banner
            </Button>
          ) : null}
        </div>
        {bannerImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerImageUrl} alt="" className="w-full rounded-xl" />
        ) : null}
      </div>

      <Button type="button" disabled={busy} onClick={() => void save()}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}

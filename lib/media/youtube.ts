const VIDEO_ID = /^[\w-]{11}$/;

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Pull a YouTube video id from a watch, share, shorts, embed, or iframe URL. */
export function getYouTubeId(input: string | null | undefined): string | null {
  const raw = decodeHtml((input ?? "").trim());
  if (!raw) return null;

  const iframeSrc = raw.match(/<iframe\b[^>]*\ssrc=["']([^"']+)["']/i)?.[1];
  const candidate = (iframeSrc ?? raw).trim();

  try {
    const url = new URL(candidate);
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return VIDEO_ID.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v") ?? "";
        return VIDEO_ID.test(id) ? id : null;
      }
      const match = url.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/);
      if (match) return match[2];
    }
  } catch {
    return null;
  }

  return null;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/** Plays at the top of Ventura article banners and in the partner API body. */
export const ARTICLE_BANNER_VIDEO_ID = "dWnKpsjNLdU";
export const ARTICLE_BANNER_VIDEO_URL =
  "https://www.youtube.com/watch?v=dWnKpsjNLdU";

const BANNER_VIDEO_MARKER = 'data-kindjoe-banner-video="1"';

export function articleBannerVideoHtml(): string {
  return `<div ${BANNER_VIDEO_MARKER} style="margin:0 0 1.25rem;position:relative;width:100%;aspect-ratio:16/9;"><iframe src="${youtubeEmbedUrl(ARTICLE_BANNER_VIDEO_ID)}" title="Video" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
}

export function prependArticleBannerVideo(html: string | null | undefined): string {
  const body = html?.trim() ?? "";
  if (body.includes(BANNER_VIDEO_MARKER) || body.includes(ARTICLE_BANNER_VIDEO_ID)) {
    return body;
  }
  const video = articleBannerVideoHtml();
  return body ? `${video}\n${body}` : video;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeEmbedHtml(videoId: string): string {
  return `<div class="my-4 aspect-video not-prose"><iframe src="${youtubeEmbedUrl(videoId)}" title="YouTube video" class="h-full w-full rounded-xl border" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
}

/** Turn a paragraph that is only a YouTube link into a playable embed. */
export function embedYouTubeLinksInHtml(html: string): string {
  return html.replace(/<p>([\s\S]*?)<\/p>/gi, (match, inner: string) => {
    const anchor = inner.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>/i);
    const withoutAnchor = inner.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, "").trim();
    const plain = decodeHtml(inner.replace(/<[^>]+>/g, "")).trim();
    const candidate = anchor
      ? withoutAnchor.length === 0
        ? decodeHtml(anchor[1])
        : ""
      : /^https?:\/\/\S+$/i.test(plain)
        ? plain
        : "";
    const videoId = getYouTubeId(candidate);
    return videoId ? youtubeEmbedHtml(videoId) : match;
  });
}

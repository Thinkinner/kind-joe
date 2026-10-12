const UPLOAD_SEGMENT = "/upload/";

export const ARTICLE_HERO_TRANSFORM =
  "c_fill,g_auto,w_1600,h_900,f_auto,q_auto";
export const ARTICLE_TILE_TRANSFORM =
  "c_fill,g_auto,w_800,h_800,f_auto,q_auto";

/** Insert a Cloudinary transform after `/upload/` on a secure delivery URL. */
export function withCloudinaryTransform(
  secureUrl: string,
  transform: string,
): string {
  const url = secureUrl.trim();
  const idx = url.indexOf(UPLOAD_SEGMENT);
  if (idx === -1) return url;
  const cut = idx + UPLOAD_SEGMENT.length;
  return `${url.slice(0, cut)}${transform}/${url.slice(cut)}`;
}

export function articleImageUrls(secureUrl: string): {
  originalUrl: string;
  coverImageUrl: string;
  postCard: { imageUrl: string };
} {
  const originalUrl = secureUrl.trim();
  return {
    originalUrl,
    coverImageUrl: withCloudinaryTransform(originalUrl, ARTICLE_HERO_TRANSFORM),
    postCard: {
      imageUrl: withCloudinaryTransform(originalUrl, ARTICLE_TILE_TRANSFORM),
    },
  };
}

export function isOurCloudinaryUrl(rawUrl: string, cloudName: string): boolean {
  const cloud = cloudName.trim();
  if (!cloud) return false;
  try {
    const url = new URL(rawUrl);
    return (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.startsWith(`/${cloud}/`)
    );
  } catch {
    return false;
  }
}

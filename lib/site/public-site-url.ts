/** Canonical public origin with no trailing slash (for sitemap, robots, RSS). */
export function publicSiteOrigin(
  raw = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.kindjoe.com",
): string {
  return raw.trim().replace(/\/+$/, "") || "https://www.kindjoe.com";
}

/** Join origin + path without double slashes. */
export function publicSiteUrl(path: string, origin?: string): string {
  const base = origin ?? publicSiteOrigin();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

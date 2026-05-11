import Link from "next/link";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/legal/public-contact";

type MaybeDate = Date | string | null | undefined;

type ArticleTransparencyPanelProps = {
  publishedAt: MaybeDate;
  publishAt: MaybeDate;
  createdAt: MaybeDate;
  updatedAt: MaybeDate;
  seo: unknown;
  contentHtml?: string | null;
  content?: unknown;
  sourceLinkClassName?: string;
};

const MIN_UPDATE_DELTA_MS = 5 * 60 * 1000;
const MAX_SOURCES = 8;
const INTERNAL_HOST_PATTERNS = ["kindjoe.com", "localhost"];

function parseDate(value: MaybeDate): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: MaybeDate): string {
  const date = parseDate(value);
  if (!date) return "Unknown date";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function extractUrlsFromText(input: string): string[] {
  if (!input) return [];
  const matches = input.match(/https?:\/\/[^\s"'<>)\]]+/gi);
  return matches ?? [];
}

function normalizeExternalUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (INTERNAL_HOST_PATTERNS.some((host) => parsed.hostname.includes(host))) {
      return null;
    }
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(
      (key) => parsed.searchParams.delete(key),
    );
    parsed.hash = "";
    const normalized = parsed.toString();
    return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  } catch {
    return null;
  }
}

function extractSeoSourceUrls(seo: unknown): string[] {
  if (!seo || typeof seo !== "object" || Array.isArray(seo)) return [];
  const record = seo as Record<string, unknown>;
  const urls: string[] = [];
  const knownFields = [
    "sourceUrl",
    "canonicalSourceUrl",
    "sourceLink",
    "source",
  ] as const;

  for (const field of knownFields) {
    const value = record[field];
    if (typeof value === "string") urls.push(value);
  }

  const sources = record.sources;
  if (Array.isArray(sources)) {
    for (const source of sources) {
      if (typeof source === "string") {
        urls.push(source);
        continue;
      }
      if (source && typeof source === "object") {
        const maybeUrl = (source as Record<string, unknown>).url;
        if (typeof maybeUrl === "string") urls.push(maybeUrl);
      }
    }
  }

  return urls;
}

function toSourceLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname;
  } catch {
    return "External source";
  }
}

export default function ArticleTransparencyPanel({
  publishedAt,
  publishAt,
  createdAt,
  updatedAt,
  seo,
  contentHtml,
  content,
  sourceLinkClassName = "text-red-600 hover:underline",
}: ArticleTransparencyPanelProps) {
  const publishedReference = parseDate(publishedAt) ?? parseDate(publishAt) ?? parseDate(createdAt);
  const updatedReference = parseDate(updatedAt);
  const wasMeaningfullyUpdated = Boolean(
    publishedReference &&
      updatedReference &&
      updatedReference.getTime() - publishedReference.getTime() > MIN_UPDATE_DELTA_MS,
  );

  const textCandidates = [
    ...(contentHtml ? extractUrlsFromText(contentHtml) : []),
    ...extractUrlsFromText(JSON.stringify(content ?? {})),
    ...extractSeoSourceUrls(seo),
  ];

  const seen = new Set<string>();
  const sourceUrls = textCandidates
    .map(normalizeExternalUrl)
    .filter((value): value is string => Boolean(value))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .slice(0, MAX_SOURCES);

  return (
    <section className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-800">
        Transparency notes
      </h2>

      <p className="mt-2 text-sm text-neutral-700">
        Published: {formatDate(publishedReference)}.{" "}
        {wasMeaningfullyUpdated
          ? `Last updated: ${formatDate(updatedReference)}.`
          : "No major post-publication update has been logged."}
      </p>

      <p className="mt-2 text-sm text-neutral-700">
        Spot an error or missing context? Email{" "}
        <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className={sourceLinkClassName}>
          {PUBLIC_CONTACT_EMAIL}
        </a>{" "}
        and we will review and correct if needed.
      </p>

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-700">
          Sources
        </h3>
        {sourceUrls.length ? (
          <ul className="mt-2 space-y-1.5 text-sm text-neutral-700">
            {sourceUrls.map((url) => (
              <li key={url} className="break-all">
                <span className="mr-1 text-neutral-500">-</span>
                <Link href={url} target="_blank" rel="noopener noreferrer" className={sourceLinkClassName}>
                  {toSourceLabel(url)}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-neutral-600">
            External source links were not provided in this article body. Our editors reference publicly available materials and update stories as new verified information arrives.
          </p>
        )}
      </div>
    </section>
  );
}

"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  markdownToPlainText,
  normalizeSignalBodyText,
} from "@/lib/signals/signal-enrichment";

function isImageUrl(url: string): boolean {
  const base = url.split("?")[0]?.toLowerCase() ?? "";
  return (
    /\.(jpe?g|png|gif|webp|avif)(\b|$)/i.test(base) ||
    base.includes("pbs.twimg.com/media") ||
    base.includes("twimg.com/media")
  );
}

/** Normalize URLs so article card + body can dedupe the same link. */
export function normalizeUrlForLinkDedupe(href: string): string | null {
  try {
    const cleaned = href.trim().replace(/[),.;!?]+$/g, "");
    const u = new URL(cleaned);
    u.hash = "";
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return `${u.protocol}//${host}${path}${u.search}`;
  } catch {
    return null;
  }
}

/**
 * After `normalizeSignalBodyText`: drop article-style links from the string so feed cards
 * show prose + `SignalMediaPreview` only (no URL line, no link chrome).
 */
export function stripHttpUrlsFromNormalizedBody(normalized: string): string {
  let t = normalized;
  t = t.replace(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/gi, (_, alt: string) =>
    (alt ?? "").trim(),
  );
  t = t.replace(/\[([^\]]*)\]\((https?:[^)\s]+)\)/gi, "$1");
  t = t.replace(/https?:\/\/[^\s<>"')\]]+/gi, "");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[ \t]{2,}/g, " ");
  return t
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function buildSuppressedSet(urls: string[] | undefined): Set<string> {
  const set = new Set<string>();
  if (!urls?.length) return set;
  for (const u of urls) {
    const n = normalizeUrlForLinkDedupe(u);
    if (n) set.add(n);
  }
  return set;
}

function isHrefSuppressed(href: string, suppressed: Set<string>): boolean {
  const key = normalizeUrlForLinkDedupe(href);
  return key != null && suppressed.has(key);
}

/** Collapsed list rows: readable plain text, no raw markdown. */
export function markdownToPlainPreview(raw: string): string {
  return markdownToPlainText(raw);
}

function markdownToLinkAwarePreview(raw: string): string {
  return raw
    .replace(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/g, " $2 ")
    .replace(/\[([^\]]*)\]\((https?:[^)\s]+)\)/g, "$1 $2");
}

function RichTextImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote signal media URLs (Twitter/CDN), not in next.config images
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setVisible(false)}
    />
  );
}

function buildCompactNodes(
  text: string,
  isLight: boolean,
  suppressed: Set<string>,
): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  const re = /https?:\/\/[^\s)]+/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push(
        <span key={`ct-${k++}`} className="whitespace-pre-wrap break-words">
          {text.slice(last, m.index)}
        </span>,
      );
    }
    const href = m[0];
    if (isHrefSuppressed(href, suppressed)) {
      out.push(
        <span
          key={`cs-${k++}`}
          className={cn(
            "break-all font-medium",
            isLight ? "text-slate-600" : "text-gray-500",
          )}
        >
          {href}
        </span>,
      );
    } else {
      out.push(
        <a
          key={`ca-${k++}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "break-all font-semibold underline decoration-current/35 underline-offset-[3px] transition-colors",
            isLight ? "text-sky-700 hover:text-sky-900" : "text-sky-300 hover:text-sky-100",
          )}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {href}
        </a>,
      );
    }
    last = m.index + href.length;
  }

  if (last < text.length) {
    out.push(
      <span key={`ct-${k++}`} className="whitespace-pre-wrap break-words">
        {text.slice(last)}
      </span>,
    );
  }

  if (out.length === 0) {
    out.push(
      <span key="ct-final" className="whitespace-pre-wrap break-words">
        {text}
      </span>,
    );
  }

  return out;
}

function buildRichNodes(
  text: string,
  isLight: boolean,
  suppressed: Set<string>,
): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  const re =
    /!\[([^\]]*)\]\((https?:[^)\s]+)\)|\[([^\]]*)\]\((https?:[^)\s]+)\)/g;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push(
        <span key={`t-${k++}`} className="whitespace-pre-wrap break-words">
          {text.slice(last, m.index)}
        </span>,
      );
    }
    const full = m[0];
    if (full.startsWith("!")) {
      const alt = m[1] ?? "";
      const src = m[2]!;
      out.push(
        <RichTextImage
          key={`i-${k++}`}
          src={src}
          alt={alt.trim() || "Signal image"}
          className={cn(
            "max-h-56 w-full rounded-md border object-cover",
            isLight ? "border-slate-200" : "border-white/10",
          )}
        />,
      );
    } else {
      const label = m[3] ?? "";
      const href = m[4]!;
      if (isImageUrl(href)) {
        out.push(
          <RichTextImage
            key={`i-${k++}`}
            src={href}
            alt={label.trim() || "Signal image"}
            className={cn(
              "max-h-56 w-full rounded-md border object-cover",
              isLight ? "border-slate-200" : "border-white/10",
            )}
          />,
        );
      } else if (isHrefSuppressed(href, suppressed)) {
        out.push(
          <span
            key={`s-${k++}`}
            className={cn(
              "break-words font-medium",
              isLight ? "text-slate-700" : "text-gray-400",
            )}
          >
            {label.trim() || href}
          </span>,
        );
      } else {
        out.push(
          <a
            key={`a-${k++}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "break-words font-medium underline decoration-current/35 underline-offset-[3px] transition-colors",
              isLight
                ? "text-sky-700 hover:text-sky-900"
                : "text-sky-300 hover:text-sky-100",
            )}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {label.trim() || "Open link"}
          </a>,
        );
      }
    }
    last = m.index + full.length;
  }
  if (last < text.length) {
    out.push(
      <span key={`t-${k++}`} className="whitespace-pre-wrap break-words">
        {text.slice(last)}
      </span>,
    );
  }
  return out;
}

type SignalRichTextProps = {
  text: string;
  isLight: boolean;
  /** When true, strip markdown for line-clamped previews (no embedded images). */
  compact?: boolean;
  className?: string;
  /** Href strings (e.g. article card URL) whose links are shown once elsewhere — body shows plain text instead. */
  suppressLinkHrefs?: string[];
  /**
   * Feed-style: remove bare `https://…` tokens and reduce `[text](url)` to `text` only
   * (no clickable links or raw URLs in the body).
   */
  omitHttpUrls?: boolean;
};

export function SignalRichText({
  text,
  isLight,
  compact = false,
  className,
  suppressLinkHrefs,
  omitHttpUrls = false,
}: SignalRichTextProps) {
  const normalized = useMemo(() => {
    const base = normalizeSignalBodyText(text);
    return omitHttpUrls ? stripHttpUrlsFromNormalizedBody(base) : base;
  }, [text, omitHttpUrls]);
  const suppressed = useMemo(
    () => buildSuppressedSet(suppressLinkHrefs),
    [suppressLinkHrefs],
  );

  const body = useMemo(() => {
    if (compact) {
      const preview = markdownToLinkAwarePreview(normalized);
      return (
        <>
          {buildCompactNodes(markdownToPlainPreview(preview), isLight, suppressed)}
        </>
      );
    }
    const nodes = buildRichNodes(normalized, isLight, suppressed);
    if (nodes.length === 0) {
      return (
        <span className="whitespace-pre-wrap break-words">{normalized}</span>
      );
    }
    return <>{nodes}</>;
  }, [compact, normalized, isLight, suppressed]);

  return (
    <div
      className={cn(
        compact ? undefined : "space-y-2",
        "font-sans tracking-normal",
        className,
      )}
    >
      {body}
    </div>
  );
}

/** Headlines: strip accidental markdown, keep one line feel. */
export function signalHeadlinePlain(raw: string): string {
  return markdownToPlainPreview(raw).replace(/\s+/g, " ").trim();
}

/** Feed headline row: plain text, no raw URLs (matches `omitHttpUrls` body). */
export function signalFeedHeadlinePlain(raw: string): string {
  const n = normalizeSignalBodyText(raw);
  const stripped = stripHttpUrlsFromNormalizedBody(n);
  return markdownToPlainPreview(stripped).replace(/\s+/g, " ").trim();
}

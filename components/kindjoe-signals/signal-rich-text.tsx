"use client";

import { useMemo, type ReactNode } from "react";
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

/** Collapsed list rows: readable plain text, no raw markdown. */
export function markdownToPlainPreview(raw: string): string {
  return markdownToPlainText(raw);
}

function buildRichNodes(text: string, isLight: boolean): ReactNode[] {
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
        // eslint-disable-next-line @next/next/no-img-element -- remote signal media URLs (Twitter/CDN), not in next.config images
        <img
          key={`i-${k++}`}
          src={src}
          alt={alt.trim() || "Signal image"}
          className={cn(
            "max-h-56 w-full rounded-md border object-cover",
            isLight ? "border-slate-200" : "border-white/10",
          )}
          loading="lazy"
          referrerPolicy="no-referrer"
        />,
      );
    } else {
      const label = m[3] ?? "";
      const href = m[4]!;
      if (isImageUrl(href)) {
        out.push(
          // eslint-disable-next-line @next/next/no-img-element -- remote signal media URLs
          <img
            key={`i-${k++}`}
            src={href}
            alt={label.trim() || "Signal image"}
            className={cn(
              "max-h-56 w-full rounded-md border object-cover",
              isLight ? "border-slate-200" : "border-white/10",
            )}
            loading="lazy"
            referrerPolicy="no-referrer"
          />,
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
};

export function SignalRichText({
  text,
  isLight,
  compact = false,
  className,
}: SignalRichTextProps) {
  const normalized = useMemo(() => normalizeSignalBodyText(text), [text]);

  const body = useMemo(() => {
    if (compact) {
      return (
        <span className="whitespace-pre-wrap break-words">
          {markdownToPlainPreview(normalized)}
        </span>
      );
    }
    const nodes = buildRichNodes(normalized, isLight);
    if (nodes.length === 0) {
      return (
        <span className="whitespace-pre-wrap break-words">{normalized}</span>
      );
    }
    return <>{nodes}</>;
  }, [compact, normalized, isLight]);

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

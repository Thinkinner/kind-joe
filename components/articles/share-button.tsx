"use client";

import * as React from "react";
import {
  Share2,
  Twitter,
  Facebook,
  Linkedin,
  Link as LinkIcon,
  Check,
} from "lucide-react";

type Size = "sm" | "md";
type Layout = "horizontal" | "vertical";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function openPopup(url: string) {
  const w = 640;
  const h = 640;
  const y = window.top?.outerHeight
    ? Math.max(0, (window.top.outerHeight - h) / 2)
    : 24;
  const x = window.top?.outerWidth
    ? Math.max(0, (window.top.outerWidth - w) / 2)
    : 24;
  window.open(
    url,
    "_blank",
    `toolbar=0,status=0,width=${w},height=${h},top=${y},left=${x}`
  );
}

function buildShareUrls(title: string, url: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };
}

export default function ShareButtons({
  title,
  url,
  className,
  size = "md",
  layout = "horizontal",
}: {
  title: string;
  url?: string; // will fall back to current location
  className?: string;
  size?: Size;
  layout?: Layout;
}) {
  const [copied, setCopied] = React.useState(false);
  const resolvedUrl =
    url ||
    (typeof window !== "undefined" ? window.location.href : "https://");

  const shareUrls = React.useMemo(
    () => buildShareUrls(title, resolvedUrl),
    [title, resolvedUrl]
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(resolvedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // noop
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: resolvedUrl });
      } catch {
        // user cancelled; ignore
      }
    } else {
      copyLink();
    }
  }

  const baseBtn =
    "inline-flex items-center justify-center rounded-full border bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors";
  const spacing = size === "sm" ? "p-2" : "p-2.5";
  const iconSize = size === "sm" ? 16 : 18;

  return (
    <div
      className={cx(
        "flex",
        layout === "vertical" ? "flex-col" : "flex-row",
        "gap-2",
        className
      )}
    >
      <button
        aria-label="Share"
        onClick={nativeShare}
        className={cx(baseBtn, spacing)}
        title="Share"
      >
        <Share2 size={iconSize} />
      </button>
      <button
        aria-label="Share on X"
        onClick={() => openPopup(shareUrls.twitter)}
        className={cx(baseBtn, spacing)}
        title="Share on X"
      >
        <Twitter size={iconSize} />
      </button>
      <button
        aria-label="Share on Facebook"
        onClick={() => openPopup(shareUrls.facebook)}
        className={cx(baseBtn, spacing)}
        title="Share on Facebook"
      >
        <Facebook size={iconSize} />
      </button>
      <button
        aria-label="Share on LinkedIn"
        onClick={() => openPopup(shareUrls.linkedin)}
        className={cx(baseBtn, spacing)}
        title="Share on LinkedIn"
      >
        <Linkedin size={iconSize} />
      </button>
      <button
        aria-label="Copy link"
        onClick={copyLink}
        className={cx(baseBtn, spacing)}
        title="Copy link"
      >
        {copied ? <Check size={iconSize} /> : <LinkIcon size={iconSize} />}
      </button>
    </div>
  );
}

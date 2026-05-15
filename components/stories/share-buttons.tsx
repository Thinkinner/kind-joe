"use client";

import { FaFacebookF, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { useEffect, useState } from "react";
import { Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

type ShareButtonsProps = {
  className?: string;
  showLabel?: boolean;
  label?: string;
  url?: string;
};

export default function ShareButtons({
  className = "",
  showLabel = true,
  label = "Share",
  url,
}: ShareButtonsProps) {
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const shareUrl = url ?? currentUrl;

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      {showLabel ? (
        <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {label}
        </span>
      ) : null}

      {/* Facebook */}
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          shareUrl
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-[#3b5998] transition hover:border-neutral-300 hover:bg-neutral-50"
      >
        <FaFacebookF className="h-4 w-4" />
      </a>

      {/* Twitter/X */}
      <a
        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
          shareUrl
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-black transition hover:border-neutral-300 hover:bg-neutral-50"
      >
        <FaXTwitter className="h-4 w-4" />
      </a>

      {/* LinkedIn */}
      <a
        href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
          shareUrl
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-[#0077b5] transition hover:border-neutral-300 hover:bg-neutral-50"
      >
        <FaLinkedinIn className="h-4 w-4" />
      </a>
      <button
        type="button"
        onClick={() => void copyLink()}
        aria-label="Copy article link"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
      >
        <LinkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

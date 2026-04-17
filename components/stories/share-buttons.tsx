"use client";

import { FaFacebookF, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { useEffect, useState } from "react";

type ShareButtonsProps = {
  className?: string;
  showLabel?: boolean;
  label?: string;
};

export default function ShareButtons({
  className = "",
  showLabel = true,
  label = "Share",
}: ShareButtonsProps) {
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

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
          currentUrl
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className="h-9 w-9 flex items-center justify-center rounded-full bg-[#3b5998] text-white hover:opacity-90 transition"
      >
        <FaFacebookF className="h-4 w-4" />
      </a>

      {/* Twitter/X */}
      <a
        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
          currentUrl
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        className="h-9 w-9 flex items-center justify-center rounded-full bg-black text-white hover:opacity-90 transition"
      >
        <FaXTwitter className="h-4 w-4" />
      </a>

      {/* LinkedIn */}
      <a
        href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
          currentUrl
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
        className="h-9 w-9 flex items-center justify-center rounded-full bg-[#0077b5] text-white hover:opacity-90 transition"
      >
        <FaLinkedinIn className="h-4 w-4" />
      </a>
    </div>
  );
}

"use client";

import { FaFacebookF, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { useEffect, useState } from "react";

export default function ShareButtons() {
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  return (
    <div className="mt-4 flex items-center gap-3">
      <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Share
      </span>

      {/* Facebook */}
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          currentUrl
        )}`}
        target="_blank"
        rel="noopener noreferrer"
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
        className="h-9 w-9 flex items-center justify-center rounded-full bg-[#0077b5] text-white hover:opacity-90 transition"
      >
        <FaLinkedinIn className="h-4 w-4" />
      </a>
    </div>
  );
}

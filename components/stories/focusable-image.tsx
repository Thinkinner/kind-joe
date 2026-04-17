"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type FocusableImageProps = {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
};

export default function FocusableImage({
  src,
  alt,
  caption,
  className = "",
}: FocusableImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`block w-full text-left ${className}`.trim()}
        aria-label="Open image in focus mode"
      >
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] bg-black/95 p-4 sm:p-6"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Focused image view"
        >
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Close focused image"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex h-full w-full items-center justify-center">
            <img
              src={src}
              alt={alt}
              className="max-h-[88vh] w-auto max-w-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </div>

          {caption ? (
            <p className="pointer-events-none absolute bottom-4 left-4 right-4 text-center text-[11px] font-medium uppercase tracking-wide text-white/70">
              {caption}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

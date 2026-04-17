"use client";

type ScrollToArticleCtaProps = {
  targetId?: string;
  label?: string;
  className?: string;
};

export function ScrollToArticleCta({
  targetId = "article-content",
  label = "Jump to article",
  className = "",
}: ScrollToArticleCtaProps) {
  return (
    <button
      type="button"
      onClick={() => {
        const target = document.getElementById(targetId);
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      className={`inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-400 hover:bg-neutral-50 ${className}`.trim()}
    >
      {label}
    </button>
  );
}

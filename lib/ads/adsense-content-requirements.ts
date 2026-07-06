/** Shared AdSense-oriented content baselines for admin writing tools. */

export const ADSENSE_MIN_WORDS = 600;
export const ADSENSE_MIN_EXCERPT_WORDS = 12;
export const ADSENSE_META_MIN = 70;
export const ADSENSE_META_TARGET_MIN = 110;
export const ADSENSE_META_TARGET_MAX = 160;
export const ADSENSE_MIN_TAGS = 4;
export const ADSENSE_MIN_ATTRIBUTION_MENTIONS = 3;
export const ADSENSE_MIN_DIRECT_QUOTES = 2;

export type AdsenseChecklistItem = {
  id: string;
  label: string;
  detail: string;
};

export const ADSENSE_WRITING_CHECKLIST: AdsenseChecklistItem[] = [
  {
    id: "original",
    label: "Original, substantive article",
    detail: "600+ words of unique reporting — not copied text, link lists, or thin summaries.",
  },
  {
    id: "sources",
    label: "Verified sources with attribution",
    detail: "Credit outlets by name. Inline links only to verified source URLs from research.",
  },
  {
    id: "quotes",
    label: "Named direct quotes",
    detail: "At least 2 attributed quotes from sources when the story supports them.",
  },
  {
    id: "balance",
    label: "Fair context",
    detail: "Include opposing or defense context where relevant — avoid one-sided advocacy.",
  },
  {
    id: "meta",
    label: "Publish-ready meta",
    detail: "Meta description 110–160 characters; strong excerpt; cover image before publish.",
  },
  {
    id: "policy",
    label: "AdSense policy alignment",
    detail: "No clickbait, no misleading claims, no prohibited content. Human review before publish.",
  },
];

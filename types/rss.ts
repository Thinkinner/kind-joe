// lib/rss/types.ts
export type StockItem = {
  label: string;
  changePct: number;
};

export type FeedCard = {
  id: string;
  title: string;
  url?: string;
  image?: string;
  source?: string;
  publishedAt?: string;
  accent?: "blue" | "red" | "default";
  size?: "lg" | "md" | "sm";
  dek?: string;
};

export type ColumnData = {
  hero?: FeedCard;
  blocks?: FeedCard[];
  bulletsTop?: string[];
  bulletsBottom?: string[];
  bullets?: string[]; // optional fallback
};

export type RssLink = {
  label: string;
  href: string;
};
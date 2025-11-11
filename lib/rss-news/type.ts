// components/rss-news/types.ts
export type LinkItem = { title: string; href: string };
export type CardMain = {
  title: string;
  href: string;
  imageUrl?: string | null;
  sourceName: string;
};
export type CardGroup = { main: CardMain; links: LinkItem[] };

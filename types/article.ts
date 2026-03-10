// Shared types for news UI
export type Article = {
  id: string | number;
  title: string;
  category?: string;
  imageSrc?: string;
  href?: string;
  date?: string;
  readTime?: string;
  featured?: boolean;
  author?: string;
};


export type ArticleSummary = {
  tags: any;
  category: string;
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  readingMinutes: number | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
};

export type TopStory = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  publishAt: string | null;
  createdAt: string;
  readingMinutes: number | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
};

// for the slideshow in the rss feed
export type ApiStory = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  publishAt: string | null;
  createdAt: string;
  readingMinutes: number | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
};

export type StoryCard = {
  id: string;
  title: string;
  imageSrc: string;
  href: string;
};

export interface ArticleCard {
  headline: string;
  date: string;
  category: string;
  imageUrl: string;
  summary?: string;
  url: string;
  id: string;
}

export interface SocialProfile {
  id: string;
  handle: string;
  platform: string;
  description: string;
  avatarUrl: string;
}

export interface NewsData {
  mainArticles: Article[];
  sidebarArticles: Article[];
}

export interface Author {
  name: string;
  avatarUrl: string;
}
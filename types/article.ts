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

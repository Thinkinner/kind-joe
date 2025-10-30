export type Article = {
  id: string | number;
  title: string;
  category?: string;
  imageSrc?: string;
  href?: string;
  date?: string;
  readTime?: string;
  featured?: boolean;
};

export type NewsPayload = {
  featured?: Article; // optional single featured article
  articles: Article[]; // list of small articles
};

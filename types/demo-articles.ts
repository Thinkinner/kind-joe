export type ArticleBlock =
  | { type: "kicker"; text: string }
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; style?: "ordered" | "unordered"; items: string[] }
  | { type: "quote"; text: string; cite?: string }
  | {
      type: "image";
      src: string;
      alt?: string;
      caption?: string;
      width?: number;
      height?: number;
    }
  | {
      type: "cta";
      title?: string;
      body?: string;
      buttonLabel?: string;
    };

export interface ArticleData {
  slug: string; // ✅ Add this line
  title: string;
  dek?: string;
  image: string;
  date?: string;
  tags?: string[];

  coverImage?: {
    src: string;
    alt?: string;
    height?: number; // px height of hero
  };

  content: ArticleBlock[];
}
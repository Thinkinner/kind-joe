export interface RssSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface RawRssItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  content: string;
  imageUrl?: string;
  sourceName: string;
}

export interface NewsletterStory {
  slotName: string;
  category?: string;
  headline: string;
  summary: string;
  imageUrl: string;
  sourceUrl: string;
  sourceName: string;
  slug?: string;
}

export interface NewsletterData {
  title: string;
  date: string;
  intro: string;
  stories: NewsletterStory[];
  signOff: string;
}

export interface PersonalizationConfig {
  contentStrategy: string;
  writingStyle: string;
  exampleContent: string;
}

export enum GenerationStatus {
  IDLE = "IDLE",
  FETCHING_RSS = "FETCHING_RSS",
  PROCESSING_AI = "PROCESSING_AI",
  UPLOADING_IMAGES = "UPLOADING_IMAGES",
  COMPLETED = "COMPLETED",
  ERROR = "ERROR",
}

export type DraftStatus = "draft" | "approved" | "sent";

export interface NewsletterDraft {
  id: string;
  createdAt: number;
  status: DraftStatus;
  data: NewsletterData;
  articles?: DbArticle[];
  /** In-memory only (not persisted). */
  sourcePool?: RawRssItem[];
}

export interface AppSettings {
  webhookUrl: string;
  authorId: string;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  cloudinaryUploadPreset?: string;
  ghlApiKey?: string;
  ghlLocationId?: string;
  gcsBucketName?: string;
  gcsProjectId?: string;
  gcsClientEmail?: string;
  gcsPrivateKey?: string;
}

export interface DbArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  category: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  publishAt: string | null;
  publishedBy: string | null;
  deletedAt: string | null;
  readingMinutes: number;
  isDraft: boolean;
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  content?: unknown;
  contentMarkdown: string;
  contentHtml?: string;
}

export interface WebhookPayload {
  newsletter: {
    subject: string;
    html: string;
    data: NewsletterData;
  };
  articles: DbArticle[];
  [key: string]: unknown;
}

export interface GhlContact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dnd?: boolean;
  tags: string[];
  dateAdded?: string;
}

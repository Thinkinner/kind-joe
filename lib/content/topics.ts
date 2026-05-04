export const TOPIC_SLUGS = ["tech", "politics", "business", "opinion"] as const;

export type TopicSlug = (typeof TOPIC_SLUGS)[number];

export const TOPIC_LABELS: Record<TopicSlug, string> = {
  tech: "Tech",
  politics: "Politics",
  business: "Business",
  opinion: "Opinion",
};

"use client";

import dynamic from "next/dynamic";
import type { NewsletterDraft } from "@/lib/(newsletter-automations)/types";

const NewsletterHistoryReviewClient = dynamic(
  () =>
    import(
      "@/components/(newsletter-automations)/newsletter-history-review-client"
    ).then((mod) => mod.NewsletterHistoryReviewClient),
  { ssr: false },
);

export default function ReviewClientShell({
  initialDraft,
}: {
  initialDraft: NewsletterDraft;
}) {
  return <NewsletterHistoryReviewClient initialDraft={initialDraft} />;
}

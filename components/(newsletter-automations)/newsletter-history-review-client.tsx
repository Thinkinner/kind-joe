"use client";

import { useRouter } from "next/navigation";
import ReviewEditor from "@/components/(newsletter-automations)/review-editor";
import type { NewsletterDraft } from "@/lib/(newsletter-automations)/types";

export function NewsletterHistoryReviewClient({
  initialDraft,
}: {
  initialDraft: NewsletterDraft;
}) {
  const router = useRouter();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ReviewEditor
        draft={initialDraft}
        onBack={() => router.push("/admin/newsletter")}
        onUpdate={() => {
          router.push("/admin/newsletter");
          router.refresh();
        }}
      />
    </div>
  );
}

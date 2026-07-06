import { ContentResearchWriter } from "@/components/admin/cms/content-research-writer";
import { ADSENSE_MIN_WORDS } from "@/lib/ads/adsense-content-requirements";

export default function ContentResearchPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              AI Research Writer
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              Content Research
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Paste a topic, notes, or links. A background worker on Railway researches
              verified sources, writes an original {ADSENSE_MIN_WORDS}+ word draft, and
              opens the article editor when ready — no Vercel timeout.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
            <p className="font-semibold">Monetization-ready flow</p>
            <p className="mt-1">
              Research → draft → human review → publish for AdSense inventory
            </p>
          </div>
        </div>
      </section>

      <ContentResearchWriter />
    </div>
  );
}

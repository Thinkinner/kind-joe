// app/[slug]/page.tsx
import { notFound, redirect } from "next/navigation"; // Added redirect
import { Metadata } from "next";
import { DM_Sans } from "next/font/google";

// Actions
import {
  getFullArticleBySlug,
  getArticleCategories,
  getRecommendedArticles,
} from "@/lib/actions/articles";
import { getPredictionMarketById } from "@/lib/predictions/queries";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";

// Components
import ArticleContent from "@/components/stories/article-single-page-content";
import ShareButtons from "@/components/stories/share-buttons";
import GetEmail from "@/components/stories/kindjoe-get-email";
import FocusableImage from "@/components/stories/focusable-image";
import ArticleTracker from "@/components/article-tracker";
import { formatToLA } from "@/lib/format-date";
import { RecommendedCard } from "@/components/cards/recommended-card";
import BreakingLiveNewsCta from "@/components/stories/breaking-live-news-cta";
import { ArticlePredictionCta } from "@/components/stories/article-prediction-cta";
import { ScrollToArticleCta } from "@/components/stories/scroll-to-article-cta";

export const revalidate = 60;

const googleSans = DM_Sans({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-google-sans",
  display: "swap",
});

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getFullArticleBySlug(slug);

  if (!data) return {};
  const { article: a } = data;

  const seoRaw: unknown = typeof a.seo === "string" ? JSON.parse(a.seo) : a.seo;
  const seo =
    seoRaw && typeof seoRaw === "object"
      ? (seoRaw as { title?: string; description?: string; canonical?: string })
      : {};
  const title = seo?.title || a.title;
  const description = seo?.description || a.excerpt || undefined;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.kindjoe.com";
  const canonicalUrl = seo?.canonical || `${siteUrl}/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: a.coverImageUrl ? [a.coverImageUrl] : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: a.coverImageUrl ? [a.coverImageUrl] : [],
    },
  };
}

export default async function ArticleBySlug(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  // 1. Fetch Primary Data
  const data = await getFullArticleBySlug(slug);
  if (!data) notFound();

  const { article: a, tags } = data;
  const session = await getServerSession();
  const user = session?.user as AuthAppUser | undefined;
  const viewerId = user?.id ?? null;

  // 2. 🧠 SMART REDIRECT LOGIC
  // Check if article has the "ventura-county" tag
  const hasVenturaTag = tags.some((t) => t.slug === "ventura-county");

  if (hasVenturaTag) {
    // If it has the tag, this article doesn't belong on the KindJoe layout
    redirect(`/ventura/${slug}`);
  }

  // 3. Parallel fetch remaining data if we are staying on this page
  const [cats, recommended] = await Promise.all([
    getArticleCategories(a.id),
    getRecommendedArticles(a.id, a.category, 5),
  ]);
  const linkedPrediction =
    typeof a.predictionId === "number" && Number.isFinite(a.predictionId)
      ? await getPredictionMarketById(a.predictionId, viewerId)
      : null;
  const seoRaw: unknown = typeof a.seo === "string" ? JSON.parse(a.seo) : a.seo;
  const seo =
    seoRaw && typeof seoRaw === "object"
      ? (seoRaw as { authorName?: string; bylineSource?: string })
      : {};
  const bylineAlias =
    seo.bylineSource === "alias" ? (seo.authorName?.trim() ?? "") : "";
  const useAliasByline = bylineAlias.length > 0;
  const publisherName = useAliasByline ? bylineAlias : "KindJoe";
  const publisherInitials = publisherName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "KJ";

  const content =
    typeof a.content === "string" ? JSON.parse(a.content) : a.content;

  return (
    <main className={`py-8 ${googleSans.variable}`}>
      <ArticleTracker articleId={a.id} />
      <div className="mx-auto max-w-6xl lg:px-4">
        <BreakingLiveNewsCta />
        <div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(260px,1.4fr)] lg:gap-8">
          <article className="lg:pb-8">
            <header className="px-4 lg:px-6 pt-4 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-wide text-neutral-500">
                <div className="flex flex-wrap items-center gap-2">
                  {cats.length > 0 && (
                    <span className="bg-red-600 text-white px-2 py-0.5 font-semibold">
                      {cats[0].name}
                    </span>
                  )}
                </div>
              </div>

              <h1 className="mt-4 text-2xl lg:text-[36px] font-extrabold leading-tight tracking-tight text-neutral-900">
                {a.title}
              </h1>

              <div className="mt-6 border-y border-neutral-200 py-4 sm:py-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 flex-shrink-0">
                        {useAliasByline ? (
                          <div
                            aria-label={publisherName}
                            className="flex h-full w-full items-center justify-center rounded-full bg-neutral-900 text-sm font-bold tracking-wide text-white ring-2 ring-white shadow-sm"
                          >
                            {publisherInitials}
                          </div>
                        ) : (
                          <img
                            src="/brand/kindjoe-profile.jpg"
                            alt="KindJoe"
                            className="h-full w-full rounded-full object-cover ring-2 ring-white shadow-sm"
                          />
                        )}
                        {/* Verification Badge */}
                        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white ring-2 ring-white">
                          <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-3 h-3"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-neutral-900 leading-none">
                          {publisherName}
                        </span>
                        <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 font-medium">
                          <span>Official Publisher</span>
                          <span className="h-1 w-1 rounded-full bg-neutral-300"></span>
                          <time className="text-neutral-700 font-semibold">
                            {formatToLA(
                              a.publishedAt ?? a.publishAt ?? a.createdAt,
                            )}
                          </time>
                        </div>
                      </div>
                    </div>
                    <p className="hidden text-xs font-semibold uppercase tracking-wide text-neutral-400 sm:block">
                      Community
                    </p>
                  </div>

                  <div className="h-px w-full bg-neutral-200" />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">
                        Join the conversation
                      </p>
                      <p className="text-xs text-neutral-500">
                        React with your take and see what people think below.
                      </p>
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
                      <ScrollToArticleCta
                        targetId="article-predictions"
                        label="Share your take"
                        className="w-full sm:w-auto"
                      />
                      <ShareButtons
                        showLabel={false}
                        className="w-full justify-start sm:w-auto sm:justify-end"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <div className="mt-4 lg:mt-6 px-4 lg:px-6">
              <div className="overflow-hidden rounded-xl shadow-sm">
                <FocusableImage
                  src={a.coverImageUrl ?? "/placeholder.jpg"}
                  alt={a.title}
                  className="aspect-[16/9] cursor-zoom-in"
                />
              </div>
            </div>

            {/* ADSENSE_PAUSED_TOKEN_V1: In-article ad temporarily disabled.
            <section className="mt-6 px-4 lg:px-6">
              <AdsenseUnit
                slot={inlineAdSlot}
                label="In-article ad"
                minHeightClassName="min-h-[140px]"
              />
            </section>
            */}

            <div id="article-content" className="mt-8 px-4 lg:px-6">
              <div className="tiptap prose prose-lg prose-neutral max-w-none prose-headings:font-bold prose-a:text-red-600">
                <ArticleContent value={content} />
              </div>
              <div id="article-predictions">
                <ArticlePredictionCta
                  articleSlug={slug}
                  market={linkedPrediction}
                  canCreate={Boolean(viewerId)}
                />
              </div>
            </div>
          </article>

          <aside className="mt-8 lg:mt-0 space-y-8 lg:sticky lg:top-24 self-start">
            <GetEmail />

            {/* ADSENSE_PAUSED_TOKEN_V1: Sidebar ad temporarily disabled.
            <section className="px-4 lg:px-0">
              <AdsenseUnit
                slot={sidebarAdSlot}
                label="Sidebar ad"
                minHeightClassName="min-h-[280px]"
              />
            </section>
            */}

            <section className="px-4 lg:px-0">
              <h3 className="mb-4 border-b border-neutral-200 pb-2 text-sm font-bold uppercase tracking-wide text-neutral-900">
                Recommended
              </h3>
              <div className="flex flex-col gap-6">
                {recommended.map((item) => (
                  <RecommendedCard
                    key={item.id}
                    article={{ ...item, category: item.category ?? "General" }}
                  />
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

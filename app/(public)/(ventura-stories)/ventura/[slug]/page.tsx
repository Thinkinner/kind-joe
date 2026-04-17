// app/ventura/[slug]/page.tsx
import { notFound, redirect } from "next/navigation";
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
import VenturaGetEmail from "@/components/stories/ventura-get-email";
import FocusableImage from "@/components/stories/focusable-image";
import ArticleTracker from "@/components/article-tracker";
import { RecommendedCard } from "@/components/cards/recommended-card"; // The new horizontal card
import { formatToLA } from "@/lib/format-date";
import { ScrollToArticleCta } from "@/components/stories/scroll-to-article-cta";
import { ArticlePredictionCta } from "@/components/stories/article-prediction-cta";

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
  const canonicalUrl = seo?.canonical || `${siteUrl}/ventura/${slug}`;

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

export default async function VenturaArticleBySlug(props: {
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

  // 2. 🧠 SAFETY REDIRECT
  // If this article DOES NOT have the ventura-county tag, send it to the main layout
  const hasVenturaTag = tags?.some((t) => t.slug === "ventura-county");
  if (!hasVenturaTag) {
    redirect(`/${slug}`);
  }

  // 3. Parallel fetch UI elements (Categories and Smart Recommendations)
  const [cats, recommended] = await Promise.all([
    getArticleCategories(a.id),
    getRecommendedArticles(a.id, a.category, 5), // Priority to same category
  ]);
  const linkedPrediction =
    typeof a.predictionId === "number" && Number.isFinite(a.predictionId)
      ? await getPredictionMarketById(a.predictionId, viewerId)
      : null;
  const publisherName = "Joe Knows Ventura";
  const publisherAvatar = "/brand/ventura-profile.jpg";

  const content =
    typeof a.content === "string" ? JSON.parse(a.content) : a.content;

  return (
    <main className={`py-4 sm:py-6 lg:py-10 ${googleSans.variable}`}>
      <ArticleTracker articleId={a.id} />

      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* MAIN ARTICLE */}
          <article className="bg-white">
            <header className="px-4 pb-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
              {/* Breadcrumb / Category */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide">
                {cats.length > 0 && (
                  <span className="bg-orange-600 text-white px-2 py-0.5 font-semibold rounded-sm">
                    {cats[0].name}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="mt-4 text-[1.95rem] font-extrabold leading-[1.07] tracking-tight text-neutral-900 sm:text-[2.4rem] lg:text-[2.7rem] font-[Poppins]">
                {a.title}
              </h1>

              <div className="mt-6 border-y border-neutral-200 py-4 sm:py-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 flex-shrink-0">
                        <img
                          src={publisherAvatar}
                          alt={publisherName}
                          className="h-full w-full rounded-full object-cover ring-2 ring-white shadow-sm border"
                        />
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
                        Share your perspective and keep the discussion going.
                      </p>
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
                      <ScrollToArticleCta
                        targetId="article-predictions"
                        label="Have your say"
                        className="w-full border-orange-300 bg-orange-50 text-orange-700 hover:border-orange-400 hover:bg-orange-100 sm:w-auto"
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

            {/* Hero Image */}
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="overflow-hidden rounded-xl">
                <FocusableImage
                  src={a.coverImageUrl ?? "/placeholder.jpg"}
                  alt={a.title}
                  caption="Image source: Joe Knows Ventura"
                  className="aspect-[16/9] cursor-zoom-in"
                />
              </div>
              <div className="mt-2 text-right text-[10px] text-neutral-400 uppercase tracking-wider">
                Image source: Joe Knows Ventura
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

            {/* Content Area with Orange Links */}
            <div id="article-content" className="mt-7 px-4 pb-6 sm:px-6 sm:pb-8 lg:px-8 lg:pb-10">
              <div className="tiptap prose prose-base sm:prose-lg prose-neutral max-w-none prose-headings:font-bold prose-a:text-orange-600">
                <ArticleContent value={content} />
              </div>
              <div id="article-predictions" className="mt-8">
                <ArticlePredictionCta
                  articleSlug={slug}
                  market={linkedPrediction}
                  canCreate={Boolean(viewerId)}
                />
              </div>
            </div>
          </article>

          {/* SIDEBAR */}
          <aside className="space-y-6 self-start lg:sticky lg:top-24">
            <VenturaGetEmail />

            {/* ADSENSE_PAUSED_TOKEN_V1: Sidebar ad temporarily disabled.
            <section className="px-4 lg:px-0">
              <AdsenseUnit
                slot={sidebarAdSlot}
                label="Sidebar ad"
                minHeightClassName="min-h-[280px]"
              />
            </section>
            */}

            {/* Ventura Promo Box */}
            <section>
              <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 to-orange-300 shadow-xl shadow-orange-500/20">
                <div className="relative p-6 text-white sm:p-8">
                  <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 sm:h-24 sm:w-24"></div>
                  <div className="relative">
                    <h3 className="text-xl font-black leading-tight sm:text-2xl">
                      Joe Knows <br /> Ventura
                    </h3>
                    <p className="mt-3 text-sm font-medium text-orange-50">
                      Local news and featured stories from the 805.
                    </p>
                    <a
                      href="https://www.instagram.com/joeknowsventura/"
                      target="_blank"
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-orange-600 shadow-md transition hover:bg-orange-50"
                    >
                      Watch Now
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* RECOMMENDED - Smart Horizontal Cards */}
            <section className="border-t border-neutral-200 pt-4 sm:pt-5">
              <h3 className="mb-4 border-b border-neutral-200 pb-2 text-xs font-black uppercase tracking-[0.2em] text-neutral-900">
                Recommended
              </h3>
              <div className="flex flex-col gap-3">
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

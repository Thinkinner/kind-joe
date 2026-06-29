// app/[slug]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation"; // Added redirect
import { Metadata } from "next";
import { DM_Sans } from "next/font/google";

// Actions
import {
  getFullArticleBySlug,
  getArticleCategories,
} from "@/lib/actions/articles";
import { getPredictionMarketById } from "@/lib/predictions/queries";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";

// Components
import ArticleContent from "@/components/stories/article-single-page-content";
import { resolveArticleDisplayContent } from "@/lib/content/resolve-article-content-markdown";
import ShareButtons from "@/components/stories/share-buttons";
import GetEmail from "@/components/stories/kindjoe-get-email";
import FocusableImage from "@/components/stories/focusable-image";
import LocalizedPublishTime from "@/components/stories/localized-publish-time";
import { ArticlePredictionCta } from "@/components/stories/article-prediction-cta";
import { ScrollToArticleCta } from "@/components/stories/scroll-to-article-cta";
import AdsenseUnit from "@/components/ads/adsense-unit";
import ArticleRelatedChain from "@/components/stories/article-related-chain";
import ArticleTransparencyPanel from "@/components/stories/article-transparency-panel";
import { getAuthorProfileByName } from "@/lib/authors/profiles";

export const revalidate = 60;

const googleSans = DM_Sans({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-google-sans",
  display: "swap",
});
const inlineAdSlot = "8465535761";
const sidebarAdSlot = "6300978111";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getFullArticleBySlug(slug);

  if (!data) return {};
  const { article: a, seo: rawSeo } = data;

  const seoRaw: unknown =
    typeof rawSeo === "string" ? JSON.parse(rawSeo) : rawSeo;
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

  // Guard reserved feed routes in case this dynamic slug route is matched first.
  if (slug === "ventura-county") {
    redirect("/ventura/articles");
  }

  // 1. Fetch Primary Data
  const data = await getFullArticleBySlug(slug);
  if (!data) notFound();

  const { article: a, tags, seo: rawSeo } = data;
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
  const cats = await getArticleCategories(a.id);
  const linkedPrediction =
    typeof a.predictionId === "number" && Number.isFinite(a.predictionId)
      ? await getPredictionMarketById(a.predictionId, viewerId)
      : null;
  const seoRaw: unknown =
    typeof rawSeo === "string" ? JSON.parse(rawSeo) : rawSeo;
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
  const publisherProfile = getAuthorProfileByName(publisherName);

  const contentSources = data.contentSources ?? {
    contentMarkdown: data.rawContentMarkdown,
    content: a.content,
    contentHtml: a.contentHtml,
  };
  const { contentMarkdown, contentDoc, preferLegacyDoc } =
    resolveArticleDisplayContent(contentSources);
  const chainEnabled = true;

  return (
    <main className={`bg-neutral-50/70 py-6 sm:py-8 ${googleSans.variable}`}>
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-5 lg:px-6">
        <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_300px] md:items-start lg:grid-cols-[minmax(0,1fr)_340px]">
          <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)]">
            <header className="px-4 pb-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-neutral-500">
                {cats.length > 0 && (
                  <span className="rounded bg-red-600 px-2 py-0.5 font-semibold text-white">
                    {cats[0].name}
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-[1.95rem] font-extrabold leading-[1.08] tracking-tight text-neutral-900 sm:text-[2.35rem] lg:text-[2.7rem]">
                {a.title}
              </h1>

              <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 py-4 sm:px-5 sm:py-5">
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
                        {publisherProfile ? (
                          <Link
                            href={`/authors/${publisherProfile.slug}`}
                            className="text-sm font-bold leading-none text-neutral-900 underline-offset-2 hover:text-red-700 hover:underline"
                          >
                            {publisherName}
                          </Link>
                        ) : (
                          <span className="text-sm font-bold text-neutral-900 leading-none">
                            {publisherName}
                          </span>
                        )}
                        <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 font-medium">
                          <span>Official Publisher</span>
                          <span className="h-1 w-1 rounded-full bg-neutral-300"></span>
                          <LocalizedPublishTime
                            value={a.publishedAt ?? a.publishAt ?? a.createdAt}
                            className="text-neutral-700 font-semibold"
                          />
                        </div>
                      </div>
                    </div>
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
                        className="w-full rounded-lg border-red-300 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100 sm:w-auto"
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

            <div className="mt-4 px-4 sm:px-6 lg:px-8">
              <div className="overflow-hidden rounded-xl border border-neutral-200 shadow-sm">
                <FocusableImage
                  src={a.coverImageUrl ?? "/placeholder.jpg"}
                  alt={a.title}
                  className="aspect-[16/9] cursor-zoom-in"
                />
              </div>
            </div>

            <section className="mt-6 px-4 sm:px-6 lg:px-8">
              <AdsenseUnit
                slot={inlineAdSlot}
                label="In-article ad"
                minHeightClassName="min-h-[140px]"
                adFormat="fluid"
                adLayout="in-article"
                centered
              />
            </section>

            <div id="article-content" className="mt-8 px-4 pb-6 sm:px-6 sm:pb-8 lg:px-8 lg:pb-10">
              <div>
                <ArticleContent
                  markdown={contentMarkdown}
                  value={contentDoc}
                  preferLegacyDoc={preferLegacyDoc}
                />
              </div>
              <ArticleTransparencyPanel
                publishedAt={a.publishedAt}
                publishAt={a.publishAt}
                createdAt={a.createdAt}
                updatedAt={a.updatedAt}
                seo={seoRaw}
                markdown={contentMarkdown}
                sourceLinkClassName="text-red-600 hover:underline"
              />
              <div id="article-predictions">
                <ArticlePredictionCta
                  articleSlug={slug}
                  market={linkedPrediction}
                  canCreate={Boolean(viewerId)}
                  viewerId={viewerId}
                />
              </div>
              {chainEnabled && (
                <ArticleRelatedChain
                  slug={slug}
                  articleId={a.id}
                  canCreatePredictions={Boolean(viewerId)}
                  className="mt-8"
                  title="More on this topic"
                />
              )}
            </div>
          </article>

          <aside className="self-start md:sticky md:top-24">
            <div className="space-y-5">
              <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  Quick actions
                </p>
                <div className="mt-3 space-y-2">
                  <ScrollToArticleCta
                    targetId="article-content"
                    label="Jump to article"
                    className="w-full justify-center rounded-lg border border-neutral-300 bg-white text-sm text-neutral-800 hover:bg-neutral-50"
                  />
                  <ScrollToArticleCta
                    targetId="article-predictions"
                    label="View discussion"
                    className="w-full justify-center rounded-lg border-red-300 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100"
                  />
                </div>
              </section>

              <GetEmail />

              <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <AdsenseUnit
                  slot={sidebarAdSlot}
                  label="Sidebar ad"
                  minHeightClassName="min-h-[280px]"
                />
              </section>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

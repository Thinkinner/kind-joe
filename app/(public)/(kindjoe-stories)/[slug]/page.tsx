// app/[slug]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import {
  getFullArticleBySlug,
  getArticleCategories,
} from "@/lib/actions/articles";
import { getPredictionMarketById } from "@/lib/predictions/queries";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import {
  articlePublicPath,
  getArticleBrandTheme,
  articleShowsMainImage,
  hasVenturaCountyTag,
} from "@/lib/brand/article-theme";
import ArticleContent from "@/components/stories/article-single-page-content";
import { resolveArticleDisplayContent } from "@/lib/content/resolve-article-content-markdown";
import ShareButtons from "@/components/stories/share-buttons";
import GetEmail from "@/components/stories/kindjoe-get-email";
import VenturaGetEmail from "@/components/stories/ventura-get-email";
import { CouncilTeaEmbed } from "@/components/ventura-county/council-tea-embed";
import FocusableImage from "@/components/stories/focusable-image";
import LocalizedPublishTime from "@/components/stories/localized-publish-time";
import { ArticlePredictionCta } from "@/components/stories/article-prediction-cta";
import { ScrollToArticleCta } from "@/components/stories/scroll-to-article-cta";
import AdsenseUnit from "@/components/ads/adsense-unit";
import { JoesFriendsPromo } from "@/components/ads/joes-friends-promo";
import { isAdsenseEligibleInventory } from "@/lib/ads/adsense-inventory-policy";
import ArticleRelatedChain from "@/components/stories/article-related-chain";
import ArticleTransparencyPanel from "@/components/stories/article-transparency-panel";
import { getAuthorProfileByName } from "@/lib/authors/profiles";
import { getYouTubeId, youtubeEmbedUrl, youtubeThumbnailUrl } from "@/lib/media/youtube";

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
  const canonicalUrl = seo?.canonical || `${siteUrl}${articlePublicPath(slug)}`;
  const coverVideoId = getYouTubeId(a.coverImageUrl);
  const shareImage = coverVideoId
    ? youtubeThumbnailUrl(coverVideoId)
    : a.coverImageUrl;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: shareImage ? [shareImage] : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: shareImage ? [shareImage] : [],
    },
  };
}

export default async function ArticleBySlug(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  if (slug === "ventura-county") {
    redirect("/ventura-county");
  }

  const data = await getFullArticleBySlug(slug);
  if (!data) notFound();

  const { article: a, tags, seo: rawSeo } = data;
  const isVentura = hasVenturaCountyTag(tags);
  const coverVideoId = getYouTubeId(a.coverImageUrl);
  const showMainImage =
    Boolean(coverVideoId) || articleShowsMainImage({ tags, category: a.category });
  const theme = getArticleBrandTheme(isVentura);
  const session = await getServerSession();
  const user = session?.user as AuthAppUser | undefined;
  const viewerId = user?.id ?? null;

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
  const publisherName = useAliasByline ? bylineAlias : theme.publisherDefault;
  const publisherInitials = publisherName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || (isVentura ? "JV" : "KJ");
  const publisherProfile = getAuthorProfileByName(publisherName);

  const contentSources = data.contentSources ?? {
    contentMarkdown: data.rawContentMarkdown,
    content: a.content,
    contentHtml: a.contentHtml,
  };
  const { contentMarkdown, contentDoc, preferLegacyDoc } =
    resolveArticleDisplayContent(contentSources);
  const allowAds = isAdsenseEligibleInventory({
    title: a.title,
    excerpt: a.excerpt,
    bodyMarkdown: contentMarkdown,
  });
  const chainEnabled = true;

  return (
    <main className={`${theme.mainClassName} ${googleSans.variable}`}>
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-5 lg:px-6">
        <div
          className={`grid gap-7 md:grid-cols-[minmax(0,1fr)_280px] md:items-start lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] ${
            isVentura ? "" : "lg:grid-cols-[minmax(0,1fr)_340px]"
          }`}
        >
          <article className={theme.articleClassName}>
            <header className="px-4 pb-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-neutral-500">
                {cats.length > 0 && (
                  <span
                    className={`rounded px-2 py-0.5 font-semibold text-white ${theme.badge}`}
                  >
                    {cats[0].name}
                  </span>
                )}
              </div>

              <h1
                className={`mt-4 text-[1.95rem] font-extrabold leading-[1.08] tracking-tight text-neutral-900 sm:text-[2.35rem] lg:text-[2.7rem] ${
                  isVentura ? "font-[Poppins]" : ""
                }`}
              >
                {a.title}
              </h1>

              <div className={`mt-6 ${theme.headerMetaClassName}`}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0">
                        {useAliasByline ? (
                          <div
                            aria-label={publisherName}
                            className="flex h-full w-full items-center justify-center rounded-full bg-neutral-900 text-sm font-bold tracking-wide text-white ring-2 ring-white shadow-sm"
                          >
                            {publisherInitials}
                          </div>
                        ) : (
                          <img
                            src={theme.publisherAvatar}
                            alt={publisherName}
                            className={`h-full w-full rounded-full object-cover ring-2 ring-white shadow-sm ${
                              isVentura ? "border" : ""
                            }`}
                          />
                        )}
                        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white ring-2 ring-white">
                          <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-3 w-3"
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
                            className={`text-sm font-bold leading-none text-neutral-900 underline-offset-2 hover:underline ${theme.authorLinkHover}`}
                          >
                            {publisherName}
                          </Link>
                        ) : (
                          <span className="text-sm font-bold leading-none text-neutral-900">
                            {publisherName}
                          </span>
                        )}
                        <div className="mt-1 flex items-center gap-2 text-xs font-medium text-neutral-500">
                          <span>Official Publisher</span>
                          <span className="h-1 w-1 rounded-full bg-neutral-300" />
                          <LocalizedPublishTime
                            value={a.publishedAt ?? a.publishAt ?? a.createdAt}
                            className="font-semibold text-neutral-700"
                          />
                        </div>
                      </div>
                    </div>
                    {isVentura ? (
                      <p className="hidden text-xs font-semibold uppercase tracking-wide text-neutral-400 sm:block">
                        Community
                      </p>
                    ) : null}
                  </div>

                  <div className="h-px w-full bg-neutral-200" />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">
                        Join the conversation
                      </p>
                      <p className="text-xs text-neutral-500">
                        {theme.conversationHint}
                      </p>
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
                      <ScrollToArticleCta
                        targetId="article-predictions"
                        label={theme.shareCtaLabel}
                        className={`w-full rounded-lg sm:w-auto ${theme.accentCta}`}
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

            {showMainImage ? (
              <div
                className={
                  isVentura ? "px-4 sm:px-6 lg:px-8" : "mt-4 px-4 sm:px-6 lg:px-8"
                }
              >
                <div
                  className={
                    isVentura
                      ? "overflow-hidden rounded-xl"
                      : "overflow-hidden rounded-xl border border-neutral-200 shadow-sm"
                  }
                >
                  {coverVideoId ? (
                    <div className="aspect-video">
                      <iframe
                        src={youtubeEmbedUrl(coverVideoId)}
                        title={a.title}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <FocusableImage
                      src={a.coverImageUrl ?? "/placeholder.jpg"}
                      alt={a.title}
                      caption={
                        isVentura ? "Image source: Joe Knows Ventura" : undefined
                      }
                      className="aspect-[16/9] cursor-zoom-in"
                    />
                  )}
                </div>
                {isVentura && !coverVideoId ? (
                  <div className="mt-2 text-right text-[10px] uppercase tracking-wider text-neutral-400">
                    Image source: Joe Knows Ventura
                  </div>
                ) : null}
              </div>
            ) : null}

            <div
              id="article-content"
              className="mt-7 px-4 pb-6 sm:px-6 sm:pb-8 lg:px-8 lg:pb-10"
            >
              <ArticleContent
                markdown={contentMarkdown}
                value={contentDoc}
                preferLegacyDoc={preferLegacyDoc}
              />
              {allowAds ? (
                <section className="mt-8 empty:hidden">
                  <AdsenseUnit
                    slot={inlineAdSlot}
                    label="In-article ad"
                    minHeightClassName="min-h-[140px]"
                    adFormat="fluid"
                    adLayout="in-article"
                    centered
                  />
                </section>
              ) : null}
              <ArticleTransparencyPanel
                publishedAt={a.publishedAt}
                publishAt={a.publishAt}
                createdAt={a.createdAt}
                updatedAt={a.updatedAt}
                seo={seoRaw}
                markdown={contentMarkdown}
                sourceLinkClassName={theme.sourceLink}
              />
              <div id="article-predictions" className={isVentura ? "mt-8" : ""}>
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
                  title={theme.relatedTitle}
                />
              )}
            </div>
          </article>

          <aside className="self-start md:sticky md:top-24">
            <div className={isVentura ? "space-y-6" : "space-y-5"}>
              {!isVentura ? (
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
                      className={`w-full justify-center rounded-lg ${theme.sidebarCta}`}
                    />
                  </div>
                </section>
              ) : (
                <CouncilTeaEmbed />
              )}

              {!isVentura ? <JoesFriendsPromo /> : null}

              {isVentura ? <VenturaGetEmail /> : <GetEmail />}

              {allowAds ? (
                <section
                  className={
                    isVentura
                      ? "px-4 empty:hidden lg:px-0"
                      : "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm empty:hidden"
                  }
                >
                  <AdsenseUnit
                    slot={sidebarAdSlot}
                    label="Sidebar ad"
                    minHeightClassName="min-h-[280px]"
                  />
                </section>
              ) : null}

              {isVentura ? (
                <section>
                  <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 to-orange-300 shadow-xl shadow-orange-500/20">
                    <div className="relative p-6 text-white sm:p-8">
                      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 sm:h-24 sm:w-24" />
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
                          rel="noopener noreferrer"
                          className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-orange-600 shadow-md transition hover:bg-orange-50"
                        >
                          Watch Now
                        </a>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

import { notFound, redirect } from "next/navigation";

/** Reserved under /ventura/* — served by dedicated routes, not article redirects. */
const RESERVED_VENTURA_SLUGS = new Set(["posts", "articles"]);

/** Legacy Ventura URLs — canonical article path is always /{slug}. */
export default async function LegacyVenturaArticleRedirect(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  if (RESERVED_VENTURA_SLUGS.has(slug)) notFound();
  redirect(`/${slug}`);
}

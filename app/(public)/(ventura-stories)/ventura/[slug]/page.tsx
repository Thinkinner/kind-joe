import { redirect } from "next/navigation";

/** Legacy Ventura URLs — canonical article path is always /{slug}. */
export default async function LegacyVenturaArticleRedirect(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  redirect(`/${slug}`);
}

import { notFound } from "next/navigation";
import { loadNewsletterDraftById } from "@/lib/(newsletter-automations)/newsletter-draft-loader";
import ReviewClientShell from "./review-client-shell";

export const dynamic = "force-dynamic";

type RouteParams = { id: string };

export default async function NewsletterHistoryDraftPage({
  params,
}: {
  params: Promise<RouteParams> | RouteParams;
}) {
  const resolved = params instanceof Promise ? await params : params;
  const id = resolved?.id?.trim();
  if (!id) notFound();

  const draft = await loadNewsletterDraftById(id);
  if (!draft) notFound();

  return <ReviewClientShell initialDraft={draft} />;
}

import { notFound } from "next/navigation";
import NewsletterPreview from "@/components/(newsletter-automations)/newsletter-preview";
import { loadNewsletterDraftById } from "@/lib/(newsletter-automations)/newsletter-draft-loader";

export const dynamic = "force-dynamic";

type RouteParams = { id: string };

export default async function KindJoeNewsletterPreviewPage({
  params,
}: {
  params: Promise<RouteParams> | RouteParams;
}) {
  const resolved = params instanceof Promise ? await params : params;
  const id = resolved?.id?.trim();
  if (!id) notFound();

  const draft = await loadNewsletterDraftById(id);
  if (!draft?.data?.stories?.length) notFound();

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto mb-5 max-w-[720px] rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 shadow-sm">
        <div className="font-semibold text-neutral-900">KindJoe newsletter preview</div>
        <div className="mt-0.5 text-xs text-neutral-500">Shared draft preview link</div>
      </div>
      <NewsletterPreview data={draft.data} />
    </main>
  );
}

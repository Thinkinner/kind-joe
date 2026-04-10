import { AdminArticleForm } from "@/components/admin/cms/admin-article-form";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <AdminArticleForm articleId={id} />
    </div>
  );
}

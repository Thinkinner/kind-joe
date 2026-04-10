import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminArticleForm } from "@/components/admin/cms/admin-article-form";
import { Button } from "@/components/ui/button";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/articles" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Articles
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Edit article
        </h1>
      </div>
      <AdminArticleForm articleId={id} />
    </div>
  );
}

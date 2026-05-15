import { NewArticleWithAssistant } from "@/components/admin/cms/new-article-with-assistant";

export default function NewArticlePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Article Creator
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              Create a New Story
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Use the editor to write and publish a complete article. Keep the
              title sharp, include clear attribution in the body, and add a
              strong meta description before publishing.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
            <p>Recommended flow:</p>
            <p className="mt-1">Title → Excerpt → Body → Meta description</p>
          </div>
        </div>
      </section>

      <NewArticleWithAssistant />
    </div>
  );
}

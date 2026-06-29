import { getEditorsPicksAction } from "@/lib/actions/articles";
import { EditorsPicksPanel } from "@/components/home/editors-picks-panel";

export async function EditorsPicks() {
  const articles = await getEditorsPicksAction(5);
  return <EditorsPicksPanel articles={articles} />;
}

export function EditorsPicksSkeleton() {
  return (
    <section aria-hidden className="border-l border-slate-200 pl-5">
      <div className="animate-pulse border-b border-slate-200 pb-4">
        <div className="h-3 w-28 rounded bg-slate-100" />
        <div className="mt-2 h-5 w-44 rounded bg-slate-100" />
      </div>
      <div className="divide-y divide-slate-200">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 py-4 sm:gap-3.5">
            <div className="h-14 w-14 shrink-0 rounded-md bg-slate-100 sm:h-16 sm:w-16" />
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <div className="h-2.5 w-16 rounded bg-slate-100" />
              <div className="h-3.5 w-full rounded bg-slate-100" />
              <div className="h-3.5 w-[85%] rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

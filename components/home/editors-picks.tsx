import { getEditorsPicksAction } from "@/lib/actions/articles";
import { EditorsPicksPanel } from "@/components/home/editors-picks-panel";

export async function EditorsPicks() {
  const articles = await getEditorsPicksAction(5);
  return <EditorsPicksPanel articles={articles} />;
}

export function EditorsPicksSkeleton() {
  return (
    <section
      aria-hidden
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm"
    >
      <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#0a0a0f] via-[#12121a] to-[#0d0d14] px-4 py-4 sm:px-5 sm:py-5">
        <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
        <div className="mt-2 h-5 w-44 animate-pulse rounded bg-white/10" />
      </div>
      <div className="px-1 sm:px-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse gap-3 border-b border-slate-100 px-3 py-4 last:border-b-0 sm:gap-3.5"
          >
            <div className="h-14 w-14 shrink-0 rounded-lg bg-slate-100 sm:h-16 sm:w-16" />
            <div className="flex flex-1 flex-col gap-2">
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

import { Skeleton } from "@/components/ui/skeleton";

export default function PublicLoading() {
  return (
    <div className="min-h-[50vh] w-full px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-8 w-64 rounded-md bg-slate-200" />
        <Skeleton className="h-4 w-full max-w-2xl rounded-md bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              className="aspect-[16/10] w-full rounded-lg bg-slate-200"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

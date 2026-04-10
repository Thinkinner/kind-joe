import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAuthLoading() {
  return (
    <div className="space-y-6 py-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-[34rem] max-w-full" />
      </div>
      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
}

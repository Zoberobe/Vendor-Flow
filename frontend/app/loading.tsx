import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-8" aria-label="Loading VendorFlow">
      <div className="mx-auto max-w-[1480px] space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-28" />)}
        </div>
        <Skeleton className="h-[420px]" />
      </div>
    </main>
  );
}

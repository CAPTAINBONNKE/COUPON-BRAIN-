import { CouponGridSkeleton, SectionHeaderSkeleton, Skeleton } from "@/components/ui/skeleton";

/** Shown while a route's server component streams in. Mirrors real layout. */
export default function Loading() {
  return (
    <div className="container-page py-8 sm:py-10">
      <div className="max-w-3xl">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-8 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <div className="surface space-y-4 rounded-2xl p-4">
            <Skeleton className="h-4 w-16" />
            {Array.from({ length: 4 }, (_, group) => (
              <div key={group} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 flex gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <SectionHeaderSkeleton />
          <CouponGridSkeleton />
        </div>
      </div>
    </div>
  );
}

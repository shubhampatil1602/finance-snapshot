import { Skeleton } from "@/components/ui/skeleton"

export function HeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-8 w-72" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading dashboard">
      <HeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-32 rounded-xl sm:h-16" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <HeaderSkeleton />
      <div className="flex flex-col gap-2 rounded-xl border p-4">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </div>
  )
}

export function TeaserSkeleton() {
  return (
    <section
      className="relative flex min-h-[calc(100svh-var(--header-h))] flex-col justify-center overflow-hidden bg-background md:h-[100svh] md:min-h-[100svh]"
      id="pemakaian-harga"
    >
      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-var(--header-h))] w-full max-w-7xl flex-col justify-center px-4 py-6 md:block md:min-h-0 md:px-8 md:py-10">
        {/* Section Header Skeleton */}
        <div className="text-left mb-12">
          <div className="inline-flex items-center gap-2.5 bg-muted rounded-full px-4 py-2 mb-6">
            <span className="h-2 w-2 bg-muted-foreground/30 rounded-full animate-pulse" />
            <span className="h-3 w-28 bg-muted-foreground/30 rounded animate-pulse" />
          </div>
          <div className="h-10 w-64 bg-muted rounded mt-4 animate-pulse" />
        </div>

        {/* Grid Skeleton */}
        <div className="hidden md:grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 md:p-8 bg-card border border-border rounded-2xl animate-pulse">
              <div className="h-5 bg-muted rounded w-24 mx-auto" />
              <div className="h-8 bg-muted rounded w-28 mx-auto mt-3" />
              <div className="h-px bg-border my-4" />
              <div className="h-16 bg-muted rounded w-full mt-3" />
              <div className="h-8 bg-muted rounded w-full mt-3" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

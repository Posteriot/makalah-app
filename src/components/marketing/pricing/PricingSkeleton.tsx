export function PricingSkeleton() {
  return (
    <div className="hidden md:grid grid-cols-3 gap-6 items-stretch">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative h-full min-h-[280px] md:min-h-[320px] flex flex-col p-4 md:p-8 rounded-lg border border-black/20 dark:border-white/25 animate-pulse"
        >
          {/* Plan name skeleton */}
          <div className="h-7 bg-muted rounded w-24 mx-auto mb-3 mt-4 md:mt-0" />

          {/* Price skeleton */}
          <div className="h-12 bg-muted rounded w-32 mx-auto mb-6" />

          {/* Description skeleton */}
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-muted mt-2" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
            </div>
          </div>

          {/* Credit note skeleton */}
          <div className="mt-4 pt-3 flex-1">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-4/5 mt-2" />
          </div>

          {/* CTA skeleton */}
          <div className="mt-6 h-10 bg-muted rounded w-full" />
        </div>
      ))}
    </div>
  )
}

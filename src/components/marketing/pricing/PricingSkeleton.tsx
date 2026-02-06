export function PricingSkeleton() {
  return (
    <div className="hidden md:grid grid-cols-3 gap-6 items-stretch">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-6 md:p-8 bg-card border border-border rounded-2xl animate-pulse"
        >
          {/* Plan name skeleton */}
          <div className="h-5 bg-muted rounded w-24 mx-auto" />

          {/* Price skeleton */}
          <div className="h-8 bg-muted rounded w-28 mx-auto mt-3" />

          <div className="h-px bg-border my-4" />

          <div className="h-16 bg-muted rounded w-full mt-3" />
          <div className="h-8 bg-muted rounded w-full mt-3" />
        </div>
      ))}
    </div>
  )
}

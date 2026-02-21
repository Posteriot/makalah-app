"use client"

import { useRouter } from "next/navigation"
import { Search } from "iconoir-react"
import Image from "next/image"
import { ArrowRight } from "iconoir-react"
import { cn } from "@/lib/utils"
import { SectionCTA } from "@/components/ui/section-cta"
import { DiagonalStripes } from "@/components/marketing/SectionBackground"
import type { BlogPost } from "./types"
import { createPlaceholderImageDataUri, normalizeCategory } from "./utils"

interface BlogFeedSectionProps {
  isLoading: boolean
  displayPosts: BlogPost[]
  expandedRowKeyResolved: string | null
  onToggleRow: (rowKey: string) => void
  onExpandRow: (rowKey: string) => void
}

function RowThumbnail({
  title,
  coverImageUrl,
  category,
}: {
  title: string
  coverImageUrl?: string | null
  category: string
}) {
  const placeholderSrc = createPlaceholderImageDataUri({
    title,
    category,
    width: 256,
    height: 256,
  })

  if (coverImageUrl) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-action border-hairline">
        <Image src={coverImageUrl} alt={title} fill className="object-cover" sizes="88px" />
      </div>
    )
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-action border-hairline">
      <Image
        src={placeholderSrc}
        alt={`Thumbnail ${category}`}
        fill
        className="object-cover"
        sizes="88px"
        unoptimized
      />
    </div>
  )
}

export function BlogFeedSection({
  isLoading,
  displayPosts,
  expandedRowKeyResolved,
  onToggleRow,
  onExpandRow,
}: BlogFeedSectionProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-shell border-hairline bg-card/90 p-4 backdrop-blur-[1px] dark:bg-slate-800/90 md:p-5">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-20 animate-pulse rounded-action border-hairline bg-card/20 dark:bg-slate-800/40" />
        ))}
      </div>
    )
  }

  if (displayPosts.length === 0) {
    return (
      <div className="rounded-shell border-hairline border-dashed bg-card/90 px-6 py-16 text-center backdrop-blur-[1px] dark:bg-slate-800/90 md:py-20">
        <div className="rounded-action mx-auto mb-4 flex h-14 w-14 items-center justify-center bg-muted/30">
          <Search className="icon-display text-muted-foreground" />
        </div>
        <h3 className="text-narrative mb-2 text-lg font-medium text-foreground">
          Konten Tidak Ditemukan
        </h3>
        <p className="text-narrative mx-auto max-w-sm text-sm text-muted-foreground">
          Coba ubah kata kunci atau kombinasi filter.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-shell border-hairline bg-card/85 backdrop-blur-[1px] dark:bg-slate-900">
      {displayPosts.map((post) => {
        const rowKey = `post-${String(post._id)}`
        const isExpanded = expandedRowKeyResolved === rowKey
        const normalizedCategory = normalizeCategory(post.category, post.title, post.excerpt)
        const dateLabel = new Date(post.publishedAt).toLocaleDateString("id-ID", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        const dateMetaLabel = new Date(post.publishedAt).toLocaleDateString("id-ID", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })

        return (
          <article key={post._id} className="border-hairline border-b last:border-b-0">
            <div
              className={cn(
                "px-4 py-5 transition-colors md:px-5 md:py-5",
                isExpanded && "bg-slate-100 dark:bg-slate-700"
              )}
            >
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => onExpandRow(rowKey)}
                  className="group min-w-0 flex-1 text-left"
                  aria-expanded={isExpanded}
                >
                  <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 md:grid-cols-[88px_minmax(0,1fr)]">
                    <RowThumbnail
                      title={post.title}
                      coverImageUrl={post.coverImageUrl}
                      category={normalizedCategory}
                    />
                    <div className="min-w-0">
                      <p className="text-signal mb-1 text-[10px] font-medium tracking-widest text-muted-foreground">
                        / {normalizedCategory.toUpperCase()} | {dateLabel}
                      </p>
                      <h3
                        className="text-narrative cursor-pointer text-base font-medium text-foreground/80 transition-colors group-hover:text-sky-700 dark:text-slate-100 dark:group-hover:text-sky-200 md:text-lg"
                        onDoubleClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          router.push(`/blog/${post.slug}`)
                        }}
                      >
                        {post.title}
                      </h3>
                      <p className="text-narrative mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {post.excerpt}
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleRow(rowKey)}
                  className={cn(
                    "cursor-pointer self-center text-center text-[1.9rem] leading-none text-muted-foreground transition-colors hover:text-slate-700 focus-visible:text-slate-700 dark:hover:text-slate-300 dark:focus-visible:text-slate-300",
                    isExpanded && "text-slate-700 dark:text-slate-300"
                  )}
                  aria-label={isExpanded ? "Tutup detail artikel" : "Buka detail artikel"}
                >
                  {isExpanded ? "−" : "+"}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="border-hairline border-t bg-slate-100 px-4 py-5 md:px-5 md:py-6 dark:bg-slate-700">
                <div>
                  <p className="text-narrative mb-5 max-w-3xl text-sm leading-relaxed text-foreground md:text-base">
                    {post.excerpt}
                  </p>

                  <div className="relative overflow-hidden rounded-md border-hairline border bg-slate-100 px-2 py-4 dark:bg-slate-800 md:px-3 md:py-5 lg:px-4">
                    <DiagonalStripes className="opacity-40" />

                    <div className="relative z-10 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:gap-6">
                      <div className="space-y-2">
                        <p className="text-signal text-[10px] font-bold tracking-widest text-muted-foreground">
                          / {normalizedCategory.toUpperCase()}
                        </p>
                        <p className="text-interface text-sm text-foreground">
                          {post.author}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-interface text-sm text-foreground">
                          {dateMetaLabel}
                        </p>
                        <p className="text-interface text-sm text-muted-foreground">
                          {post.readTime}
                        </p>
                      </div>

                      <SectionCTA
                        href={`/blog/${post.slug}`}
                        className="w-full md:w-auto md:self-center"
                      >
                        Baca
                        <ArrowRight className="icon-interface" />
                      </SectionCTA>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

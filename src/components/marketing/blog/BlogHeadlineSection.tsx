"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "iconoir-react"
import { SectionBadge } from "@/components/ui/section-badge"
import { SectionCTA } from "@/components/ui/section-cta"
import type { BlogPost } from "./types"
import { createPlaceholderImageDataUri, normalizeCategory } from "./utils"
import { DiagonalStripes } from "@/components/marketing/SectionBackground"

interface BlogHeadlineSectionProps {
  isLoading: boolean
  headlinePost: BlogPost | null
}

export function BlogHeadlineSection({
  isLoading,
  headlinePost,
}: BlogHeadlineSectionProps) {
  if (isLoading) {
    return <div className="h-[220px] animate-pulse rounded-shell border-hairline bg-card/30 dark:bg-slate-800/40" />
  }

  if (!headlinePost) {
    return (
      <div className="rounded-shell border-hairline border-dashed bg-card/90 px-6 py-16 text-center backdrop-blur-[1px] dark:bg-slate-800/90">
        <p className="text-narrative text-sm text-muted-foreground">
          Belum ada konten yang dipublikasikan.
        </p>
      </div>
    )
  }

  const normalizedCategory = normalizeCategory(
    headlinePost.category,
    headlinePost.title,
    headlinePost.excerpt
  )
  const headlineThumbSrc = headlinePost.coverImageUrl
    ?? createPlaceholderImageDataUri({
      title: headlinePost.title,
      category: normalizedCategory,
      width: 512,
      height: 512,
    })

  return (
    <article className="overflow-hidden rounded-shell border-hairline bg-card/90 p-5 backdrop-blur-[1px] dark:bg-slate-900 md:p-6">
      <div>
        <SectionBadge className="mb-3">Headline</SectionBadge>
      </div>

      <div className="mt-1 mb-5 grid grid-cols-[84px_minmax(0,1fr)] gap-4 md:grid-cols-[112px_minmax(0,1fr)] md:items-start md:gap-5">
        <Link
          href={`/blog/${headlinePost.slug}`}
          className="group relative block aspect-square overflow-hidden rounded-action border-hairline"
          aria-label={`Buka artikel ${headlinePost.title}`}
        >
          <Image
            src={headlineThumbSrc}
            alt={headlinePost.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 84px, 112px"
            unoptimized={!headlinePost.coverImageUrl}
          />
        </Link>

        <div className="min-w-0 self-center">
          <Link
            href={`/blog/${headlinePost.slug}`}
            className="group mb-3 block"
            aria-label={`Buka artikel ${headlinePost.title}`}
          >
            <h1 className="text-narrative text-slate-600 dark:text-slate-100 cursor-pointer text-xl font-medium leading-tight transition-colors group-hover:text-sky-700 dark:group-hover:text-sky-200 md:text-[2rem]">
              {headlinePost.title}
            </h1>
          </Link>
          <p className="text-narrative line-clamp-2 text-md leading-relaxed text-muted-foreground">
            {headlinePost.excerpt}
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-md border-hairline border bg-slate-100 px-2 py-4 dark:bg-slate-800 md:px-3 md:py-5 lg:px-4">
        <DiagonalStripes className="opacity-40" />

        <div className="relative z-10 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:gap-6">
          
          <div className="space-y-2">
            <p className="text-signal text-[10px] font-bold tracking-widest text-muted-foreground">
              / {normalizedCategory.toUpperCase()}
            </p>
            <p className="text-interface text-sm text-foreground">
              {headlinePost.author}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-interface text-sm text-foreground">
              {new Date(headlinePost.publishedAt).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="text-interface text-sm text-muted-foreground">
              {headlinePost.readTime}
            </p>
          </div>

          <SectionCTA
            href={`/blog/${headlinePost.slug}`}
            className="w-full md:w-auto md:self-center"
          >
            Baca
            <ArrowRight className="icon-interface" />
          </SectionCTA>
        </div>
      </div>
    </article>
  )
}

"use client"

import { useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { DottedPattern } from "@/components/marketing/SectionBackground"
import { ArrowLeft, ArrowRight } from "iconoir-react"
import Link from "next/link"
import Image from "next/image"
import { RichTextRenderer } from "@/components/marketing/RichTextRenderer"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { createPlaceholderImageDataUri, normalizeCategory } from "./utils"

type DocListItem = {
  text: string
  subItems?: string[]
}

type DocList = {
  variant: "bullet" | "numbered"
  items: DocListItem[]
}

type DocBlock =
  | {
    type: "infoCard"
    title: string
    description?: string
    items: string[]
  }
  | {
    type: "ctaCards"
    items: Array<{
      title: string
      description: string
      targetSection: string
      ctaText: string
      icon?: string
    }>
  }
  | {
    type: "section"
    title: string
    description?: string
    paragraphs?: string[]
    list?: DocList
  }

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded-action border-main border-border bg-muted/40 px-1 py-0.5 text-xs text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={`${part}-${index}`}>{part}</span>
  })
}

function BlockRenderer({ block }: { block: DocBlock }) {
  if (block.type === "section") {
    return (
      <section>
        <h2 className="text-narrative mb-3 text-2xl leading-tight font-medium md:text-3xl">
          {block.title}
        </h2>

        {block.description && (
          <p className="text-narrative mb-5 text-base leading-relaxed text-muted-foreground">
            {renderInline(block.description)}
          </p>
        )}

        {block.paragraphs && block.paragraphs.length > 0 && (
          <div className="space-y-4">
            {block.paragraphs.map((paragraph, paragraphIndex) => (
              <p key={`paragraph-${paragraphIndex}`} className="text-narrative text-lg leading-relaxed text-foreground/90">
                {renderInline(paragraph)}
              </p>
            ))}
          </div>
        )}

        {block.list && block.list.items.length > 0 && (
          <div className="mt-5">
            {block.list.variant === "numbered" ? (
              <ol className="space-y-2">
                {block.list.items.map((item, itemIndex) => (
                  <li key={`${item.text}-${itemIndex}`} className="text-narrative text-base leading-relaxed text-foreground/90">
                    <span className="text-signal mr-2 text-xs font-bold tracking-widest text-amber-500">
                      {(itemIndex + 1).toString().padStart(2, "0")}
                    </span>
                    <span>{renderInline(item.text)}</span>
                    {item.subItems && item.subItems.length > 0 && (
                      <ul className="mt-2 ml-8 space-y-1">
                        {item.subItems.map((subItem, subItemIndex) => (
                          <li key={`${subItem}-${subItemIndex}`} className="text-sm text-muted-foreground">
                            - {renderInline(subItem)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="space-y-2">
                {block.list.items.map((item, itemIndex) => (
                  <li key={`${item.text}-${itemIndex}`} className="text-narrative text-base leading-relaxed text-foreground/90">
                    <span className="mr-2 text-amber-500">-</span>
                    <span>{renderInline(item.text)}</span>
                    {item.subItems && item.subItems.length > 0 && (
                      <ul className="mt-2 ml-8 space-y-1">
                        {item.subItems.map((subItem, subItemIndex) => (
                          <li key={`${subItem}-${subItemIndex}`} className="text-sm text-muted-foreground">
                            - {renderInline(subItem)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    )
  }

  if (block.type === "infoCard") {
    return (
      <section className="rounded-shell border-hairline bg-card/30 p-5 dark:bg-slate-800/40 md:p-6">
        <h3 className="text-narrative mb-2 text-xl font-medium">{block.title}</h3>
        {block.description && (
          <p className="text-narrative mb-4 text-sm leading-relaxed text-muted-foreground">
            {renderInline(block.description)}
          </p>
        )}
        <ul className="space-y-2">
          {block.items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`} className="text-narrative text-sm leading-relaxed text-foreground/90">
              <span className="mr-2 text-amber-500">-</span>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <section className="rounded-shell border-hairline bg-card/20 p-5 dark:bg-slate-800/35 md:p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {block.items.map((item, itemIndex) => (
          <Link
            key={`${item.targetSection}-${itemIndex}`}
            href={`/documentation?section=${item.targetSection}#${item.targetSection}`}
            className="rounded-action border-main border-border bg-background/60 p-4 transition-colors hover:bg-accent"
          >
            <h3 className="text-narrative mb-2 text-base font-medium">{item.title}</h3>
            <p className="text-narrative mb-3 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
            <span className="text-signal inline-flex items-center gap-1 text-[10px] font-bold tracking-widest text-amber-500">
              {item.ctaText}
              <ArrowRight className="icon-micro" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function BlogArticlePage({ slug }: { slug: string }) {
  const post = useQuery(api.blog.getPostBySlug, { slug })
  const pageSettings = useQuery(api.pageContent.getSection, {
    pageSlug: "blog",
    sectionSlug: "blog-page-settings",
  })
  const normalizedCategory = useMemo(() => {
    if (!post) return null
    return normalizeCategory(post.category, post.title, post.excerpt)
  }, [post])
  const articleCoverSrc = useMemo(() => {
    if (!post) return ""
    if (post.coverImageUrl) return post.coverImageUrl
    return createPlaceholderImageDataUri({
      title: post.title,
      category: normalizedCategory ?? "Update",
      width: 1920,
      height: 1080,
    })
  }, [post, normalizedCategory])
  const blocks = (post?.blocks ?? []) as DocBlock[]

  const publishedDate = post
    ? new Date(post.publishedAt).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    : ""

  if (post === undefined) {
    return (
      <div className="bg-background text-foreground">
        <section className="relative isolate overflow-hidden border-b border-hairline bg-[color:var(--section-bg-alt)]">
          {pageSettings != null && pageSettings.showDottedPattern !== false && <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />}
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 pt-[calc(var(--header-h)+16px)] md:px-8 md:pb-12 md:pt-[calc(var(--header-h)+20px)]">
            <div className="h-16 w-48 animate-pulse rounded-action border-hairline bg-card/40 dark:bg-slate-800/45" />
            <div className="mt-5 h-[4.5rem] w-full animate-pulse rounded-action border-hairline bg-card/40 dark:bg-slate-800/45 md:w-3/4" />
            <div className="mt-3 h-6 w-full animate-pulse rounded-action border-hairline bg-card/40 dark:bg-slate-800/45 md:w-1/2" />
            <div className="mt-8 h-[420px] animate-pulse rounded-shell border-hairline bg-card/30 dark:bg-slate-800/40" />
          </div>
        </section>
      </div>
    )
  }

  if (post === null) {
    return (
      <div className="bg-background text-foreground">
        <section className="relative isolate overflow-hidden border-b border-hairline bg-[color:var(--section-bg-alt)]">
          {pageSettings != null && pageSettings.showDottedPattern !== false && <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />}
          <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-10 pt-[calc(var(--header-h)+20px)] md:px-8 md:pt-[calc(var(--header-h)+24px)]">
            <div className="rounded-shell border-hairline bg-card/90 p-8 text-center backdrop-blur-[1px] dark:bg-slate-800/90 md:p-12">
              <h1 className="text-narrative mb-2 text-2xl font-medium md:text-3xl">Artikel Tidak Ditemukan</h1>
              <p className="text-narrative mb-6 text-sm text-muted-foreground">
                Slug artikel tidak tersedia atau sudah dihapus.
              </p>
              <Link
                href="/blog"
                className="text-signal inline-flex items-center gap-2 rounded-action border-main border-amber-500/40 px-3 py-2 text-[10px] font-bold tracking-widest text-amber-500 transition-colors hover:bg-amber-500/10"
              >
                <ArrowLeft className="icon-interface" />
                Kembali ke Blog
              </Link>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (!post.isPublished) {
    return (
      <div className="bg-background text-foreground">
        <section className="relative isolate overflow-hidden border-b border-hairline bg-[color:var(--section-bg-alt)]">
          {pageSettings != null && pageSettings.showDottedPattern !== false && <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />}
          <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-10 pt-[calc(var(--header-h)+20px)] md:px-8 md:pt-[calc(var(--header-h)+24px)]">
            <div className="rounded-shell border-hairline bg-card/90 p-8 text-center backdrop-blur-[1px] dark:bg-slate-800/90 md:p-12">
              <h1 className="text-narrative mb-2 text-2xl font-medium md:text-3xl">Artikel Tidak Tersedia</h1>
              <p className="text-narrative mb-6 text-sm text-muted-foreground">
                Artikel ini belum dipublikasikan.
              </p>
              <Link
                href="/blog"
                className="text-signal inline-flex items-center gap-2 rounded-action border-main border-amber-500/40 px-3 py-2 text-[10px] font-bold tracking-widest text-amber-500 transition-colors hover:bg-amber-500/10"
              >
                <ArrowLeft className="icon-interface" />
                Kembali ke Blog
              </Link>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="bg-background text-foreground">
      <section className="relative isolate overflow-hidden border-b border-hairline bg-[color:var(--section-bg-alt)]">
        {pageSettings != null && pageSettings.showDottedPattern !== false && <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />}

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-10 pt-[calc(var(--header-h)+16px)] md:px-8 md:pb-14 md:pt-[calc(var(--header-h)+20px)]">
          <div className="grid grid-cols-1 gap-7 md:grid-cols-16 md:gap-8">
            <aside className="md:col-span-4">
              <Link
                href="/blog"
                className="text-interface inline-flex items-center gap-2 text-sm uppercase tracking-[0.12em] text-foreground/70 transition-colors hover:text-sky-700 hover:underline hover:decoration-2 hover:underline-offset-4 dark:hover:text-sky-300 md:hidden"
              >
                <ArrowLeft className="icon-interface" />
                Kembali ke Blog
              </Link>

              <section className="mt-3 rounded-shell border-hairline bg-card/90 p-4 backdrop-blur-[1px] dark:bg-slate-800/90 md:hidden">
                <Accordion type="single" collapsible>
                  <AccordionItem value="mobile-metadata" className="border-b-0">
                    <AccordionTrigger className="text-signal py-1 text-[10px] font-bold tracking-widest text-muted-foreground hover:no-underline">
                      / METADATA
                    </AccordionTrigger>
                    <AccordionContent className="pt-3 pb-0">
                      <div className="rounded-action border-hairline grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3">
                        <div>
                          <p className="text-interface text-xs text-muted-foreground">Tanggal</p>
                          <p className="text-interface mt-1 text-sm">{publishedDate}</p>
                        </div>
                        <div>
                          <p className="text-interface text-xs text-muted-foreground">Kategori</p>
                          <p className="text-interface mt-1 text-sm">{normalizedCategory ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-interface text-xs text-muted-foreground">Penulis</p>
                          <p className="text-interface mt-1 text-sm">{post.author}</p>
                        </div>
                        <div>
                          <p className="text-interface text-xs text-muted-foreground">Waktu baca</p>
                          <p className="text-interface mt-1 text-sm">{post.readTime}</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </section>

              <div className="hidden rounded-shell border-hairline bg-card/90 p-4 backdrop-blur-[1px] dark:bg-slate-800/90 md:block md:p-5">
                <Link
                  href="/blog"
                  className="text-interface inline-flex items-center gap-2 text-sm uppercase tracking-[0.12em] text-foreground/70 transition-colors hover:text-sky-700 hover:underline hover:decoration-2 hover:underline-offset-4 dark:hover:text-sky-300"
                >
                  <ArrowLeft className="icon-interface" />
                  Kembali ke Blog
                </Link>

                <div className="my-3 h-px w-full bg-[color:var(--border-hairline)]" />

                <p className="text-signal mb-3 text-[10px] font-bold tracking-widest text-muted-foreground">
                  / METADATA
                </p>

                <div className="rounded-action border-hairline overflow-hidden">
                  <div className="border-hairline flex items-center justify-between px-4 py-3.5 text-sm">
                    <span className="text-interface text-muted-foreground">Tanggal</span>
                    <span className="text-interface">{publishedDate}</span>
                  </div>
                  <div className="border-hairline flex items-center justify-between px-4 py-3.5 text-sm">
                    <span className="text-interface text-muted-foreground">Penulis</span>
                    <span className="text-interface">{post.author}</span>
                  </div>
                  <div className="border-hairline flex items-center justify-between px-4 py-3.5 text-sm">
                    <span className="text-interface text-muted-foreground">Waktu baca</span>
                    <span className="text-interface">{post.readTime}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3.5 text-sm">
                    <span className="text-interface text-muted-foreground">Kategori</span>
                    <span className="text-interface">{normalizedCategory ?? "-"}</span>
                  </div>
                </div>
              </div>
            </aside>

            <div className="md:col-span-12">
              <section className="rounded-shell border-hairline bg-card/90 p-4 backdrop-blur-[1px] dark:bg-slate-800/90 md:p-6">
                <header className="mb-6 md:mb-8">
                  <h1 className="text-narrative text-[1.55rem] leading-[1.06] font-medium tracking-tight md:text-[2.9rem]">
                    {post.title}
                  </h1>

                  <p className="text-narrative mt-4 text-base leading-relaxed text-muted-foreground md:text-xl">
                    {post.excerpt}
                  </p>
                </header>

                <div className="mb-7 overflow-hidden rounded-shell border-hairline md:mb-8">
                  <div className="relative h-[220px] w-full md:h-[460px]">
                    <Image
                      src={articleCoverSrc}
                      alt={post.title}
                      fill
                      className="object-cover"
                      priority
                      unoptimized={!post.coverImageUrl}
                    />
                  </div>
                </div>

                <article className="space-y-8">
                  {post.content ? (
                    <RichTextRenderer content={post.content} />
                  ) : blocks.length > 0 ? (
                    blocks.map((block, index) => (
                      <BlockRenderer key={`${block.type}-${index}`} block={block} />
                    ))
                  ) : (
                    <section>
                      <h2 className="text-narrative mb-4 text-2xl leading-tight font-medium md:text-3xl">
                        Ringkasan
                      </h2>
                      <p className="text-narrative text-lg leading-relaxed text-foreground/90">
                        {post.excerpt}
                      </p>
                    </section>
                  )}
                </article>
              </section>

            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { RichTextRenderer } from "./RichTextRenderer"
import { SectionBadge } from "@/components/ui/section-badge"
import { DottedPattern } from "@/components/marketing/SectionBackground"
import { motion } from "framer-motion"

type CmsPageWrapperProps = {
  slug: string
  badge: string
  children: React.ReactNode
}

export function CmsPageWrapper({ slug, badge, children }: CmsPageWrapperProps) {
  const page = useQuery(api.richTextPages.getPageBySlug, { slug })

  // Loading
  if (page === undefined) return null

  // No CMS data or unpublished → render children as-is (the static page)
  if (page === null) {
    return <>{children}</>
  }

  // CMS published → render TipTap content in policy page layout

  // Parse TipTap JSON, extract first paragraph as intro callout
  const parsed = JSON.parse(page.content)
  const nodes = parsed?.content ?? []
  const firstNode = nodes[0]
  const hasIntro = firstNode?.type === "paragraph"

  const introContent = hasIntro
    ? JSON.stringify({ type: "doc", content: [firstNode] })
    : null
  const bodyContent = hasIntro
    ? JSON.stringify({ type: "doc", content: nodes.slice(1) })
    : page.content

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[color:var(--section-bg-alt)] pt-[var(--header-h)] pb-24">
      <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 lg:px-8">
        <div className="mx-auto mt-4 w-full max-w-4xl rounded-shell bg-card/90 px-5 py-8 backdrop-blur-[1px] dark:bg-slate-900 md:px-9 md:py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <SectionBadge>{badge}</SectionBadge>
            <h1 className="max-w-[24ch] text-narrative text-2xl font-medium leading-tight tracking-tight text-foreground md:text-3xl">
              {page.title}
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-9 space-y-10"
          >
            {introContent && (
              <div className="relative overflow-hidden rounded-shell border-main border border-sky-300/45 bg-sky-400/10 px-4 py-4 dark:border-sky-200/35 dark:bg-sky-400/20 md:px-5">
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-sky-300 to-sky-500 dark:from-sky-200 dark:to-sky-400"
                />
                <div className="relative text-narrative text-sm leading-relaxed text-slate-700 dark:text-slate-100 [&_strong]:font-semibold [&_strong]:text-foreground">
                  <RichTextRenderer content={introContent} />
                </div>
              </div>
            )}

            <RichTextRenderer content={bodyContent} />

            {page.lastUpdatedLabel && (
              <div className="mt-8 pt-1">
                <div className="inline-flex items-center rounded-action bg-[color:var(--slate-100)]/75 px-3 py-2 dark:bg-[color:var(--slate-800)]/75">
                  <p className="text-signal text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {page.lastUpdatedLabel}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { RichTextRenderer } from "./RichTextRenderer"
import { SectionBadge } from "@/components/ui/section-badge"
import { GridPattern, DottedPattern, DiagonalStripes } from "@/components/marketing/SectionBackground"
import { motion } from "framer-motion"

type CmsPageWrapperProps = {
  slug: string
  badge: string
  children: React.ReactNode
}

export function CmsPageWrapper({ slug, badge, children }: CmsPageWrapperProps) {
  const page = useQuery(api.richTextPages.getPageBySlug, { slug })
  const pageSettings = useQuery(api.pageContent.getSection, {
    pageSlug: "legal",
    sectionSlug: "legal-page-settings",
  })

  // Loading
  if (page === undefined) return null

  // No CMS data or unpublished → render children as-is (the static page)
  if (page === null) {
    return <>{children}</>
  }

  // CMS published → render TipTap content in policy page layout

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[color:var(--section-bg-alt)] pt-[var(--header-h)] pb-24">
      {/* Background patterns — conditional via CMS page-settings */}
      {pageSettings != null && pageSettings.showGridPattern !== false && <GridPattern className="z-0" />}
      {pageSettings != null && pageSettings.showDottedPattern !== false && <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />}
      {pageSettings != null && pageSettings.showDiagonalStripes !== false && <DiagonalStripes className="z-0" />}

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
            <RichTextRenderer content={page.content} />

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

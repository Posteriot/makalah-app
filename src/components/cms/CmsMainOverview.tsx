"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { CmsPageId } from "./CmsActivityBar"
import {
  Home,
  InfoCircle,
  Book,
  Journal,
  ScaleFrameEnlarge,
  PrivacyPolicy,
  CreditCard,
  NavArrowRight,
} from "iconoir-react"
import { Skeleton } from "@/components/ui/skeleton"

type CmsMainOverviewProps = {
  userId: Id<"users">
  onPageClick: (page: CmsPageId) => void
}

const PAGE_DEFS: Array<{
  page: CmsPageId
  label: string
  icon: React.ReactNode
  group: "content" | "global"
}> = [
  { page: "home", label: "Home", icon: <Home className="h-4 w-4" strokeWidth={1.5} />, group: "content" },
  { page: "about", label: "About", icon: <InfoCircle className="h-4 w-4" strokeWidth={1.5} />, group: "content" },
  { page: "pricing", label: "Pricing", icon: <CreditCard className="h-4 w-4" strokeWidth={1.5} />, group: "content" },
  { page: "documentation", label: "Dokumentasi", icon: <Book className="h-4 w-4" strokeWidth={1.5} />, group: "content" },
  { page: "blog", label: "Blog", icon: <Journal className="h-4 w-4" strokeWidth={1.5} />, group: "content" },
  { page: "legal", label: "Legal", icon: <PrivacyPolicy className="h-4 w-4" strokeWidth={1.5} />, group: "content" },
  { page: "global-layout", label: "Global Layout", icon: <ScaleFrameEnlarge className="h-4 w-4" strokeWidth={1.5} />, group: "global" },
]

export function CmsMainOverview({ userId, onPageClick }: CmsMainOverviewProps) {
  // Query all data sources
  const allPageSections = useQuery(api.pageContent.listAllSections, { requestorId: userId })
  const pricingPlans = useQuery(api.pricingPlans.getActivePlans)
  const docSections = useQuery(api.documentationSections.listAllSections, { requestorId: userId })
  const blogPosts = useQuery(api.blog.listAllPosts, { requestorId: userId })
  const richTextPages = useQuery(api.richTextPages.listAllPages, { requestorId: userId })
  const siteConfigs = useQuery(api.siteConfig.listAllConfigs, { requestorId: userId })

  const isLoading =
    allPageSections === undefined ||
    pricingPlans === undefined ||
    docSections === undefined ||
    blogPosts === undefined ||
    richTextPages === undefined ||
    siteConfigs === undefined

  // Compute status per page
  function getPageStatus(page: CmsPageId): { summary: string; published: number; total: number } {
    switch (page) {
      case "home": {
        const sections = (allPageSections ?? []).filter(
          (s) => s.pageSlug === "home" && s.sectionType !== "page-settings"
        )
        const pub = sections.filter((s) => s.isPublished).length
        return { summary: `${sections.length} sections · ${pub} published`, published: pub, total: sections.length }
      }
      case "about": {
        const sections = (allPageSections ?? []).filter(
          (s) => s.pageSlug === "about" && s.sectionType !== "page-settings"
        )
        const pub = sections.filter((s) => s.isPublished).length
        return { summary: `${sections.length} sections · ${pub} published`, published: pub, total: sections.length }
      }
      case "pricing": {
        const plans = pricingPlans ?? []
        const disabled = plans.filter((p) => p.isDisabled).length
        return {
          summary: `${plans.length} plans${disabled > 0 ? ` · ${disabled} disabled` : ""}`,
          published: plans.length - disabled,
          total: plans.length,
        }
      }
      case "documentation": {
        const sections = docSections ?? []
        const pub = sections.filter((s) => s.isPublished).length
        return { summary: `${sections.length} sections · ${pub} published`, published: pub, total: sections.length }
      }
      case "blog": {
        const posts = blogPosts ?? []
        const pub = posts.filter((p) => p.isPublished).length
        return { summary: `${posts.length} posts · ${pub} published`, published: pub, total: posts.length }
      }
      case "legal": {
        const LEGAL_SLUGS = ["privacy", "security", "terms"]
        const pages = richTextPages ?? []
        const pub = LEGAL_SLUGS.filter((slug) => {
          const p = pages.find((page) => page.slug === slug)
          return p?.isPublished
        }).length
        return { summary: `${LEGAL_SLUGS.length} pages · ${pub} published`, published: pub, total: LEGAL_SLUGS.length }
      }
      case "global-layout": {
        const configs = siteConfigs ?? []
        const configured = configs.length
        return {
          summary: `${configured}/2 configured`,
          published: configured,
          total: 2,
        }
      }
    }
  }

  // Loading
  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl p-comfort pt-8">
        <Skeleton className="mb-6 h-7 w-48" />
        <Skeleton className="mb-4 h-4 w-64" />
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-14 w-full" />
        ))}
      </div>
    )
  }

  const contentPages = PAGE_DEFS.filter((p) => p.group === "content")
  const globalPages = PAGE_DEFS.filter((p) => p.group === "global")

  return (
    <div className="mx-auto w-full max-w-2xl p-comfort pt-8">
      {/* Page title */}
      <h2 className="text-narrative text-xl font-medium tracking-tight text-foreground">
        Content Manager
      </h2>
      <p className="mt-2 text-interface text-xs text-muted-foreground">
        Pilih halaman untuk mengelola konten CMS.
      </p>
      <div className="mt-3 border-t border-border" />

      {/* Content Pages */}
      <div className="mt-5">
        <span className="text-signal text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Content Pages
        </span>
        <div className="mt-2 overflow-hidden rounded-action border border-border">
          {contentPages.map((def, i) => {
            const status = getPageStatus(def.page)
            return (
              <button
                key={def.page}
                type="button"
                onClick={() => onPageClick(def.page)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                {/* Icon */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-action bg-muted/70 text-muted-foreground">
                  {def.icon}
                </span>

                {/* Label + status */}
                <div className="flex-1 min-w-0">
                  <span className="text-interface block text-sm font-medium text-foreground">
                    {def.label}
                  </span>
                  <span className="text-interface block text-xs text-muted-foreground">
                    {status.summary}
                  </span>
                </div>

                {/* Arrow */}
                <NavArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Global Components */}
      <div className="mt-5">
        <span className="text-signal text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Global Components
        </span>
        <div className="mt-2 overflow-hidden rounded-action border border-border">
          {globalPages.map((def, i) => {
            const status = getPageStatus(def.page)
            return (
              <button
                key={def.page}
                type="button"
                onClick={() => onPageClick(def.page)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-action bg-muted/70 text-muted-foreground">
                  {def.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-interface block text-sm font-medium text-foreground">
                    {def.label}
                  </span>
                  <span className="text-interface block text-xs text-muted-foreground">
                    {status.summary}
                  </span>
                </div>
                <NavArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Info box */}
      <div className="mt-4 rounded-action border border-border bg-muted/50 px-4 py-3">
        <p className="text-interface text-xs leading-relaxed text-muted-foreground">
          Gunakan sidebar kiri untuk navigasi cepat antar halaman.
          Klik &ldquo;Content Manager&rdquo; di header sidebar untuk kembali ke halaman ini.
        </p>
      </div>
    </div>
  )
}

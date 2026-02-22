"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { BenefitsSection } from "./BenefitsSection"

/**
 * BenefitsSectionWrapper — CMS query + static fallback.
 *
 * Same pattern as HeroSection:
 * 1. Query CMS data for benefits section (pageSlug: "home", sectionSlug: "benefits")
 * 2. If CMS published + has items → render BenefitsSection with CMS items
 * 3. If no CMS data or unpublished → render BenefitsSection with hardcoded fallback
 */
export function BenefitsSectionWrapper() {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "home",
    sectionSlug: "benefits",
  })

  // Loading — return null (section will pop in, acceptable for marketing page)
  if (section === undefined) return null

  // No CMS data or unpublished → hidden
  if (section === null || !section.isPublished) return null

  // CMS data with items → pass to BenefitsSection
  const items = section.items?.map((item) => ({
    title: item.title,
    description: item.description,
  }))

  return (
    <BenefitsSection
      items={items}
      showGridPattern={section.showGridPattern}
      showDiagonalStripes={section.showDiagonalStripes}
      showDottedPattern={section.showDottedPattern}
    />
  )
}

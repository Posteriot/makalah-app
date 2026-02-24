"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { HeroCMS } from "./HeroCMS"

/**
 * HeroSection — wrapper component with CMS query.
 *
 * 1. Query CMS data for hero section (pageSlug: "home", sectionSlug: "hero")
 * 2. If CMS published → render HeroCMS with editable text + image
 * 3. If no CMS data or unpublished → hidden (return null)
 */
export function HeroSection() {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "home",
    sectionSlug: "hero",
  })

  // Loading — return null (hero will pop in, acceptable for marketing page)
  if (section === undefined) return null

  // No CMS data or unpublished → hidden
  if (section === null || !section.isPublished) return null

  // CMS data → render CMS version
  return <HeroCMS content={section} />
}

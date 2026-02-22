"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { RefrasaFeatureStatic } from "./RefrasaFeatureStatic"
import { RefrasaFeatureCMS } from "./RefrasaFeatureCMS"

export function RefrasaFeatureSection() {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "home",
    sectionSlug: "features-refrasa",
  })

  if (section === undefined) return null
  // No CMS data or unpublished → hidden
  if (section === null || !section.isPublished) return null
  return <RefrasaFeatureCMS content={section} />
}

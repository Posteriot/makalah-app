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
  if (section === null || !section.isPublished) {
    return <RefrasaFeatureStatic />
  }
  return <RefrasaFeatureCMS content={section} />
}

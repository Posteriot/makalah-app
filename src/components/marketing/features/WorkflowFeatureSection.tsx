"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { WorkflowFeatureStatic } from "./WorkflowFeatureStatic"
import { WorkflowFeatureCMS } from "./WorkflowFeatureCMS"

export function WorkflowFeatureSection() {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "home",
    sectionSlug: "features-workflow",
  })

  // Loading — return null
  if (section === undefined) return null

  // No CMS data or unpublished → hidden
  if (section === null || !section.isPublished) return null

  // CMS data → render CMS version
  return <WorkflowFeatureCMS content={section} />
}

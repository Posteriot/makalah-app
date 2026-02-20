"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { AgentsSectionStatic } from "./AgentsSectionStatic"
import { AgentsSectionCMS } from "./AgentsSectionCMS"

export function AgentsSection() {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "about",
    sectionSlug: "agents",
  })

  // Loading
  if (section === undefined) return null

  // No CMS data or unpublished → static fallback
  if (section === null || !section.isPublished) return <AgentsSectionStatic />

  // CMS published
  return <AgentsSectionCMS content={section} />
}

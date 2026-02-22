"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { ProblemsSectionStatic } from "./ProblemsSectionStatic"
import { ProblemsSectionCMS } from "./ProblemsSectionCMS"

export function ProblemsSection() {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "about",
    sectionSlug: "problems",
  })

  if (section === undefined) return null
  // No CMS data or unpublished → hidden
  if (section === null || !section.isPublished) return null
  return <ProblemsSectionCMS content={section} />
}

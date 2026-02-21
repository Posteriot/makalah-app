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
  if (section === null || !section.isPublished) return <ProblemsSectionStatic />
  return <ProblemsSectionCMS content={section} />
}

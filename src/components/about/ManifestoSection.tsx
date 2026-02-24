"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { ManifestoSectionCMS } from "./ManifestoSectionCMS"

export function ManifestoSection() {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "about",
    sectionSlug: "manifesto",
  })

  // Loading
  if (section === undefined) return null

  // No CMS data or unpublished → hidden
  if (section === null || !section.isPublished) return null

  // CMS published
  return <ManifestoSectionCMS content={section} />
}

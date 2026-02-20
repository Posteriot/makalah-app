"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { CareerContactSectionStatic } from "./CareerContactSectionStatic"
import { CareerContactSectionCMS } from "./CareerContactSectionCMS"

export function CareerContactSection() {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "about",
    sectionSlug: "career-contact",
  })

  // Loading
  if (section === undefined) return null

  // No CMS data or unpublished → static fallback
  if (section === null || !section.isPublished) return <CareerContactSectionStatic />

  // CMS published
  return <CareerContactSectionCMS content={section} />
}

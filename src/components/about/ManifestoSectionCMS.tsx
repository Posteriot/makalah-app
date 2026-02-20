"use client"

import { useEffect, useRef, useState } from "react"
import type { Doc } from "@convex/_generated/dataModel"
import { SectionBadge } from "@/components/ui/section-badge"
import {
  GridPattern,
  DiagonalStripes,
  DottedPattern,
} from "@/components/marketing/SectionBackground"
import { ManifestoTerminalPanel } from "./ManifestoTerminalPanel"
import { ManifestoMobileAccordion } from "./ManifestoMobileAccordion"

type ManifestoSectionCMSProps = {
  content: Doc<"pageContent">
}

export function ManifestoSectionCMS({ content }: ManifestoSectionCMSProps) {
  const headingLines = content.headingLines ?? ["Kolaborasi", "Penumbuh", "Pikiran"]
  const subheading = content.subheading ?? ""
  const paragraphs = content.paragraphs ?? []
  const badgeText = content.badgeText ?? "Tentang Kami"

  // Mobile accordion state (same as static)
  const [isManifestoOpen, setIsManifestoOpen] = useState(false)
  const sectionRef = useRef<HTMLElement | null>(null)
  const closeScrollTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (closeScrollTimeoutRef.current !== null) {
        window.clearTimeout(closeScrollTimeoutRef.current)
      }
    }
  }, [])

  const handleManifestoOpenChange = (nextOpen: boolean) => {
    setIsManifestoOpen(nextOpen)
    if (nextOpen || typeof window === "undefined") return
    if (!window.matchMedia("(max-width: 1023px)").matches) return
    if (closeScrollTimeoutRef.current !== null) {
      window.clearTimeout(closeScrollTimeoutRef.current)
    }
    closeScrollTimeoutRef.current = window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      closeScrollTimeoutRef.current = null
    }, 220)
  }

  // Mobile heading = first sentence of first paragraph
  const mobileHeading = paragraphs[0]?.split(". ")[0] + "." || ""
  const mobileParagraphs = [
    paragraphs[0]?.replace(mobileHeading + " ", "") ?? "",
    ...paragraphs.slice(1),
  ].filter(Boolean)

  return (
    <section
      ref={sectionRef}
      className="relative isolate min-h-[100svh] overflow-hidden bg-background"
      style={{ paddingTop: "var(--header-h)" }}
      id="manifesto"
    >
      <GridPattern className="z-0 opacity-80" />
      <DiagonalStripes className="opacity-75" />
      <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-40" />

      <div className="relative z-[1] mx-auto flex min-h-[100svh] w-full max-w-[var(--container-max-width)] items-center px-4 py-10 md:px-6 md:py-20">
        <div className="grid grid-cols-1 gap-comfort lg:grid-cols-16 lg:gap-16">
          <div className="flex flex-col items-start justify-center text-left lg:col-span-7">
            <SectionBadge>{badgeText}</SectionBadge>
            <h1 className="text-interface mt-6 text-5xl font-medium leading-[0.82] tracking-[-0.06em] text-foreground md:text-5xl lg:text-7xl">
              {headingLines.map((line) => (
                <span key={line} className="block">{line}</span>
              ))}
            </h1>
            <p className="text-narrative text-base md:text-2xl font-normal text-[color:var(--slate-600)] dark:text-[color:var(--slate-200)] max-w-[520px] mt-4 mb-0">
              {subheading}
            </p>

            <div className="mt-6 w-full lg:hidden">
              <ManifestoMobileAccordion
                heading={mobileHeading}
                paragraphs={mobileParagraphs}
                isOpen={isManifestoOpen}
                onOpenChange={handleManifestoOpenChange}
              />
            </div>
          </div>

          <div className="hidden lg:col-span-9 lg:flex lg:self-stretch lg:min-h-full lg:items-center lg:justify-end lg:-translate-y-8">
            <ManifestoTerminalPanel paragraphs={paragraphs} />
          </div>
        </div>
      </div>
    </section>
  )
}

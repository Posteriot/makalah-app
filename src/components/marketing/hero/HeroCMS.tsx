"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Doc } from "@convex/_generated/dataModel"
import { SectionBadge } from "@/components/ui/section-badge"
import { SectionCTA } from "@/components/ui/section-cta"
import { GridPattern, DiagonalStripes } from "@/components/marketing/SectionBackground"
import { HeroHeadingSvg } from "./HeroHeadingSvg"
import { HeroResearchMock } from "./HeroResearchMock"
import { ChatInputHeroMock } from "./ChatInputHeroMock"

type HeroCMSProps = {
  content: Doc<"pageContent">
}

/**
 * HeroCMS — CMS-driven hero section.
 *
 * Render hero dengan konten dari database (title, subtitle, badge, CTA, image).
 * Layout dan background patterns tetap sama dengan versi static.
 */
export function HeroCMS({ content }: HeroCMSProps) {
  const imageUrl = useQuery(
    api.pageContent.getImageUrl,
    content.primaryImageId ? { storageId: content.primaryImageId } : "skip"
  )

  const headingDarkUrl = useQuery(
    api.pageContent.getImageUrl,
    content.headingImageDarkId ? { storageId: content.headingImageDarkId } : "skip"
  )
  const headingLightUrl = useQuery(
    api.pageContent.getImageUrl,
    content.headingImageLightId ? { storageId: content.headingImageLightId } : "skip"
  )

  const hasCmsHeading = headingDarkUrl || headingLightUrl

  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-background">
      <GridPattern className="z-0 opacity-80" />
      <DiagonalStripes className="opacity-80" />

      <div className="relative z-[1] mx-auto flex min-h-[100svh] max-w-7xl items-center px-4 py-10 md:px-8 md:py-24">
        <div className="grid grid-cols-1 gap-comfort lg:grid-cols-16 lg:gap-16">
          {/* Left - Text from CMS */}
          <div className="flex flex-col items-start text-left justify-center lg:col-span-7 lg:justify-start">
            {content.badgeText && (
              <SectionBadge href="/about" className="mb-4">
                {content.badgeText}
              </SectionBadge>
            )}

            {hasCmsHeading ? (
              <h1 className="text-[0px] mt-4 leading-[0] w-full">
                <span className="sr-only">{content.title ?? "Makalah AI"}</span>
                <span className="block w-full max-w-[520px] h-auto" aria-hidden="true">
                  {headingDarkUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={headingDarkUrl}
                      alt=""
                      className="hidden dark:block w-full h-auto object-contain"
                    />
                  )}
                  {headingLightUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={headingLightUrl}
                      alt=""
                      className="block dark:hidden w-full h-auto object-contain"
                    />
                  )}
                </span>
              </h1>
            ) : content.title ? (
              <h1 className="text-narrative text-3xl md:text-5xl font-semibold tracking-tight mt-4 max-w-[520px]">
                {content.title}
              </h1>
            ) : (
              <h1 className="text-[0px] mt-4 leading-[0] w-full">
                <span className="sr-only">Makalah AI</span>
                <HeroHeadingSvg />
              </h1>
            )}

            {content.subtitle && (
              <p className="text-narrative text-base md:text-2xl font-normal text-slate-600 dark:text-slate-200 max-w-[520px] mt-4 mb-0">
                {content.subtitle}
              </p>
            )}

            {content.ctaText && content.ctaHref && (
              <div className="mt-4 w-full">
                <div className="flex flex-col items-center lg:items-start w-full mt-4 gap-3">
                  <div className="flex w-full justify-center lg:justify-start">
                    <SectionCTA href={content.ctaHref}>
                      {content.ctaText}
                    </SectionCTA>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right - Mockup or CMS image */}
          <div className="hidden lg:flex lg:col-span-9 lg:items-center lg:justify-end">
            <div className="relative h-[480px] w-full max-w-[560px]">
              {imageUrl ? (
                <div className="absolute w-full transition-all duration-300 rounded-md dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.2)] shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.3)] z-10 top-1/2 -translate-y-1/2 scale-[0.88] -translate-x-[60px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={content.primaryImageAlt ?? "Hero"}
                    className="h-auto w-full rounded-md"
                  />
                </div>
              ) : (
                <HeroResearchMock />
              )}
              <ChatInputHeroMock />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

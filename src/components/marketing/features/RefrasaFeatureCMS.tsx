"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Doc } from "@convex/_generated/dataModel"
import { SectionBadge } from "@/components/ui/section-badge"
import { GridPattern, DiagonalStripes, DottedPattern } from "@/components/marketing/SectionBackground"

type RefrasaFeatureCMSProps = {
  content: Doc<"pageContent">
}

export function RefrasaFeatureCMS({ content }: RefrasaFeatureCMSProps) {
  const lightImageUrl = useQuery(
    api.pageContent.getImageUrl,
    content.primaryImageId ? { storageId: content.primaryImageId } : "skip"
  )
  const darkImageUrl = useQuery(
    api.pageContent.getImageUrl,
    content.secondaryImageId ? { storageId: content.secondaryImageId } : "skip"
  )

  return (
    <section
      id="fitur-refrasa"
      className="relative isolate min-h-[100svh] overflow-hidden bg-[var(--section-bg-alt)]"
    >
      {content.showGridPattern !== false && <GridPattern className="z-0 opacity-80" />}
      {content.showDiagonalStripes !== false && <DiagonalStripes className="opacity-40" />}
      {content.showDottedPattern !== false && <DottedPattern spacing={24} withRadialMask={true} />}

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl items-center px-4 py-6 sm:py-8 md:px-8 md:py-20">
        <div className="grid w-full grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:items-stretch lg:gap-16">
          {/* Left — Text from CMS */}
          <div className="order-1 lg:col-span-6 lg:flex lg:h-full lg:flex-col lg:justify-center">
            <div className="space-y-5 sm:space-y-6 lg:ml-auto lg:max-w-[520px] lg:space-y-7">
              <div>
                {content.badgeText && (
                  <SectionBadge>{content.badgeText}</SectionBadge>
                )}
                <p className="mt-4 text-signal text-xs font-bold uppercase tracking-[0.26em] text-[color:var(--amber-500)]">
                  Refrasa
                </p>
                {content.title && (
                  <h2 className="mt-3 text-narrative text-3xl leading-tight md:text-4xl font-medium tracking-tight text-foreground">
                    {content.title}
                  </h2>
                )}
              </div>

              {content.description && (
                <p className="max-w-[580px] text-interface text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {content.description}
                </p>
              )}
            </div>
          </div>

          {/* Right — Image/Mock */}
          <div className="order-2 lg:col-span-6">
            <div className="relative mx-auto w-full max-w-[320px] rounded-xl shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.18)] dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.22)] sm:max-w-[360px] md:max-w-[420px] lg:mx-0 lg:ml-0 lg:mr-auto lg:max-w-[452px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightImageUrl ?? "/images/refrasa-feature-mock-light.png"}
                alt={content.primaryImageAlt ?? "Mockup fitur Refrasa Makalah AI"}
                className="h-auto w-full dark:hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={darkImageUrl ?? "/images/refrasa-feature-mock-dark.png"}
                alt={content.primaryImageAlt ?? "Mockup fitur Refrasa Makalah AI"}
                className="hidden h-auto w-full dark:block"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

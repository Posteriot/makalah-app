"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Doc } from "@convex/_generated/dataModel"
import { SectionBadge } from "@/components/ui/section-badge"
import { GridPattern, DiagonalStripes, DottedPattern } from "@/components/marketing/SectionBackground"

type WorkflowFeatureCMSProps = {
  content: Doc<"pageContent">
}

export function WorkflowFeatureCMS({ content }: WorkflowFeatureCMSProps) {
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
      id="fitur-workflow"
      className="relative isolate bg-background md:min-h-[100svh] md:overflow-hidden"
    >
      {content.showGridPattern !== false && <GridPattern className="z-0 opacity-80" />}
      {content.showDiagonalStripes !== false && <DiagonalStripes className="opacity-70" />}
      {content.showDottedPattern !== false && <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-80" />}

      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-start px-4 py-8 sm:py-10 md:min-h-[100svh] md:items-center md:px-8 md:py-20">
        <div className="grid w-full grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:items-stretch lg:gap-16">
          {/* Left — Image/Mock (same layout order as static) */}
          <div className="order-2 lg:order-1 lg:col-span-6">
            <div className="relative mx-auto w-full max-w-[320px] rounded-xl shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.18)] dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.22)] sm:max-w-[360px] md:max-w-[420px] lg:mx-0 lg:ml-auto lg:mr-0 lg:max-w-[452px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightImageUrl ?? "/images/workflow-feature-mock-light.png"}
                alt={content.primaryImageAlt ?? "Mockup fitur Workflow Makalah AI"}
                className="h-auto w-full dark:hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={darkImageUrl ?? "/images/workflow-feature-mock-dark.png"}
                alt={content.primaryImageAlt ?? "Mockup fitur Workflow Makalah AI"}
                className="hidden h-auto w-full dark:block"
              />
            </div>
          </div>

          {/* Right — Text from CMS */}
          <div className="order-1 lg:order-2 lg:col-span-6 lg:flex lg:h-full lg:flex-col lg:justify-center">
            <div className="space-y-5 sm:space-y-6 lg:mr-auto lg:max-w-[520px] lg:space-y-7">
              <div>
                {content.badgeText && (
                  <SectionBadge>{content.badgeText}</SectionBadge>
                )}
                <p className="mt-4 text-signal text-xs font-bold uppercase tracking-[0.26em] text-[color:var(--amber-500)]">
                  Workflow
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
        </div>
      </div>
    </section>
  )
}

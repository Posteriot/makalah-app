"use client"

import { GraphUp } from "iconoir-react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { SuccessRateChart } from "./charts/SuccessRateChart"
import { LatencyOverviewChart } from "./charts/LatencyOverviewChart"
import { ToolHealthBars } from "./charts/ToolHealthBars"
import { FailoverTimeline } from "./charts/FailoverTimeline"
import { AiSummaryNarrative } from "./charts/AiSummaryNarrative"

type AiPerformanceReportProps = {
  userId: Id<"users">
}

export function AiPerformanceReport({ userId }: AiPerformanceReportProps) {
  const report = useQuery(api.aiTelemetry.getDashboardReport, {
    requestorUserId: userId,
  })

  // Loading state
  if (report === undefined) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-64 rounded-action bg-muted" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="h-48 rounded-shell bg-muted" />
          <div className="h-48 rounded-shell bg-muted" />
          <div className="h-48 rounded-shell bg-muted" />
          <div className="h-48 rounded-shell bg-muted" />
        </div>
        <div className="h-16 rounded-action bg-muted" />
      </div>
    )
  }

  // Empty state
  if (report.totalRequests === 0) {
    return (
      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
        <div className="border-b border-border bg-slate-200/45 px-4 py-3 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <GraphUp className="h-4 w-4 text-sky-500" />
            <h2 className="text-interface text-base font-medium text-foreground">
              Laporan Kinerja AI
            </h2>
          </div>
        </div>
        <div className="p-4">
          <p className="font-mono text-xs text-muted-foreground">
            Belum ada data telemetri untuk 7 hari terakhir.
          </p>
        </div>
      </div>
    )
  }

  const totalRequests = report.totalRequests
  const failureCount = report.failureCount
  const successRate =
    totalRequests > 0 ? (report.successCount / totalRequests) * 100 : 0

  const avgLatencyMs = report.avgLatencyMs
  const minLatencyMs = report.minLatencyMs
  const maxLatencyMs = report.maxLatencyMs

  const failoverCount = report.failoverTimeline.length
  const failoverAllSuccess =
    failoverCount === 0 ||
    report.failoverTimeline.every((e) => e.success)

  // Map dailySuccessRates for chart (rate as percentage)
  const dailyRates = report.dailySuccessRates.map((d) => ({
    date: d.date,
    rate: d.successRate * 100,
    total: d.total,
  }))

  // Map toolGroups for ToolHealthBars
  const toolGroups = report.toolGroups.map((g) => ({
    name: g.group,
    total: g.totalRequests,
    failures: g.failureCount,
    successRate: g.successRate * 100,
  }))

  // Map failoverTimeline for FailoverTimeline
  const failoverTimeline = report.failoverTimeline.map((e) => ({
    createdAt: e.createdAt,
    errorType: e.errorType ?? "unknown",
  }))

  return (
    <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
      <div className="border-b border-border bg-slate-200/45 px-4 py-3 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <GraphUp className="h-4 w-4 text-sky-500" />
          <h2 className="text-signal text-[10px] font-bold tracking-wider text-muted-foreground">
            LAPORAN KINERJA AI — 7 HARI TERAKHIR
          </h2>
        </div>
      </div>

      <div className="p-4">
        {/* 2x2 chart grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-shell border border-border bg-card/70 p-4 dark:bg-slate-900/70">
            <SuccessRateChart
              dailyRates={dailyRates}
              successRate={successRate}
              totalRequests={totalRequests}
              failureCount={failureCount}
            />
          </div>

          <div className="rounded-shell border border-border bg-card/70 p-4 dark:bg-slate-900/70">
            <LatencyOverviewChart
              avgLatencyMs={avgLatencyMs}
              minLatencyMs={minLatencyMs}
              maxLatencyMs={maxLatencyMs}
              latencyTiers={report.latencyTiers}
            />
          </div>

          <div className="rounded-shell border border-border bg-card/70 p-4 dark:bg-slate-900/70">
            <ToolHealthBars toolGroups={toolGroups} />
          </div>

          <div className="rounded-shell border border-border bg-card/70 p-4 dark:bg-slate-900/70">
            <FailoverTimeline
              failoverCount={failoverCount}
              failoverCauses={report.failoverCauses}
              failoverAllSuccess={failoverAllSuccess}
              failoverTimeline={failoverTimeline}
            />
          </div>
        </div>

        {/* Summary narrative */}
        <div className="mt-4">
          <AiSummaryNarrative
            successRate={successRate}
            totalRequests={totalRequests}
            failureCount={failureCount}
            avgLatencyMs={avgLatencyMs}
            failoverCount={failoverCount}
            failoverAllSuccess={failoverAllSuccess}
            toolGroups={toolGroups}
          />
        </div>

        {/* Link to AI Ops */}
        <div className="mt-3 text-right">
          <Link
            href="/ai-ops"
            className="focus-ring font-mono text-xs text-sky-600 transition-colors hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
          >
            Lihat Detail di AI Ops →
          </Link>
        </div>
      </div>
    </div>
  )
}

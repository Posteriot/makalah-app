"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { AI_OPS_SIDEBAR_ITEMS, findAiOpsTabConfig, type AiOpsTabId } from "./aiOpsConfig"

import { MemoryHealthPanel } from "./panels/MemoryHealthPanel"
import { WorkflowProgressPanel } from "./panels/WorkflowProgressPanel"
import { ArtifactSyncPanel } from "./panels/ArtifactSyncPanel"
import { InsightBanner } from "./panels/InsightBanner"
import { SessionListPanel } from "./panels/SessionListPanel"
import { DroppedKeysPanel } from "./panels/DroppedKeysPanel"
import { OverviewStatsPanel } from "./panels/OverviewStatsPanel"
import { ProviderHealthPanel } from "./panels/ProviderHealthPanel"
import { ToolHealthPanel } from "./panels/ToolHealthPanel"
import { LatencyDistributionPanel } from "./panels/LatencyDistributionPanel"
import { RecentFailuresPanel } from "./panels/RecentFailuresPanel"
import { FailoverTimelinePanel } from "./panels/FailoverTimelinePanel"
import { SkillRuntimeOverviewPanel } from "./panels/SkillRuntimeOverviewPanel"
import { SkillRuntimeTracePanel } from "./panels/SkillRuntimeTracePanel"
import { SkillMonitorSummaryPanel } from "./panels/SkillMonitorSummaryPanel"

type Period = "1h" | "24h" | "7d"

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "1h", label: "1j" },
  { value: "24h", label: "24j" },
  { value: "7d", label: "7h" },
]

type AiOpsContentSectionProps = {
  activeTab: AiOpsTabId
  userId: Id<"users">
}

export function AiOpsContentSection({
  activeTab,
  userId,
}: AiOpsContentSectionProps) {
  const [period, setPeriod] = useState<Period>("24h")

  const currentTab =
    findAiOpsTabConfig(activeTab) ?? AI_OPS_SIDEBAR_ITEMS[0]
  const HeaderIcon = currentTab.headerIcon

  const isModelTab = activeTab.startsWith("model.")
  const isSkillMonitorTab = activeTab === "skill.monitor"
  const isOverview = activeTab === "overview"

  // ── Paper workflow queries (skip when not on relevant tab) ──
  const memoryHealth = useQuery(
    api.aiOps.getMemoryHealthStats,
    isOverview || activeTab === "paper.memory" ? {} : "skip"
  )
  const workflowProgress = useQuery(
    api.aiOps.getWorkflowProgressStats,
    isOverview ? {} : "skip"
  )
  const artifactSync = useQuery(
    api.aiOps.getArtifactSyncStats,
    isOverview || activeTab === "paper.artifacts" ? {} : "skip"
  )
  const sessions = useQuery(
    api.aiOps.getSessionList,
    activeTab === "paper.sessions" ? { limit: 20 } : "skip"
  )
  const droppedKeys = useQuery(
    api.aiOps.getDroppedKeysAggregation,
    activeTab === "paper.memory" ? {} : "skip"
  )

  // ── Model health queries (skip when not on model tab) ──
  const overviewStats = useQuery(
    api.aiTelemetry.getOverviewStats,
    activeTab === "model.overview"
      ? { requestorUserId: userId, period }
      : "skip"
  )
  const providerHealth = useQuery(
    api.aiTelemetry.getProviderHealth,
    activeTab === "model.overview"
      ? { requestorUserId: userId, period }
      : "skip"
  )
  const toolHealth = useQuery(
    api.aiTelemetry.getToolHealth,
    activeTab === "model.tools"
      ? { requestorUserId: userId, period }
      : "skip"
  )
  const latencyDistribution = useQuery(
    api.aiTelemetry.getLatencyDistribution,
    activeTab === "model.tools"
      ? { requestorUserId: userId, period }
      : "skip"
  )
  const recentFailures = useQuery(
    api.aiTelemetry.getRecentFailures,
    activeTab === "model.failures"
      ? { requestorUserId: userId, limit: 20 }
      : "skip"
  )
  const failoverTimeline = useQuery(
    api.aiTelemetry.getFailoverTimeline,
    activeTab === "model.failures"
      ? { requestorUserId: userId, period }
      : "skip"
  )
  const skillRuntimeOverview = useQuery(
    api.aiTelemetry.getSkillRuntimeOverview,
    isSkillMonitorTab || isOverview
      ? {
        requestorUserId: userId,
        period: isOverview ? "24h" : period,
      }
      : "skip"
  )
  const skillRuntimeTrace = useQuery(
    api.aiTelemetry.getSkillRuntimeTrace,
    isSkillMonitorTab
      ? { requestorUserId: userId, period, limit: 60 }
      : "skip"
  )

  return (
    <main className="col-span-1 pt-4 md:col-span-12">
      <div className="mx-auto w-full max-w-4xl rounded-[16px] border-[0.5px] border-border bg-card/90 px-5 py-6 backdrop-blur-[1px] dark:bg-slate-900 md:px-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="font-sans flex items-center gap-2 text-2xl font-medium tracking-tight text-foreground md:text-3xl">
              <HeaderIcon className="h-6 w-6 text-foreground" />
              {currentTab.headerTitle}
            </h1>
            <p className="font-sans text-sm text-muted-foreground">
              {currentTab.headerDescription}
            </p>
          </div>

          {(isModelTab || isSkillMonitorTab) && (
            <div className="flex items-center gap-1 rounded-[8px] border border-border p-0.5">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={cn(
                    "rounded-[8px] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors",
                    period === opt.value
                      ? "bg-emerald-700 text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <MemoryHealthPanel data={memoryHealth} />
              <WorkflowProgressPanel data={workflowProgress} />
              <ArtifactSyncPanel data={artifactSync} />
              <SkillMonitorSummaryPanel data={skillRuntimeOverview ?? undefined} />
            </div>
            <InsightBanner
              memoryHealth={memoryHealth}
              workflowProgress={workflowProgress}
              artifactSync={artifactSync}
              skillRuntime={skillRuntimeOverview ?? undefined}
            />
          </div>
        )}

        {activeTab === "paper.sessions" && (
          <SessionListPanel sessions={sessions} />
        )}

        {activeTab === "paper.memory" && (
          <div className="space-y-6">
            <MemoryHealthPanel data={memoryHealth} />
            <DroppedKeysPanel data={droppedKeys} />
          </div>
        )}

        {activeTab === "paper.artifacts" && (
          <ArtifactSyncPanel data={artifactSync} />
        )}

        {activeTab === "model.overview" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <OverviewStatsPanel data={overviewStats ?? undefined} />
            <ProviderHealthPanel data={providerHealth ?? undefined} />
          </div>
        )}

        {activeTab === "model.tools" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ToolHealthPanel data={toolHealth ?? undefined} />
            <LatencyDistributionPanel data={latencyDistribution ?? undefined} />
          </div>
        )}

        {activeTab === "model.failures" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RecentFailuresPanel data={recentFailures ?? undefined} />
            <FailoverTimelinePanel data={failoverTimeline ?? undefined} />
          </div>
        )}

        {activeTab === "skill.monitor" && (
          <div className="space-y-4">
            <SkillRuntimeOverviewPanel data={skillRuntimeOverview ?? undefined} />
            <SkillRuntimeTracePanel data={skillRuntimeTrace ?? undefined} />
          </div>
        )}
      </div>
    </main>
  )
}

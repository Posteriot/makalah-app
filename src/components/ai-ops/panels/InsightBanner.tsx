"use client"

import { WarningTriangle, InfoCircle } from "iconoir-react"

interface Insight {
  severity: "warning" | "info"
  message: string
}

interface MemoryHealthData {
  totalActive: number
  avgDigestEntries: number
  sessionsWithSuperseded: number
  sessionsWithDirty: number
}

interface WorkflowProgressData {
  totalSessions: number
  activeSessions: number
  completedSessions: number
  completionRate: number
  inRevision: number
  totalRewinds: number
}

interface ArtifactSyncData {
  totalArtifacts: number
  invalidatedPending: number
}

interface SkillRuntimeOverviewData {
  totalRequests: number
  skillAppliedCount: number
  fallbackCount: number
  fallbackRate: number
  topFallbackReasons: Array<{ reason: string; count: number }>
}

function formatReason(reason: string): string {
  if (reason === "unknown") return "Unknown"
  return reason.replace(/_/g, " ")
}

function generateInsights(
  memory: MemoryHealthData | undefined,
  workflow: WorkflowProgressData | undefined,
  artifacts: ArtifactSyncData | undefined,
  skillRuntime: SkillRuntimeOverviewData | undefined
): Insight[] {
  const insights: Insight[] = []

  if (memory) {
    if (memory.sessionsWithDirty > 0) {
      insights.push({
        severity: "warning",
        message: `${memory.sessionsWithDirty} sesi memiliki data yang tidak sinkron (dirty). User sebaiknya minta AI menyimpan ulang data sebelum approve.`,
      })
    }
    if (memory.sessionsWithSuperseded > 0) {
      insights.push({
        severity: "info",
        message: `${memory.sessionsWithSuperseded} sesi memiliki digest entries yang sudah di-supersede oleh rewind. Entries ini sudah difilter dari prompt AI.`,
      })
    }
  }

  if (workflow) {
    if (workflow.completionRate < 10 && workflow.totalSessions > 5) {
      insights.push({
        severity: "warning",
        message: `Completion rate rendah (${workflow.completionRate}%). Banyak sesi yang tidak dilanjutkan user.`,
      })
    }
    if (workflow.inRevision > 3) {
      insights.push({
        severity: "warning",
        message: `${workflow.inRevision} sesi dalam status revision. Kemungkinan user kesulitan di tahap tertentu.`,
      })
    }
  }

  if (artifacts) {
    if (artifacts.invalidatedPending > 0) {
      insights.push({
        severity: "info",
        message: `${artifacts.invalidatedPending} artifact menunggu update setelah rewind. Artifact lama masih tersimpan tapi ditandai invalidated.`,
      })
    }
  }

  if (skillRuntime && skillRuntime.totalRequests > 0) {
    if (skillRuntime.fallbackRate > 0.2) {
      const topReason = skillRuntime.topFallbackReasons[0]
      insights.push({
        severity: "warning",
        message: `Fallback skill monitor tinggi (${(skillRuntime.fallbackRate * 100).toFixed(1)}%).${topReason ? ` Penyebab utama: ${formatReason(topReason.reason)}.` : ""}`,
      })
    } else if (skillRuntime.fallbackCount > 0) {
      insights.push({
        severity: "info",
        message: `${skillRuntime.fallbackCount} runtime memakai fallback. Monitor detail ada di tab Skill Monitor.`,
      })
    }
  }

  return insights
}

const SEVERITY_STYLES = {
  warning: {
    border: "border-l-amber-500",
    icon: WarningTriangle,
    iconColor: "text-amber-500",
  },
  info: {
    border: "border-l-sky-500",
    icon: InfoCircle,
    iconColor: "text-sky-500",
  },
}

export function InsightBanner({
  memoryHealth,
  workflowProgress,
  artifactSync,
  skillRuntime,
}: {
  memoryHealth: MemoryHealthData | undefined
  workflowProgress: WorkflowProgressData | undefined
  artifactSync: ArtifactSyncData | undefined
  skillRuntime?: SkillRuntimeOverviewData | undefined
}) {
  const insights = generateInsights(
    memoryHealth,
    workflowProgress,
    artifactSync,
    skillRuntime
  )

  if (insights.length === 0) return null

  return (
    <div className="rounded-[16px] border border-border p-4 mb-8">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 block">
        Insights
      </span>
      <div className="space-y-2">
        {insights.map((insight, i) => {
          const style = SEVERITY_STYLES[insight.severity]
          const Icon = style.icon
          return (
            <div
              key={i}
              className={`flex items-start gap-2.5 border-l-2 ${style.border} pl-3 py-1.5`}
            >
              <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${style.iconColor}`} />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {insight.message}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

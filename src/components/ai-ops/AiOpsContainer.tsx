"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { ArrowLeft, Activity } from "iconoir-react"
import Link from "next/link"
import { MemoryHealthPanel } from "./panels/MemoryHealthPanel"
import { WorkflowProgressPanel } from "./panels/WorkflowProgressPanel"
import { ArtifactSyncPanel } from "./panels/ArtifactSyncPanel"
import { SessionListPanel } from "./panels/SessionListPanel"
import { InsightBanner } from "./panels/InsightBanner"
import { DroppedKeysPanel } from "./panels/DroppedKeysPanel"
import { ModelHealthSection } from "./ModelHealthSection"

export function AiOpsContainer() {
  const memoryHealth = useQuery(api.aiOps.getMemoryHealthStats)
  const workflowProgress = useQuery(api.aiOps.getWorkflowProgressStats)
  const artifactSync = useQuery(api.aiOps.getArtifactSyncStats)
  const sessions = useQuery(api.aiOps.getSessionList, { limit: 20 })
  const droppedKeys = useQuery(api.aiOps.getDroppedKeysAggregation)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 font-mono transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Admin Panel
        </Link>
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">AI OPS DASHBOARD</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          Paper workflow observability &amp; memory health monitoring
        </p>
      </div>

      {/* Overview Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MemoryHealthPanel data={memoryHealth} />
        <WorkflowProgressPanel data={workflowProgress} />
        <ArtifactSyncPanel data={artifactSync} />
      </div>

      {/* Insights */}
      <InsightBanner
        memoryHealth={memoryHealth}
        workflowProgress={workflowProgress}
        artifactSync={artifactSync}
      />

      {/* Dropped Keys */}
      <DroppedKeysPanel data={droppedKeys} />

      {/* Session List */}
      <SessionListPanel sessions={sessions} />

      {/* Section Divider */}
      <div className="my-10 border-t border-border/30" />

      {/* Model & Tool Health */}
      <ModelHealthSection />
    </div>
  )
}

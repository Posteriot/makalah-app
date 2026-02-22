"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { AntennaSignal } from "iconoir-react"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { OverviewStatsPanel } from "./panels/OverviewStatsPanel"
import { ProviderHealthPanel } from "./panels/ProviderHealthPanel"
import { ToolHealthPanel } from "./panels/ToolHealthPanel"
import { LatencyDistributionPanel } from "./panels/LatencyDistributionPanel"
import { RecentFailuresPanel } from "./panels/RecentFailuresPanel"
import { FailoverTimelinePanel } from "./panels/FailoverTimelinePanel"

type Period = "1h" | "24h" | "7d"

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "1h", label: "1j" },
  { value: "24h", label: "24j" },
  { value: "7d", label: "7h" },
]

export function ModelHealthSection() {
  const [period, setPeriod] = useState<Period>("24h")
  const { user } = useCurrentUser()

  const userId = user?._id

  const overviewStats = useQuery(
    api.aiTelemetry.getOverviewStats,
    userId ? { requestorUserId: userId, period } : "skip"
  )
  const providerHealth = useQuery(
    api.aiTelemetry.getProviderHealth,
    userId ? { requestorUserId: userId, period } : "skip"
  )
  const toolHealth = useQuery(
    api.aiTelemetry.getToolHealth,
    userId ? { requestorUserId: userId, period } : "skip"
  )
  const latencyDistribution = useQuery(
    api.aiTelemetry.getLatencyDistribution,
    userId ? { requestorUserId: userId, period } : "skip"
  )
  const recentFailures = useQuery(
    api.aiTelemetry.getRecentFailures,
    userId ? { requestorUserId: userId, limit: 20 } : "skip"
  )
  const failoverTimeline = useQuery(
    api.aiTelemetry.getFailoverTimeline,
    userId ? { requestorUserId: userId, period } : "skip"
  )

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <AntennaSignal className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">
              MODEL &amp; TOOL HEALTH
            </h2>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
            Monitoring kesehatan provider AI, tool, dan latensi
          </p>
        </div>

        {/* Period Toggle */}
        <div className="flex items-center gap-1 border border-border rounded-action p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={cn(
                "px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors rounded-action",
                period === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Overview + Provider Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <OverviewStatsPanel data={overviewStats ?? undefined} />
        <ProviderHealthPanel data={providerHealth ?? undefined} />
      </div>

      {/* Row 2: Tool Health + Latency Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <ToolHealthPanel data={toolHealth ?? undefined} />
        <LatencyDistributionPanel data={latencyDistribution ?? undefined} />
      </div>

      {/* Row 3: Recent Failures + Failover Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RecentFailuresPanel data={recentFailures ?? undefined} />
        <FailoverTimelinePanel data={failoverTimeline ?? undefined} />
      </div>
    </div>
  )
}

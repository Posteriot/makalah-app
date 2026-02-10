"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import {
  WarningCircle,
  CheckCircle,
  WarningTriangle,
  InfoCircle,
  Refresh,
} from "iconoir-react"
import { formatDistanceToNow } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface SystemHealthPanelProps {
  userId: Id<"users">
}

export function SystemHealthPanel({ userId }: SystemHealthPanelProps) {
  const [isResolving, setIsResolving] = useState<string | null>(null)

  // Queries
  const activePrompt = useQuery(api.systemPrompts.getActiveSystemPrompt)
  const alertCount = useQuery(api.systemAlerts.getUnresolvedAlertCount, {
    requestorUserId: userId,
  })
  const recentAlerts = useQuery(api.systemAlerts.getRecentAlerts, {
    requestorUserId: userId,
    limit: 10,
  })
  const fallbackStatus = useQuery(api.systemAlerts.isFallbackActive, {
    requestorUserId: userId,
  })

  // Mutations
  const resolveAlert = useMutation(api.systemAlerts.resolveAlert)
  const resolveAllFallback = useMutation(api.systemAlerts.resolveAlertsByType)

  const handleResolveAlert = async (alertId: Id<"systemAlerts">) => {
    setIsResolving(alertId)
    try {
      await resolveAlert({ alertId, requestorUserId: userId })
    } finally {
      setIsResolving(null)
    }
  }

  const handleResolveAllFallback = async () => {
    setIsResolving("all")
    try {
      await resolveAllFallback({
        alertType: "fallback_activated",
        requestorUserId: userId,
      })
    } finally {
      setIsResolving(null)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <WarningCircle className="h-4 w-4 text-destructive" />
      case "warning":
        return <WarningTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <InfoCircle className="h-4 w-4 text-blue-500" />
    }
  }

  // Loading state
  if (activePrompt === undefined || alertCount === undefined) {
    return (
      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
        <div className="border-b border-border bg-slate-200/45 px-6 py-5 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Refresh className="h-4 w-4 animate-spin text-muted-foreground" />
            <h3 className="text-interface text-sm font-semibold text-foreground">System Health</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const isFallbackMode = fallbackStatus?.active === true
  const hasUnresolvedAlerts = (alertCount?.total ?? 0) > 0

  return (
    <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
      <div className="border-b border-border bg-slate-200/45 px-6 py-5 dark:bg-slate-900/50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isFallbackMode ? (
                <WarningCircle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <h3 className="text-interface text-sm font-semibold text-foreground">System Health Monitoring</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Status real-time system prompt dan indikator alert monitoring
            </p>
          </div>
          {hasUnresolvedAlerts && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-badge text-[10px] font-mono font-bold uppercase tracking-wide bg-destructive text-white animate-pulse">
              {alertCount.total} Unresolved Alert{alertCount.total > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-border">
          {/* Section: System Prompt Status */}
          <div className="p-6 md:p-10 flex flex-col h-full">
            <h4 className="text-signal text-[10px] font-bold text-slate-500 mb-8 flex items-center gap-2">
              <Refresh className="h-3 w-3" />
              System Prompt Status
            </h4>

            <div className="flex-1">
              {isFallbackMode ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <WarningCircle className="h-5 w-5 text-destructive" />
                    <span className="font-bold text-destructive text-lg">FALLBACK MODE AKTIF</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                    Sistem saat ini beroperasi menggunakan hardcoded minimal prompt karena database prompt tidak tersedia.
                  </p>
                  {fallbackStatus?.lastActivation && (
                    <div className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded inline-block">
                      Diterapkan: {formatDistanceToNow(fallbackStatus.lastActivation, { addSuffix: true, locale: localeId })}
                    </div>
                  )}
                  <div className="pt-2">
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-action border border-hairline text-xs font-mono text-slate-300 hover:bg-slate-800 disabled:opacity-50 focus-ring"
                      onClick={handleResolveAllFallback}
                      disabled={isResolving === "all"}
                    >
                      {isResolving === "all" ? (
                        <Refresh className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      <span>Selesaikan Semua Fallback</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-success" />
                    <span className="font-bold text-success text-xl uppercase tracking-tight">Normal</span>
                  </div>

                  {activePrompt && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-4 text-sm">
                        <span className="text-muted-foreground font-medium border-r border-border/10 pr-2">Database Prompt</span>
                        <span className="text-foreground font-semibold uppercase">{activePrompt.name}</span>

                        <span className="text-muted-foreground font-medium border-r border-border/10 pr-2">Versi Sistem</span>
                        <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded w-fit border border-border/50">v{activePrompt.version}</span>

                        <span className="text-muted-foreground font-medium border-r border-border/10 pr-2">Update Terakhir</span>
                        <span className="text-foreground text-xs">
                          {formatDistanceToNow(activePrompt.updatedAt, {
                            addSuffix: true,
                            locale: localeId,
                          })}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground opacity-60 leading-relaxed italic border-t border-border/10 pt-4">
                        * Prompt ini sedang aktif secara global untuk seluruh permintaan AI aplikasi.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section: Recent Alerts */}
          <div className="p-6 md:p-10 flex flex-col h-full bg-accent/[0.01]">
            <h4 className="text-signal text-[10px] font-bold text-slate-500 mb-8 flex items-center gap-2">
              <WarningTriangle className="h-3 w-3" />
              History Alert Terbaru
            </h4>

            <div className="flex-1 overflow-hidden">
              {recentAlerts && recentAlerts.length > 0 ? (
                <div className="space-y-6 overflow-y-auto pr-3 max-h-[400px] scrollbar-thin scrollbar-thumb-accent">
                  {recentAlerts.map((alert) => (
                    <div
                      key={alert._id}
                      className={cn(
                        "group relative flex items-start gap-4 transition-all pb-6 border-b border-border/5 last:border-0",
                        alert.resolved ? "opacity-30" : "opacity-100"
                      )}
                    >
                      <div className="mt-1 shrink-0">{getSeverityIcon(alert.severity)}</div>
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-[0.2em] bg-muted/40 px-1.5 py-0.5 rounded">
                            {alert.source}
                          </span>
                          {alert.resolved && (
                            <span className="text-[9px] text-success font-bold flex items-center gap-1 border border-success/30 px-1.5 rounded bg-success/[0.02]">
                              RESOLVED
                            </span>
                          )}
                        </div>
                        <p className="text-foreground text-sm leading-relaxed break-words">{alert.message}</p>
                        <span className="text-[10px] text-muted-foreground block font-medium">
                          {formatDistanceToNow(alert.createdAt, {
                            addSuffix: true,
                            locale: localeId,
                          })}
                        </span>
                      </div>

                      {!alert.resolved && (
                        <button
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 inline-flex items-center justify-center h-8 w-8 rounded-action border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800 hover:border-border focus-ring"
                          onClick={() => handleResolveAlert(alert._id)}
                          disabled={isResolving === alert._id}
                        >
                          {isResolving === alert._id ? (
                            <Refresh className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center h-full opacity-10 border-2 border-dashed rounded-xl border-border">
                  <CheckCircle className="h-16 w-16 mb-4" />
                  <p className="text-lg font-bold tracking-widest">CLEAR</p>
                  <p className="text-xs">Sistem beroperasi tanpa anomali.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

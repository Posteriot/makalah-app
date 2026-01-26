"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
} from "lucide-react"
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
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  // Loading state
  if (activePrompt === undefined || alertCount === undefined) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="card-title-row">
            <RefreshCw className="card-icon animate-spin" />
            <h3 className="card-title">System Health</h3>
          </div>
        </div>
        <div className="card-content">
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
    <div className={cn("card overflow-hidden", !isFallbackMode && "card--health")}>
      <div className="card-header border-b">
        <div className="card-header-row">
          <div>
            <div className="card-title-row">
              {isFallbackMode ? (
                <AlertCircle className="card-icon text-destructive" />
              ) : (
                <CheckCircle2 className="card-icon card-icon--success" />
              )}
              <h3 className="card-title">System Health Monitoring</h3>
            </div>
            <p className="card-description">
              Status real-time system prompt dan indikator alert monitoring
            </p>
          </div>
          {hasUnresolvedAlerts && (
            <span className="status-badge bg-destructive text-white animate-pulse">
              {alertCount.total} Unresolved Alert{alertCount.total > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="card-content p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-border">
          {/* Section: System Prompt Status */}
          <div className="p-6 md:p-10 flex flex-col h-full">
            <h4 className="health-label mb-8 flex items-center gap-2">
              <RefreshCw className="h-3 w-3" />
              System Prompt Status
            </h4>

            <div className="flex-1">
              {isFallbackMode ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
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
                      className="btn btn--secondary"
                      onClick={handleResolveAllFallback}
                      disabled={isResolving === "all"}
                    >
                      {isResolving === "all" ? (
                        <RefreshCw className="btn-icon animate-spin" />
                      ) : (
                        <CheckCircle2 className="btn-icon" />
                      )}
                      <span>Selesaikan Semua Fallback</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-success" />
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
            <h4 className="health-label mb-8 flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
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
                          className="icon-btn shrink-0 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0"
                          onClick={() => handleResolveAlert(alert._id)}
                          disabled={isResolving === alert._id}
                        >
                          {isResolving === alert._id ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center h-full opacity-10 border-2 border-dashed rounded-xl border-border">
                  <CheckCircle2 className="h-16 w-16 mb-4" />
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

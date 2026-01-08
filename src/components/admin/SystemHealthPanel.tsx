"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { id as localeId } from "date-fns/locale"
import type { Id } from "@convex/_generated/dataModel"
import { useState } from "react"

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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>
      case "warning":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Warning</Badge>
      default:
        return <Badge variant="secondary">Info</Badge>
    }
  }

  // Loading state
  if (activePrompt === undefined || alertCount === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isFallbackMode = fallbackStatus?.active === true
  const hasUnresolvedAlerts = (alertCount?.total ?? 0) > 0

  return (
    <Card className={isFallbackMode ? "border-destructive" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {isFallbackMode ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            System Health
          </span>
          {hasUnresolvedAlerts && (
            <Badge variant="destructive">
              {alertCount.total} Alert{alertCount.total > 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Status system prompt dan alert monitoring
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Prompt Status */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">System Prompt Status</h4>
          <div
            className={`p-4 rounded-lg border ${
              isFallbackMode
                ? "bg-destructive/10 border-destructive"
                : "bg-green-500/10 border-green-500"
            }`}
          >
            {isFallbackMode ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive font-medium">
                  <AlertCircle className="h-4 w-4" />
                  FALLBACK MODE AKTIF
                </div>
                <p className="text-sm text-muted-foreground">
                  System prompt utama tidak tersedia. Chat menggunakan prompt minimal.
                </p>
                {fallbackStatus?.lastActivation && (
                  <p className="text-xs text-muted-foreground">
                    Fallback aktif sejak:{" "}
                    {formatDistanceToNow(fallbackStatus.lastActivation, {
                      addSuffix: true,
                      locale: localeId,
                    })}
                  </p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResolveAllFallback}
                  disabled={isResolving === "all"}
                  className="mt-2"
                >
                  {isResolving === "all" ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Mark as Resolved
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  NORMAL - Database Prompt Aktif
                </div>
                {activePrompt && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong>Name:</strong> {activePrompt.name}
                    </p>
                    <p>
                      <strong>Version:</strong> {activePrompt.version}
                    </p>
                    <p>
                      <strong>Last Updated:</strong>{" "}
                      {formatDistanceToNow(activePrompt.updatedAt, {
                        addSuffix: true,
                        locale: localeId,
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Alert Summary */}
        {alertCount && alertCount.total > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Alert Summary</h4>
            <div className="flex gap-4 text-sm">
              {alertCount.critical > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {alertCount.critical} Critical
                </span>
              )}
              {alertCount.warning > 0 && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  {alertCount.warning} Warning
                </span>
              )}
              {alertCount.info > 0 && (
                <span className="flex items-center gap-1 text-blue-600">
                  <Info className="h-4 w-4" />
                  {alertCount.info} Info
                </span>
              )}
            </div>
          </div>
        )}

        {/* Recent Alerts */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Recent Alerts</h4>
          {recentAlerts && recentAlerts.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentAlerts.map((alert) => (
                <div
                  key={alert._id}
                  className={`p-3 rounded-lg border text-sm ${
                    alert.resolved
                      ? "bg-muted/50 opacity-60"
                      : "bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {getSeverityIcon(alert.severity)}
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getSeverityBadge(alert.severity)}
                          <span className="text-xs text-muted-foreground">
                            {alert.source}
                          </span>
                          {alert.resolved && (
                            <Badge variant="outline" className="text-xs">
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(alert.createdAt, {
                            addSuffix: true,
                            locale: localeId,
                          })}
                        </p>
                      </div>
                    </div>
                    {!alert.resolved && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResolveAlert(alert._id)}
                        disabled={isResolving === alert._id}
                        className="shrink-0"
                      >
                        {isResolving === alert._id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground bg-muted/50 rounded-lg">
              Tidak ada alert - sistem beroperasi normal
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

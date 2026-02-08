"use client"

import Link from "next/link"
import { ArrowUpCircle, BadgeCheck } from "iconoir-react"
import { cn } from "@/lib/utils"
import { RoleBadge } from "@/components/admin/RoleBadge"

type TierType = "gratis" | "free" | "bpp" | "pro"

const TIER_CONFIG: Record<TierType, { label: string; className: string; showUpgrade: boolean }> = {
  gratis: { label: "GRATIS", className: "bg-emerald-600 text-white", showUpgrade: true },
  free: { label: "GRATIS", className: "bg-emerald-600 text-white", showUpgrade: true },
  bpp: { label: "BPP", className: "bg-sky-600 text-white", showUpgrade: true },
  pro: { label: "PRO", className: "bg-amber-500 text-white", showUpgrade: false },
}

interface StatusTabProps {
  primaryEmail: string
  convexUser: { role: string; subscriptionStatus?: string } | null | undefined
  isConvexLoading: boolean
}

export function StatusTab({ primaryEmail, convexUser, isConvexLoading }: StatusTabProps) {
  return (
    <>
      <div className="mb-6">
        <h3 className="flex items-center gap-2 text-signal text-lg">
          <BadgeCheck className="h-5 w-5 text-primary" />
          Status Akun
        </h3>
        <p className="mt-1 text-narrative text-sm text-muted-foreground">
          Ringkasan akses akun Anda di Makalah AI.
        </p>
      </div>

      {/* Email info card */}
      <div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">Informasi Akun</div>
        <div className="p-4">
          <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
            <span className="text-interface text-xs text-muted-foreground">Email</span>
            <div className="min-w-0 text-interface text-sm text-foreground">{primaryEmail || "-"}</div>
            <div />
          </div>
        </div>
      </div>

      {/* Role card */}
      <div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">Role & Akses</div>
        <div className="p-4">
          <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
            <span className="text-interface text-xs text-muted-foreground">Role</span>
            <div className="min-w-0 text-interface text-sm text-foreground">
              {isConvexLoading ? (
                <span className="text-interface text-sm text-muted-foreground">
                  Memuat...
                </span>
              ) : convexUser ? (
                <RoleBadge
                  role={convexUser.role as "superadmin" | "admin" | "user"}
                />
              ) : (
                "-"
              )}
            </div>
            <div />
          </div>
        </div>
      </div>

      {/* Subscription card */}
      <div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">Subskripsi</div>
        <div className="p-4">
          {isConvexLoading ? (
            <span className="text-interface text-sm text-muted-foreground">Memuat...</span>
          ) : (
            (() => {
              const tierKey = (convexUser?.subscriptionStatus || "free").toLowerCase() as TierType
              const tierConfig = TIER_CONFIG[tierKey] || TIER_CONFIG.free
              return (
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-badge px-3 py-1 text-signal text-xs",
                      tierConfig.className
                    )}
                  >
                    {tierConfig.label}
                  </span>
                  {tierConfig.showUpgrade && (
                    <Link
                      href="/subscription/upgrade"
                      className="inline-flex items-center gap-1.5 rounded-action bg-success px-4 py-2 text-interface text-sm font-medium text-white transition-colors hover:bg-success/90 focus-ring"
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                      Upgrade
                    </Link>
                  )}
                </div>
              )
            })()
          )}
        </div>
      </div>
    </>
  )
}

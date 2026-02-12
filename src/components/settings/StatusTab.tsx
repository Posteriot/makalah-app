"use client"

import Link from "next/link"
import { ArrowUpCircle, BadgeCheck } from "iconoir-react"
import { getEffectiveTier } from "@/lib/utils/subscription"
import type { EffectiveTier } from "@/lib/utils/subscription"
import { CreditMeter } from "@/components/billing/CreditMeter"
import { RoleBadge } from "@/components/admin/RoleBadge"
import { SegmentBadge } from "@/components/ui/SegmentBadge"

const TIER_CONFIG: Record<EffectiveTier, { showUpgrade: boolean }> = {
  gratis: { showUpgrade: true },
  bpp: { showUpgrade: true },
  pro: { showUpgrade: false },
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
        <h3 className="flex items-center gap-2 text-narrative font-medium text-xl">
          <BadgeCheck className="h-5 w-5 text-slate-800 dark:text-slate-200" />
          Status Akun
        </h3>
        <p className="mt-1 text-narrative text-sm text-muted-foreground">
          Ringkasan akses akun Anda di Makalah AI.
        </p>
      </div>

      {/* Email info card */}
      <div className="mb-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900">
        <div className="border-b border-slate-300 dark:border-slate-600 px-4 py-3 text-narrative text-md font-medium">Informasi Akun</div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800">
          <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3 max-sm:grid-cols-1 max-sm:items-start">
            <span className="text-interface text-xs text-muted-foreground">Email</span>
            <div className="min-w-0 text-interface text-sm text-foreground">{primaryEmail || "-"}</div>
            <div />
          </div>
        </div>
      </div>

      {/* Role card */}
      <div className="mb-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900">
        <div className="border-b border-slate-300 dark:border-slate-600 px-4 py-3 text-narrative text-md font-medium">Role & Akses</div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800">
          <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3 max-sm:grid-cols-1 max-sm:items-start">
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
      <div className="mb-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900">
        <div className="border-b border-slate-300 dark:border-slate-600 px-4 py-3 text-narrative text-md font-medium">Subskripsi</div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800">
          {isConvexLoading ? (
            <span className="text-interface text-sm text-muted-foreground">Memuat...</span>
          ) : (
            (() => {
              const tierKey = getEffectiveTier(convexUser?.role, convexUser?.subscriptionStatus)
              const tierConfig = TIER_CONFIG[tierKey]
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-3">
                    <SegmentBadge
                      role={convexUser?.role}
                      subscriptionStatus={convexUser?.subscriptionStatus}
                    />
                    {tierConfig.showUpgrade && (
                      <Link
                        href="/subscription/upgrade"
                        className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-4 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring"
                      >
                        <span
                          className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                          aria-hidden="true"
                        />
                        <span className="relative z-10 inline-flex items-center gap-1.5">
                          <ArrowUpCircle className="h-4 w-4" />
                          Upgrade
                        </span>
                      </Link>
                    )}
                  </div>
                  <CreditMeter variant="standard" />
                  <div>
                    <Link
                      href="/subscription/overview"
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      Lihat Detail
                    </Link>
                  </div>
                </div>
              )
            })()
          )}
        </div>
      </div>
    </>
  )
}

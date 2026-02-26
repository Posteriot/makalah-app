"use client"

import Link from "next/link"
import { CreditMeter } from "@/components/billing/CreditMeter"
import { RoleBadge } from "@/components/admin/RoleBadge"

interface StatusTabProps {
  primaryEmail: string
  convexUser: { role: string; subscriptionStatus?: string } | null | undefined
  isConvexLoading: boolean
}

export function StatusTab({ primaryEmail, convexUser, isConvexLoading }: StatusTabProps) {
  return (
    <>
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
            <div className="space-y-3">
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
          )}
        </div>
      </div>
    </>
  )
}

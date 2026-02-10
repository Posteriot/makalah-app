"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { Clock, ArrowUpRight, ArrowDownRight, RefreshDouble } from "iconoir-react"
import { cn } from "@/lib/utils"

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp))
}

export default function TransactionHistoryPage() {
  const { user, isLoading: userLoading } = useCurrentUser()

  // Get credit transaction history
  const transactions = useQuery(
    api.billing.credits.getCreditHistory,
    user?._id ? { userId: user._id, limit: 30 } : "skip"
  )

  // Loading state
  if (userLoading || transactions === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-interface text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Riwayat Transaksi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lihat semua transaksi top up dan penggunaan credit
          </p>
        </div>

        <div className="bg-slate-900/50 border border-hairline rounded-shell p-8">
          <RefreshDouble className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-2">
        <h1 className="text-interface text-xl font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Riwayat Transaksi
        </h1>
        <p className="text-sm text-muted-foreground">
          Sesi tidak aktif. Silakan login ulang.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-interface text-xl font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Riwayat Transaksi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lihat semua transaksi top up dan penggunaan credit
        </p>
      </div>

      {/* Transaction List */}
      <div className="bg-slate-900/50 border border-hairline rounded-shell overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Belum ada transaksi</p>
            <p className="text-sm text-slate-500 mt-1">
              Transaksi akan muncul setelah Anda top up credit atau menggunakan layanan.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-4 p-4 hover:bg-slate-800/30 transition-colors"
              >
                {/* Icon */}
                <div
                  className={cn(
                    "p-2 rounded-badge",
                    tx.type === "purchase" ? "bg-emerald-500/15 border border-emerald-500/30" : "bg-rose-500/15 border border-rose-500/30"
                  )}
                >
                  {tx.type === "purchase" ? (
                    <ArrowDownRight className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-rose-400" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-interface font-medium truncate text-slate-200">{tx.description}</p>
                  <p className="text-[11px] font-mono text-slate-500">
                    {formatDate(tx.createdAt)}
                  </p>
                </div>

                {/* Credits */}
                <div className="text-right">
                  <p
                    className={cn(
                      "text-interface font-semibold tabular-nums",
                      tx.type === "purchase" ? "text-emerald-400" : "text-rose-400"
                    )}
                  >
                    {tx.credits > 0 ? "+" : ""}
                    {tx.credits} kredit
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note */}
      <p className="text-[10px] font-mono text-slate-500 text-center">
        Menampilkan 30 transaksi terakhir. Untuk laporan lengkap, hubungi support.
      </p>
    </div>
  )
}

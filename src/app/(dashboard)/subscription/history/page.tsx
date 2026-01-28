"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { History, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react"
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
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Riwayat Transaksi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lihat semua transaksi top up dan penggunaan credit
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
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
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Riwayat Transaksi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lihat semua transaksi top up dan penggunaan credit
        </p>
      </div>

      {/* Transaction List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Belum ada transaksi</p>
            <p className="text-sm text-muted-foreground mt-1">
              Transaksi akan muncul setelah Anda top up credit atau menggunakan layanan.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
              >
                {/* Icon */}
                <div
                  className={cn(
                    "p-2 rounded-full",
                    tx.type === "topup" ? "bg-green-100" : "bg-red-100"
                  )}
                >
                  {tx.type === "topup" ? (
                    <ArrowDownRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-red-600" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{tx.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(tx.createdAt)}
                  </p>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <p
                    className={cn(
                      "font-semibold tabular-nums",
                      tx.type === "topup" ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {tx.type === "topup" ? "+" : ""}
                    Rp {Math.abs(tx.amount).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note */}
      <p className="text-xs text-muted-foreground text-center">
        Menampilkan 30 transaksi terakhir. Untuk laporan lengkap, hubungi support.
      </p>
    </div>
  )
}

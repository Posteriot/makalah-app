"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import {
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshDouble,
  CreditCard,
  Download,
} from "iconoir-react"
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const STATUS_CONFIG = {
  SUCCEEDED: {
    text: "Berhasil",
    class: "text-emerald-400 bg-emerald-500/15 border border-emerald-500/30",
    iconClass: "bg-emerald-500/15 border border-emerald-500/30",
    iconColor: "text-emerald-400",
  },
  PENDING: {
    text: "Menunggu",
    class: "text-amber-400 bg-amber-500/15 border border-amber-500/30",
    iconClass: "bg-amber-500/15 border border-amber-500/30",
    iconColor: "text-amber-400",
  },
  FAILED: {
    text: "Gagal",
    class: "text-rose-400 bg-rose-500/15 border border-rose-500/30",
    iconClass: "bg-rose-500/15 border border-rose-500/30",
    iconColor: "text-rose-400",
  },
  EXPIRED: {
    text: "Kedaluwarsa",
    class: "text-muted-foreground bg-muted border border-border",
    iconClass: "bg-muted border border-border",
    iconColor: "text-muted-foreground",
  },
  REFUNDED: {
    text: "Refund",
    class: "text-sky-400 bg-sky-500/15 border border-sky-500/30",
    iconClass: "bg-sky-500/15 border border-sky-500/30",
    iconColor: "text-sky-400",
  },
} as const

function getPaymentMethodLabel(
  method: string,
  channel?: string
): string {
  switch (method) {
    case "QRIS":
      return "QRIS"
    case "VIRTUAL_ACCOUNT":
      return channel ? `VA ${channel}` : "Virtual Account"
    case "EWALLET":
      return channel ?? "E-Wallet"
    case "DIRECT_DEBIT":
      return channel ?? "Direct Debit"
    case "CREDIT_CARD":
      return "Kartu Kredit"
    default:
      return method
  }
}

function getPaymentDescription(payment: {
  description?: string
  credits?: number
  packageType?: string
}): string {
  if (payment.description) return payment.description
  if (payment.credits) return `Paket Paper \u2014 ${payment.credits} kredit`
  return "Pembelian kredit"
}

// ── Admin History View ──────────────────────────────────────────────
// Exact current UI for admin/superadmin: credit usage history

function AdminHistoryView({ user }: { user: NonNullable<ReturnType<typeof useCurrentUser>["user"]> }) {
  const transactions = useQuery(
    api.billing.credits.getCreditHistory,
    user._id ? { userId: user._id, limit: 30 } : "skip"
  )

  if (transactions === undefined) {
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

        <div className="rounded-shell border-main border border-border bg-card/90 p-8 dark:bg-slate-900/90">
          <RefreshDouble className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      </div>
    )
  }

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

      <div className="rounded-shell border-main border border-border bg-card/90 overflow-hidden dark:bg-slate-900/90">
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground">Belum ada transaksi</p>
            <p className="text-sm text-muted-foreground mt-1">
              Transaksi akan muncul setelah Anda top up credit atau menggunakan layanan.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-slate-200/40 dark:hover:bg-slate-800/60"
              >
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

                <div className="flex-1 min-w-0">
                  <p className="text-interface font-medium truncate text-foreground">{tx.description}</p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {formatDate(tx.createdAt)}
                  </p>
                </div>

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

      <p className="text-[10px] font-mono text-muted-foreground text-center">
        Menampilkan 30 transaksi terakhir. Untuk laporan lengkap, hubungi support.
      </p>
    </div>
  )
}

// ── Regular History View ────────────────────────────────────────────
// Payment purchase history for BPP/Pro users

function RegularHistoryView({ user }: { user: NonNullable<ReturnType<typeof useCurrentUser>["user"]> }) {
  const payments = useQuery(
    api.billing.payments.getPaymentHistory,
    user._id ? { userId: user._id, limit: 30 } : "skip"
  )

  if (payments === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-interface text-xl font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Riwayat Pembayaran
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Riwayat pembelian kredit
          </p>
        </div>

        <div className="rounded-shell border-main border border-border bg-card/90 p-8 dark:bg-slate-900/90">
          <RefreshDouble className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-interface text-xl font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Riwayat Pembayaran
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Riwayat pembelian kredit
        </p>
      </div>

      <div className="rounded-shell border-main border border-border bg-card/90 overflow-hidden dark:bg-slate-900/90">
        {payments.length === 0 ? (
          <div className="p-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground">Belum ada pembayaran</p>
            <p className="text-sm text-muted-foreground mt-1">
              Riwayat pembayaran akan muncul setelah Anda membeli kredit.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {payments.map((payment) => {
              const status = STATUS_CONFIG[payment.status]
              return (
                <div
                  key={payment._id}
                  className="flex items-start gap-4 p-4 transition-colors hover:bg-slate-200/40 dark:hover:bg-slate-800/60"
                >
                  {/* Status Icon */}
                  <div className={cn("p-2 rounded-badge", status.iconClass)}>
                    <ArrowDownRight className={cn("h-4 w-4", status.iconColor)} />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-interface font-medium truncate text-foreground">
                      {getPaymentDescription(payment)}
                    </p>
                    <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                      {formatDate(payment._creationTime)}
                      {" \u00b7 "}
                      {getPaymentMethodLabel(payment.paymentMethod, payment.paymentChannel)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrency(payment.amount)}
                      </span>
                      <span
                        className={cn(
                          "text-signal text-[10px] font-bold px-2 py-0.5 rounded-badge",
                          status.class
                        )}
                      >
                        {status.text}
                      </span>
                    </div>
                  </div>

                  {/* Receipt Download */}
                  {payment.status === "SUCCEEDED" && (
                    <a
                      href={`/api/export/receipt/${payment._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-action px-2.5 py-1.5 text-[11px] font-mono font-medium text-muted-foreground border border-border transition-colors hover:bg-slate-200/40 hover:text-foreground dark:hover:bg-slate-800/60"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Kwitansi
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-[10px] font-mono text-muted-foreground text-center">
        Menampilkan 30 pembayaran terakhir.
      </p>
    </div>
  )
}

// ── Page Component ──────────────────────────────────────────────────

export default function TransactionHistoryPage() {
  const { user, isLoading: userLoading } = useCurrentUser()
  const isUnlimited = user?.role === "admin" || user?.role === "superadmin"

  if (userLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-interface text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Riwayat Transaksi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Memuat data...
          </p>
        </div>

        <div className="rounded-shell border-main border border-border bg-card/90 p-8 dark:bg-slate-900/90">
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

  if (isUnlimited) {
    return <AdminHistoryView user={user} />
  }

  return <RegularHistoryView user={user} />
}

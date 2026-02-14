"use client"

import Link from "next/link"
import { XmarkCircle, ArrowLeft, Refresh } from "iconoir-react"

export default function TopUpFailedPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-shell border-main border border-border bg-card/90 p-6 text-center dark:bg-slate-900/90">
      {/* Failed Icon */}
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/15">
          <XmarkCircle className="h-10 w-10 text-rose-400" />
        </div>
      </div>

      {/* Message */}
      <div>
        <h1 className="text-interface text-2xl font-semibold text-rose-500 dark:text-rose-400">
          Pembayaran Gagal
        </h1>
        <p className="text-narrative mt-2 text-muted-foreground">
          Pembayaran Anda tidak berhasil diproses. Silakan coba lagi atau gunakan metode pembayaran lain.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-4">
        <Link
          href="/subscription/topup"
          className="focus-ring text-interface flex h-10 w-full items-center justify-center gap-2 rounded-action bg-slate-900 px-4 text-xs font-medium text-slate-100 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <Refresh className="h-4 w-4" />
          Coba Lagi
        </Link>

        <Link
          href="/subscription/overview"
          className="focus-ring text-interface flex h-10 w-full items-center justify-center gap-2 rounded-action border-main border border-border px-4 text-xs font-medium text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
      </div>

      {/* Help */}
      <p className="text-signal text-[10px] text-muted-foreground">
        Jika masalah berlanjut, hubungi tim support kami.
      </p>
    </div>
  )
}

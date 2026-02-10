"use client"

import Link from "next/link"
import { XmarkCircle, ArrowLeft, Refresh } from "iconoir-react"

export default function TopUpFailedPage() {
  return (
    <div className="space-y-6 max-w-md mx-auto text-center rounded-shell border border-hairline bg-slate-900/50 p-6">
      {/* Failed Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
          <XmarkCircle className="h-10 w-10 text-rose-400" />
        </div>
      </div>

      {/* Message */}
      <div>
        <h1 className="text-interface text-2xl font-semibold text-rose-400">
          Pembayaran Gagal
        </h1>
        <p className="text-slate-400 mt-2">
          Pembayaran Anda tidak berhasil diproses. Silakan coba lagi atau gunakan metode pembayaran lain.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-4">
        <Link
          href="/subscription/topup"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-action font-mono text-xs font-medium bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
        >
          <Refresh className="h-4 w-4" />
          Coba Lagi
        </Link>

        <Link
          href="/subscription/overview"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-action font-mono text-xs font-medium border border-hairline text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
      </div>

      {/* Help */}
      <p className="text-[10px] font-mono text-slate-500">
        Jika masalah berlanjut, hubungi tim support kami.
      </p>
    </div>
  )
}

"use client"

import Link from "next/link"
import { CheckCircle, ArrowRight } from "iconoir-react"

export default function TopUpSuccessPage() {
  return (
    <div className="space-y-6 max-w-md mx-auto text-center rounded-shell border border-hairline bg-slate-900/50 p-6">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-emerald-400" />
        </div>
      </div>

      {/* Message */}
      <div>
        <h1 className="text-interface text-2xl font-semibold text-emerald-400">
          Pembayaran Berhasil!
        </h1>
        <p className="text-slate-400 mt-2">
          Saldo credit Anda telah ditambahkan. Anda dapat langsung menggunakan credit untuk mengakses fitur premium.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-4">
        <Link
          href="/subscription/overview"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-action font-mono text-xs font-medium bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
        >
          Lihat Saldo
          <ArrowRight className="h-4 w-4" />
        </Link>

        <Link
          href="/chat"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-action font-mono text-xs font-medium border border-hairline text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Mulai Chat
        </Link>
      </div>

      {/* Note */}
      <p className="text-[10px] font-mono text-slate-500">
        Jika saldo belum bertambah, tunggu beberapa menit dan refresh halaman.
      </p>
    </div>
  )
}

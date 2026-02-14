"use client"

import Link from "next/link"
import { CheckCircle, ArrowRight } from "iconoir-react"

export default function TopUpSuccessPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-shell border-main border border-border bg-card/90 p-6 text-center dark:bg-slate-900/90">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15">
          <CheckCircle className="h-10 w-10 text-emerald-400" />
        </div>
      </div>

      {/* Message */}
      <div>
        <h1 className="text-interface text-2xl font-semibold text-emerald-500 dark:text-emerald-400">
          Pembayaran Berhasil!
        </h1>
        <p className="text-narrative mt-2 text-muted-foreground">
          Saldo credit Anda telah ditambahkan. Anda dapat langsung menggunakan credit untuk mengakses fitur premium.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-4">
        <Link
          href="/subscription/overview"
          className="focus-ring text-interface flex h-10 w-full items-center justify-center gap-2 rounded-action bg-slate-900 px-4 text-xs font-medium text-slate-100 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Lihat Saldo
          <ArrowRight className="h-4 w-4" />
        </Link>

        <Link
          href="/chat"
          className="focus-ring text-interface flex h-10 w-full items-center justify-center gap-2 rounded-action border-main border border-border px-4 text-xs font-medium text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
        >
          Mulai Chat
        </Link>
      </div>

      {/* Note */}
      <p className="text-signal text-[10px] text-muted-foreground">
        Jika saldo belum bertambah, tunggu beberapa menit dan refresh halaman.
      </p>
    </div>
  )
}

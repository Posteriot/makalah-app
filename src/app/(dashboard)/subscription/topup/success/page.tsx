"use client"

import Link from "next/link"
import { CheckCircle2, ArrowRight } from "lucide-react"

export default function TopUpSuccessPage() {
  return (
    <div className="space-y-6 max-w-md mx-auto text-center">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
      </div>

      {/* Message */}
      <div>
        <h1 className="text-2xl font-semibold text-green-600 dark:text-green-400">
          Pembayaran Berhasil!
        </h1>
        <p className="text-muted-foreground mt-2">
          Saldo credit Anda telah ditambahkan. Anda dapat langsung menggunakan credit untuk mengakses fitur premium.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-4">
        <Link
          href="/subscription/overview"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Lihat Saldo
          <ArrowRight className="h-4 w-4" />
        </Link>

        <Link
          href="/chat"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium border border-border hover:bg-accent transition-colors"
        >
          Mulai Chat
        </Link>
      </div>

      {/* Note */}
      <p className="text-xs text-muted-foreground">
        Jika saldo belum bertambah, tunggu beberapa menit dan refresh halaman.
      </p>
    </div>
  )
}

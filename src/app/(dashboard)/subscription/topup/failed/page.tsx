"use client"

import Link from "next/link"
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react"

export default function TopUpFailedPage() {
  return (
    <div className="space-y-6 max-w-md mx-auto text-center">
      {/* Failed Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>
      </div>

      {/* Message */}
      <div>
        <h1 className="text-2xl font-semibold text-red-600 dark:text-red-400">
          Pembayaran Gagal
        </h1>
        <p className="text-muted-foreground mt-2">
          Pembayaran Anda tidak berhasil diproses. Silakan coba lagi atau gunakan metode pembayaran lain.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-4">
        <Link
          href="/subscription/topup"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Coba Lagi
        </Link>

        <Link
          href="/subscription/overview"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium border border-border hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
      </div>

      {/* Help */}
      <p className="text-xs text-muted-foreground">
        Jika masalah berlanjut, hubungi tim support kami.
      </p>
    </div>
  )
}

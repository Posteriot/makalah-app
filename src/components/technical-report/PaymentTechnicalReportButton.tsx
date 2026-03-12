"use client"

import { useState, useSyncExternalStore } from "react"
import { WarningTriangle } from "iconoir-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TechnicalReportForm } from "./TechnicalReportForm"
import type { TechnicalReportSource } from "@/lib/hooks/useTechnicalReport"

interface PaymentContext {
  transactionId?: string
  amount?: number
  paymentMethod?: string
  providerPaymentId?: string
  errorCode?: string
}

interface PaymentTechnicalReportButtonProps {
  source: Extract<TechnicalReportSource, "payment-checkout" | "payment-preflight-error">
  paymentContext?: PaymentContext
  compact?: boolean
  className?: string
}

export function PaymentTechnicalReportButton({
  source,
  paymentContext,
  compact = false,
  className,
}: PaymentTechnicalReportButtonProps) {
  const [open, setOpen] = useState(false)
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const trigger = compact ? (
    <button
      type="button"
      disabled={!isHydrated}
      className={cn(
        "text-muted-foreground active:text-foreground transition-colors duration-150 disabled:pointer-events-none",
        className
      )}
      aria-label="Lapor masalah pembayaran"
      title="Lapor masalah pembayaran"
    >
      <WarningTriangle className="h-5 w-5" strokeWidth={1.5} />
    </button>
  ) : (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={!isHydrated}
      className={cn("h-8 rounded-action text-xs font-medium font-sans", className)}
    >
      <WarningTriangle className="h-3.5 w-3.5" />
      Lapor Masalah Pembayaran
    </Button>
  )

  if (!isHydrated) {
    return trigger
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-left text-sm sm:text-lg">
            Lapor Masalah Pembayaran
          </DialogTitle>
          <DialogDescription className="text-left text-xs leading-relaxed sm:text-sm">
            Ceritakan masalah pembayaran yang lo alami. Tim kami akan menindaklanjuti.
          </DialogDescription>
        </DialogHeader>

        <TechnicalReportForm
          source={source}
          paymentContext={paymentContext}
          onSubmitted={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

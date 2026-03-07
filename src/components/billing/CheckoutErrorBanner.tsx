import { WarningCircle } from "iconoir-react"

import { cn } from "@/lib/utils"

interface CheckoutErrorBannerProps {
  title: string
  message: string
  className?: string
}

const checkoutErrorBannerStyle = {
  backgroundColor: "var(--chat-destructive, oklch(0.586 0.253 17.585))",
  borderColor: "var(--chat-destructive, oklch(0.586 0.253 17.585))",
  color: "var(--chat-destructive-foreground, oklch(1 0 0))",
} as const

export function CheckoutErrorBanner({
  title,
  message,
  className,
}: CheckoutErrorBannerProps) {
  return (
    <div
      role="alert"
      style={checkoutErrorBannerStyle}
      className={cn(
        "rounded-action border p-3",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-0.5">
          <p className="text-xs font-sans font-medium leading-tight">
            {title}
          </p>
          <p className="text-xs font-sans leading-tight">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}

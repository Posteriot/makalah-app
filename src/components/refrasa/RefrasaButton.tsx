"use client"

import { WandSparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface RefrasaButtonProps {
  onClick: () => void
  disabled?: boolean
  isLoading?: boolean
  /** Reason why button is disabled (for tooltip) */
  disabledReason?: string
  /** Content length for minimum check */
  contentLength?: number
  /** Word count for warning threshold */
  wordCount?: number
  /** Whether artifact is being edited */
  isEditing?: boolean
  /** Whether artifact exists */
  hasArtifact?: boolean
}

const MIN_CONTENT_LENGTH = 50
const WORD_COUNT_WARNING_THRESHOLD = 2000

/**
 * RefrasaButton - Trigger button for Refrasa tool
 *
 * Disabled conditions:
 * - isEditing: User is editing artifact
 * - !hasArtifact: No artifact selected
 * - contentLength < 50: Content too short
 *
 * Warning (no hard block):
 * - wordCount > 2000: Long content may take time
 */
export function RefrasaButton({
  onClick,
  disabled = false,
  isLoading = false,
  disabledReason,
  contentLength = 0,
  wordCount = 0,
  isEditing = false,
  hasArtifact = true,
}: RefrasaButtonProps) {
  // Determine disabled state and reason
  const getDisabledState = (): { isDisabled: boolean; reason: string | null } => {
    if (isLoading) {
      return { isDisabled: true, reason: "Sedang memproses..." }
    }
    if (isEditing) {
      return { isDisabled: true, reason: "Selesaikan pengeditan terlebih dahulu" }
    }
    if (!hasArtifact) {
      return { isDisabled: true, reason: "Tidak ada artifact yang dipilih" }
    }
    if (contentLength < MIN_CONTENT_LENGTH) {
      return { isDisabled: true, reason: `Konten minimal ${MIN_CONTENT_LENGTH} karakter` }
    }
    if (disabled && disabledReason) {
      return { isDisabled: true, reason: disabledReason }
    }
    if (disabled) {
      return { isDisabled: true, reason: "Tidak tersedia saat ini" }
    }
    return { isDisabled: false, reason: null }
  }

  const { isDisabled, reason } = getDisabledState()

  // Warning for long content (no hard block)
  const showLongContentWarning = wordCount > WORD_COUNT_WARNING_THRESHOLD && !isDisabled

  const getTooltipContent = () => {
    if (reason) {
      return reason
    }
    if (showLongContentWarning) {
      return `Teks panjang (${wordCount.toLocaleString()} kata) - proses mungkin memerlukan waktu lebih lama`
    }
    return "Refrasa: Perbaiki gaya penulisan akademis"
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={isDisabled}
            className="gap-1.5"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <WandSparkles className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Refrasa</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className={showLongContentWarning ? "text-yellow-600" : ""}>
            {getTooltipContent()}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

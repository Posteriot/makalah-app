"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import {
  LOADING_MESSAGES,
  LOADING_ROTATION_INTERVAL,
} from "@/lib/refrasa/loading-messages"

interface RefrasaLoadingIndicatorProps {
  /** Optional className for container */
  className?: string
}

/**
 * RefrasaLoadingIndicator - Educational loading states
 *
 * Displays rotating messages to educate users about the Refrasa process
 * while keeping them engaged during the analysis (10-20+ seconds for long text).
 */
export function RefrasaLoadingIndicator({
  className = "",
}: RefrasaLoadingIndicatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, LOADING_ROTATION_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-8 ${className}`}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground animate-pulse">
        {LOADING_MESSAGES[currentIndex]}
      </p>
    </div>
  )
}

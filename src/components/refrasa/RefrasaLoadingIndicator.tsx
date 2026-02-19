"use client"

import { useState, useEffect } from "react"
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
      className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`}
    >
      <span className="h-6 w-6 border-2 border-slate-400 border-t-transparent dark:border-slate-500 dark:border-t-transparent rounded-full animate-spin" />
      <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 animate-pulse">
        {LOADING_MESSAGES[currentIndex]}
      </p>
    </div>
  )
}

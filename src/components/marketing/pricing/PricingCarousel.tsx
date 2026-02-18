"use client"

import { useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { PricingCard, type PricingPlan } from "./PricingCard"

export function PricingCarousel({ plans, isWaitlistMode }: { plans: PricingPlan[]; isWaitlistMode?: boolean }) {
  // Start at highlighted plan (BPP)
  const highlightedIndex = plans.findIndex((p) => p.isHighlighted)
  const [activeSlide, setActiveSlide] = useState(
    highlightedIndex >= 0 ? highlightedIndex : 0
  )
  const startXRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)

  const clampIndex = useCallback(
    (index: number) => {
      if (plans.length === 0) return 0
      return Math.max(0, Math.min(index, plans.length - 1))
    },
    [plans.length]
  )

  const handleSwipe = useCallback(
    (diff: number) => {
      const threshold = 48
      if (Math.abs(diff) < threshold) return
      setActiveSlide((current) => {
        const direction = diff > 0 ? 1 : -1
        return clampIndex(current + direction)
      })
    },
    [clampIndex]
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      startXRef.current = event.clientX
      isDraggingRef.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    []
  )

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || startXRef.current === null) return
      const diff = startXRef.current - event.clientX
      handleSwipe(diff)
      isDraggingRef.current = false
      startXRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    },
    [handleSwipe]
  )

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || startXRef.current === null) return
      const diff = startXRef.current - event.clientX
      handleSwipe(diff)
      isDraggingRef.current = false
      startXRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    },
    [handleSwipe]
  )

  return (
    <div className="relative overflow-hidden touch-pan-y pt-6 md:hidden">
      <div
        className="flex transition-transform duration-300 ease-out touch-pan-y"
        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {plans.map((plan) => (
          <div key={plan._id} className="flex-shrink-0 w-full px-2 box-border">
            <div className="w-full max-w-[300px] mx-auto">
              <PricingCard plan={plan} isWaitlistMode={isWaitlistMode} />
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {plans.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveSlide(clampIndex(index))}
            className={cn(
              "w-2 h-2 rounded-full border-none cursor-pointer",
              "transition-colors duration-200",
              activeSlide === index
                ? "bg-brand"
                : "bg-black/20 dark:bg-white/30"
            )}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

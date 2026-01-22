"use client"

import { useEffect, useCallback } from "react"

/**
 * Scroll offset to account for fixed header and stripes
 * - Header height: 72px
 * - Stripes height: 10px
 * - Total: 82px
 */
const SCROLL_OFFSET = 82

/**
 * Hook for handling anchor-based scrolling with proper offset
 *
 * Features:
 * - Handles URL hash on page load
 * - Scrolls with offset for fixed header
 * - Auto-expands accordion if target is an accordion item
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { scrollToAnchor } = useAnchorScroll()
 *
 *   return (
 *     <button onClick={() => scrollToAnchor("section-id")}>
 *       Go to section
 *     </button>
 *   )
 * }
 * ```
 */
export function useAnchorScroll() {
  const scrollToAnchor = useCallback((anchorId: string) => {
    // Try mobile accordion first (data-anchor-id attribute)
    const accordionItem = document.querySelector(
      `[data-anchor-id="${anchorId}"]`
    )

    // Try desktop card with -desktop suffix
    const desktopCard = document.getElementById(`${anchorId}-desktop`)

    // Fallback: try direct ID match
    const directElement = document.getElementById(anchorId)

    // Use whichever is visible/available
    const target = accordionItem || desktopCard || directElement

    if (target) {
      const targetPosition =
        target.getBoundingClientRect().top + window.scrollY
      window.scrollTo({
        top: targetPosition - SCROLL_OFFSET,
        behavior: "smooth",
      })

      // If it's an accordion, trigger click to expand
      if (accordionItem) {
        const trigger = accordionItem.querySelector("[data-state]")
        if (trigger && trigger.getAttribute("data-state") === "closed") {
          ;(trigger as HTMLElement).click()
        }
      }
    }
  }, [])

  useEffect(() => {
    const hash = window.location.hash.slice(1) // Remove #
    if (hash) {
      // Delay to ensure DOM is ready
      setTimeout(() => scrollToAnchor(hash), 100)
    }
  }, [scrollToAnchor])

  return { scrollToAnchor }
}

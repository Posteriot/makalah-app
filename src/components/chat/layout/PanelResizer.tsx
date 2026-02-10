"use client"

import { useCallback, useRef } from "react"
import { cn } from "@/lib/utils"

interface PanelResizerProps {
  /** Position of the resizer: 'left' (sidebar-main) or 'right' (main-panel) */
  position: "left" | "right"
  /** Callback when resize occurs, receives delta in pixels */
  onResize: (delta: number) => void
  /** Callback when double-clicked (reset to default) */
  onDoubleClick: () => void
  /** Whether resizer is currently being dragged */
  isDragging?: boolean
  /** Additional CSS class */
  className?: string
}

/**
 * PanelResizer - Draggable divider for panel resizing
 *
 * Features:
 * - Draggable divider with visual feedback
 * - Transparent default, primary color on hover/drag
 * - Hit area: 4px visible, 12px clickable
 * - Double-click to reset to default width
 *
 * CSS Styling:
 * - Uses CSS variables for colors (--primary)
 * - Transparent by default, shows color on hover/dragging
 * - Larger clickable area via ::before pseudo-element
 */
export function PanelResizer({
  position,
  onResize,
  onDoubleClick,
  isDragging = false,
  className,
}: PanelResizerProps) {
  const startXRef = useRef(0)
  const isDraggingRef = useRef(false)

  // Handle mouse down - start drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startXRef.current = e.clientX
      isDraggingRef.current = true

      // Set body cursor and prevent selection
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      document.body.classList.add("resizing")

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current) return

        const delta = moveEvent.clientX - startXRef.current
        startXRef.current = moveEvent.clientX

        // For left resizer (sidebar), positive delta = increase width
        // For right resizer (panel), negative delta = increase width
        const adjustedDelta = position === "left" ? delta : -delta
        onResize(adjustedDelta)
      }

      const handleMouseUp = () => {
        isDraggingRef.current = false
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        document.body.classList.remove("resizing")
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [position, onResize]
  )

  // Handle keyboard interaction for accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 50 : 10

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          onResize(position === "left" ? -step : step)
          break
        case "ArrowRight":
          e.preventDefault()
          onResize(position === "left" ? step : -step)
          break
        case "Home":
          e.preventDefault()
          onDoubleClick() // Reset to default
          break
      }
    },
    [position, onResize, onDoubleClick]
  )

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={
        position === "left"
          ? "Resize sidebar panel"
          : "Resize artifact panel"
      }
      aria-valuenow={undefined}
      tabIndex={0}
      className={cn(
        // Base styles
        "relative z-20 flex-shrink-0",
        "w-0.5 cursor-col-resize",
        "transition-colors duration-150",
        // Default: transparent, hover/drag: Amber feedback per chat-shell-redesign spec
        "bg-transparent hover:bg-amber-500/40",
        isDragging && "bg-amber-500/60",
        // Position-specific margins for overlap
        position === "left" && "-mx-0.5",
        position === "right" && "-mx-0.5",
        className
      )}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Larger hit area for easier grabbing */}
      <div
        className={cn(
          "absolute top-0 bottom-0",
          "w-3 -left-1", // 12px clickable area
          "cursor-col-resize"
        )}
      />
    </div>
  )
}

export default PanelResizer

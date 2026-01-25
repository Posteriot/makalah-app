"use client"

import { useState, useCallback, useRef, useEffect } from "react"

interface UseResizerOptions {
  /** Default width in pixels */
  defaultWidth: number
  /** Minimum width in pixels */
  minWidth: number
  /** Maximum width in pixels or percentage string (e.g., "50%") */
  maxWidth: number | string
  /** Width threshold below which panel collapses */
  collapseThreshold?: number
  /** Called when collapsed state changes */
  onCollapseChange?: (isCollapsed: boolean) => void
  /** Storage key for persisting width */
  storageKey?: string
}

interface UseResizerReturn {
  /** Current width in pixels */
  width: number
  /** Whether panel is collapsed */
  isCollapsed: boolean
  /** Whether user is currently dragging */
  isDragging: boolean
  /** Set width directly (respects constraints) */
  setWidth: (width: number) => void
  /** Reset to default width */
  resetToDefault: () => void
  /** Toggle collapsed state */
  toggleCollapsed: () => void
  /** Handle drag event (call with new X position) */
  handleDrag: (newWidth: number) => void
  /** Start dragging */
  startDrag: () => void
  /** Stop dragging */
  stopDrag: () => void
  /** Get props for resizer element */
  getResizerProps: () => {
    onMouseDown: (e: React.MouseEvent) => void
    onDoubleClick: () => void
    className: string
    role: string
    "aria-label": string
    tabIndex: number
  }
}

/**
 * useResizer - Custom hook for drag resize logic
 *
 * Features:
 * - Track drag state, calculate new width
 * - Apply min/max constraints
 * - Double-click reset to default
 * - Collapse threshold (< threshold = collapse)
 * - Optional localStorage persistence
 */
export function useResizer({
  defaultWidth,
  minWidth,
  maxWidth,
  collapseThreshold = 100,
  onCollapseChange,
  storageKey,
}: UseResizerOptions): UseResizerReturn {
  // Initialize from localStorage if available
  const getInitialWidth = () => {
    if (typeof window === "undefined" || !storageKey) return defaultWidth
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const parsed = parseInt(stored, 10)
      if (!isNaN(parsed)) return parsed
    }
    return defaultWidth
  }

  const [width, setWidthState] = useState(getInitialWidth)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Refs for tracking drag
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  // Calculate max width in pixels
  const getMaxWidthPx = useCallback(() => {
    if (typeof maxWidth === "number") return maxWidth
    if (typeof window === "undefined") return 1000
    const percentage = parseInt(maxWidth, 10) / 100
    return window.innerWidth * percentage
  }, [maxWidth])

  // Constrain width to min/max bounds
  const constrainWidth = useCallback(
    (newWidth: number): number => {
      const maxPx = getMaxWidthPx()
      return Math.max(minWidth, Math.min(newWidth, maxPx))
    },
    [minWidth, getMaxWidthPx]
  )

  // Set width with constraints
  const setWidth = useCallback(
    (newWidth: number) => {
      const constrained = constrainWidth(newWidth)
      setWidthState(constrained)

      // Persist to localStorage
      if (storageKey && typeof window !== "undefined") {
        localStorage.setItem(storageKey, constrained.toString())
      }
    },
    [constrainWidth, storageKey]
  )

  // Reset to default width
  const resetToDefault = useCallback(() => {
    setWidth(defaultWidth)
    setIsCollapsed(false)
    onCollapseChange?.(false)
  }, [defaultWidth, setWidth, onCollapseChange])

  // Toggle collapsed state
  const toggleCollapsed = useCallback(() => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    onCollapseChange?.(newCollapsed)
  }, [isCollapsed, onCollapseChange])

  // Handle drag to new width
  const handleDrag = useCallback(
    (newWidth: number) => {
      if (newWidth < collapseThreshold) {
        // Collapse
        setIsCollapsed(true)
        onCollapseChange?.(true)
      } else {
        // Expand and set width
        if (isCollapsed) {
          setIsCollapsed(false)
          onCollapseChange?.(false)
        }
        setWidth(newWidth)
      }
    },
    [collapseThreshold, isCollapsed, setWidth, onCollapseChange]
  )

  // Start drag operation
  const startDrag = useCallback(() => {
    setIsDragging(true)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    document.body.classList.add("resizing")
  }, [])

  // Stop drag operation
  const stopDrag = useCallback(() => {
    setIsDragging(false)
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
    document.body.classList.remove("resizing")
  }, [])

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startXRef.current = e.clientX
      startWidthRef.current = width
      startDrag()

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current
        handleDrag(startWidthRef.current + delta)
      }

      const handleMouseUp = () => {
        stopDrag()
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [width, startDrag, stopDrag, handleDrag]
  )

  // Double-click handler for reset
  const handleDoubleClick = useCallback(() => {
    resetToDefault()
  }, [resetToDefault])

  // Get props for resizer element
  const getResizerProps = useCallback(
    () => ({
      onMouseDown: handleMouseDown,
      onDoubleClick: handleDoubleClick,
      className: `resizer ${isDragging ? "dragging" : ""}`,
      role: "separator",
      "aria-label": "Resize panel",
      tabIndex: 0,
    }),
    [handleMouseDown, handleDoubleClick, isDragging]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      document.body.classList.remove("resizing")
    }
  }, [])

  return {
    width,
    isCollapsed,
    isDragging,
    setWidth,
    resetToDefault,
    toggleCollapsed,
    handleDrag,
    startDrag,
    stopDrag,
    getResizerProps,
  }
}

export default useResizer

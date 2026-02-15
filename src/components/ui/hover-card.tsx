"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

type HoverCardContextValue = {
  open: boolean
  scheduleOpen: () => void
  scheduleClose: () => void
  cancelTimers: () => void
  triggerRef: React.MutableRefObject<HTMLElement | null>
}

const HoverCardContext = React.createContext<HoverCardContextValue | null>(null)

function useHoverCardContext() {
  const context = React.useContext(HoverCardContext)
  if (!context) {
    throw new Error("HoverCard components must be used within <HoverCard />")
  }
  return context
}

type HoverCardProps = React.ComponentProps<"span"> & {
  openDelay?: number
  closeDelay?: number
}

function HoverCard({
  className,
  openDelay = 0,
  closeDelay = 0,
  ...props
}: HoverCardProps) {
  const [open, setOpen] = React.useState(false)
  const openTimerRef = React.useRef<number | null>(null)
  const closeTimerRef = React.useRef<number | null>(null)
  const triggerRef = React.useRef<HTMLElement | null>(null)

  const clearTimer = (ref: React.MutableRefObject<number | null>) => {
    if (ref.current !== null) {
      window.clearTimeout(ref.current)
      ref.current = null
    }
  }

  const cancelTimers = React.useCallback(() => {
    clearTimer(openTimerRef)
    clearTimer(closeTimerRef)
  }, [])

  const scheduleOpen = React.useCallback(() => {
    cancelTimers()
    openTimerRef.current = window.setTimeout(() => {
      setOpen(true)
    }, openDelay)
  }, [cancelTimers, openDelay])

  const scheduleClose = React.useCallback(() => {
    cancelTimers()
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
    }, closeDelay)
  }, [cancelTimers, closeDelay])

  React.useEffect(() => {
    return () => cancelTimers()
  }, [cancelTimers])

  return (
    <HoverCardContext.Provider
      value={{ open, scheduleOpen, scheduleClose, cancelTimers, triggerRef }}
    >
      <span className={cn("relative inline-flex", className)} {...props} />
    </HoverCardContext.Provider>
  )
}

type HoverCardTriggerProps = React.ComponentProps<"span">

function HoverCardTrigger({ className, ...props }: HoverCardTriggerProps) {
  const { scheduleOpen, scheduleClose, cancelTimers, triggerRef } = useHoverCardContext()
  const { children, ...triggerProps } = props

  const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
    props.onMouseEnter?.(event)
    scheduleOpen()
  }

  const handleMouseLeave = (event: React.MouseEvent<HTMLElement>) => {
    props.onMouseLeave?.(event)
    scheduleClose()
  }

  const handleFocus = (event: React.FocusEvent<HTMLElement>) => {
    props.onFocus?.(event)
    scheduleOpen()
  }

  const handleBlur = (event: React.FocusEvent<HTMLElement>) => {
    props.onBlur?.(event)
    scheduleClose()
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    props.onMouseDown?.(event)
    cancelTimers()
  }

  return (
    <span
      className={cn("inline-flex", className)}
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseDown={handleMouseDown}
      {...triggerProps}
    >
      {children}
    </span>
  )
}

type HoverCardContentProps = React.ComponentProps<"div">

function HoverCardContent({ className, ...props }: HoverCardContentProps) {
  const { open, scheduleClose, scheduleOpen, triggerRef } = useHoverCardContext()
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = React.useState<{
    top: number
    left: number
    maxHeight: number
  } | null>(null)

  const updatePosition = React.useCallback(() => {
    const trigger = triggerRef.current
    const content = contentRef.current
    if (!trigger || !content) return

    const VIEWPORT_PADDING = 12
    const OFFSET = 8
    const rect = trigger.getBoundingClientRect()
    const contentRect = content.getBoundingClientRect()
    const contentWidth = contentRect.width
    const contentHeight = contentRect.height

    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING
    const spaceAbove = rect.top - VIEWPORT_PADDING
    const canFitBelow = contentHeight <= spaceBelow
    const canFitAbove = contentHeight <= spaceAbove
    const placeAbove = !canFitBelow && (canFitAbove || spaceAbove > spaceBelow)

    const unclampedTop = placeAbove
      ? rect.top - contentHeight - OFFSET
      : rect.bottom + OFFSET
    const maxTop = Math.max(VIEWPORT_PADDING, window.innerHeight - contentHeight - VIEWPORT_PADDING)
    const top = Math.min(Math.max(unclampedTop, VIEWPORT_PADDING), maxTop)

    const unclampedLeft = rect.left
    const maxLeft = Math.max(VIEWPORT_PADDING, window.innerWidth - contentWidth - VIEWPORT_PADDING)
    const left = Math.min(Math.max(unclampedLeft, VIEWPORT_PADDING), maxLeft)

    const maxHeight = Math.max(160, window.innerHeight - VIEWPORT_PADDING * 2)

    setPosition({
      top,
      left,
      maxHeight,
    })
  }, [triggerRef])

  React.useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    updatePosition()
  }, [open, updatePosition])

  React.useEffect(() => {
    if (!open) return
    const handle = () => updatePosition()
    window.addEventListener("scroll", handle, true)
    window.addEventListener("resize", handle)
    return () => {
      window.removeEventListener("scroll", handle, true)
      window.removeEventListener("resize", handle)
    }
  }, [open, updatePosition])

  if (!open) return null

  const content = (
    <div
      ref={contentRef}
      className={cn(
        "fixed z-50 w-max rounded-lg border bg-background text-foreground shadow-lg",
        className
      )}
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        maxHeight: position?.maxHeight ?? undefined,
        overflowY: "auto",
        visibility: position ? "visible" : "hidden",
      }}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      {...props}
    />
  )

  if (typeof document === "undefined") return content

  return createPortal(content, document.body)
}

export { HoverCard, HoverCardTrigger, HoverCardContent }

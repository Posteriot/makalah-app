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
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null)

  const updatePosition = React.useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    setPosition({
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX,
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
      className={cn(
        "absolute z-50 w-max rounded-lg border bg-background text-foreground shadow-lg",
        className
      )}
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
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

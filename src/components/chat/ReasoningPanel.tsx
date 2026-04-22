"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { NavArrowDown, NavArrowRight } from "iconoir-react"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { ReasoningActivityPanel } from "./ReasoningActivityPanel"
import { type ReasoningTraceStep } from "./ReasoningTracePanel"

// --- Constants ---

const AUTO_CLOSE_DELAY = 1000
const SCROLL_BOTTOM_THRESHOLD = 20

const TEMPLATE_LABELS = new Set([
  "Memahami kebutuhan user",
  "Memeriksa konteks paper aktif",
  "Menentukan kebutuhan pencarian web",
  "Memvalidasi sumber referensi",
  "Menyusun jawaban final",
  "Menjalankan aksi pendukung",
])

// --- Types ---

interface ReasoningPanelProps {
  /** Cumulative reasoning text snapshot (max 800 chars, tail-kept). */
  reasoningText: string | null | undefined
  /** True while model is actively reasoning. Drives auto-open. */
  isReasoning: boolean
  /** Duration in seconds after reasoning completes. */
  durationSeconds?: number
  /** Steps data for narrativeHeadline priority chain fallback. */
  reasoningSteps?: ReasoningTraceStep[]
  /**
   * ReasoningActivityPanel open state.
   * Externally controlled by ChatWindow's activeSheet === "proses".
   */
  isPanelOpen?: boolean
  onPanelOpenChange?: (open: boolean) => void
}

// --- Narrative headline priority chain ---
// Ported from ChatProcessStatusBar.tsx lines 68-97.
// Priority: raw reasoningText → non-template step labels → step thoughts → any step with content.

function resolveNarrativeHeadline(
  reasoningText: string | null | undefined,
  reasoningSteps: ReasoningTraceStep[],
): string | null {
  if (reasoningText && reasoningText.trim()) return reasoningText

  if (reasoningSteps.length === 0) return null

  const running = reasoningSteps.find((step) => step.status === "running")
  if (running) {
    if (!TEMPLATE_LABELS.has(running.label)) return running.label
    if (running.thought) return running.thought.trim()
  }

  const errored = reasoningSteps.find((step) => step.status === "error")
  if (errored) {
    if (!TEMPLATE_LABELS.has(errored.label)) return errored.label
    if (errored.thought) return errored.thought.trim()
  }

  const withContent = [...reasoningSteps].reverse().find((s) =>
    !TEMPLATE_LABELS.has(s.label) || (s.thought && s.thought.trim())
  )
  if (withContent) {
    if (!TEMPLATE_LABELS.has(withContent.label)) return withContent.label
    if (withContent.thought) return withContent.thought.trim()
  }

  return null
}

function extractFirstSentence(text: string): string {
  const match = text.match(/^[^.!?]*[.!?]/)
  return match ? match[0].trim() : text.slice(0, 80)
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds)
  if (safe < 60) return `${safe.toFixed(1)}s`
  const minutes = Math.floor(safe / 60)
  const seconds = safe - minutes * 60
  return `${minutes}m ${seconds.toFixed(0)}s`
}

// --- Component ---

export function ReasoningPanel({
  reasoningText,
  isReasoning,
  durationSeconds,
  reasoningSteps = [],
  isPanelOpen,
  onPanelOpenChange,
}: ReasoningPanelProps) {
  const [isOpen, setIsOpen] = useState(isReasoning)
  const hasUserClosedRef = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const isUserScrolledUpRef = useRef(false)

  const narrativeHeadline = useMemo(
    () => resolveNarrativeHeadline(reasoningText, reasoningSteps),
    [reasoningText, reasoningSteps],
  )

  const hasSteps = reasoningSteps.length > 0
  const canOpenActivityPanel = hasSteps

  // --- Observability: mount ---
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[REASONING-PANEL] mount | hasText=${Boolean(reasoningText)} isReasoning=${isReasoning}`)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Auto-open / auto-close: single effect tracking transitions ---
  const prevIsReasoningRef = useRef(isReasoning)
  useEffect(() => {
    const wasReasoning = prevIsReasoningRef.current
    prevIsReasoningRef.current = isReasoning

    // Transition: false → true (reasoning just started)
    if (isReasoning && !wasReasoning) {
      isUserScrolledUpRef.current = false
      const willOpen = !hasUserClosedRef.current
      if (willOpen) {
        setIsOpen(true)
      }
      hasUserClosedRef.current = false
      if (process.env.NODE_ENV !== "production") {
        console.info(`[REASONING-PANEL] auto-open | transition=false→true open=${willOpen}`)
      }
      return
    }

    // Transition: true → false (reasoning just ended)
    if (!isReasoning && wasReasoning && isOpen && narrativeHeadline) {
      if (process.env.NODE_ENV !== "production") {
        console.info(`[REASONING-PANEL] auto-close scheduled | transition=true→false delay=${AUTO_CLOSE_DELAY}ms`)
      }
      const timer = setTimeout(() => {
        setIsOpen(false)
        if (process.env.NODE_ENV !== "production") {
          console.info(`[REASONING-PANEL] auto-close fired | open=false`)
        }
      }, AUTO_CLOSE_DELAY)
      return () => clearTimeout(timer)
    }
  }, [isReasoning, isOpen, narrativeHeadline])

  // --- Auto-scroll to bottom during streaming ---
  useEffect(() => {
    if (!isReasoning || !contentRef.current || isUserScrolledUpRef.current) return
    const el = contentRef.current
    el.scrollTop = el.scrollHeight
  }, [narrativeHeadline, isReasoning])

  // --- Detect user scroll-up to pause auto-scroll ---
  const handleScroll = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_BOTTOM_THRESHOLD
    isUserScrolledUpRef.current = !isNearBottom
  }, [])

  // --- Manual toggle handler ---
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open)
    if (!open) {
      hasUserClosedRef.current = true
    } else {
      hasUserClosedRef.current = false
    }
    if (process.env.NODE_ENV !== "production") {
      console.info(`[REASONING-PANEL] user-toggle | open=${open}`)
    }
  }, [])

  // Don't render if no reasoning data
  if (!narrativeHeadline && !isReasoning) return null

  const showDuration = typeof durationSeconds === "number" && durationSeconds > 0.5

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={handleOpenChange} className="reasoning-panel">
        {/* Trigger row: flex container with trigger + Detail button as siblings (no nested buttons) */}
        <div className="flex w-full items-center gap-2 py-1.5">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-1 min-w-0 items-center gap-2 text-left",
                "transition-colors hover:bg-[var(--chat-accent)] rounded-action"
              )}
            >
              <span className="shrink-0 text-[var(--chat-muted-foreground)]">
                {isOpen
                  ? <NavArrowDown className="h-3 w-3" />
                  : <NavArrowRight className="h-3 w-3" />
                }
              </span>

              <span className="flex-1 min-w-0 text-xs font-mono text-[var(--chat-muted-foreground)]">
                {isReasoning ? (
                  <span className="flex items-center gap-1">
                    Thinking
                    <ThinkingShimmer />
                  </span>
                ) : (
                  <span className="truncate">
                    {showDuration && (
                      <span className="opacity-60">{formatDuration(durationSeconds!)} — </span>
                    )}
                    {narrativeHeadline && extractFirstSentence(narrativeHeadline)}
                  </span>
                )}
              </span>
            </button>
          </CollapsibleTrigger>

          {/* Detail button — sibling of trigger, not nested inside */}
          {!isReasoning && canOpenActivityPanel && (
            <button
              type="button"
              onClick={() => onPanelOpenChange?.(true)}
              className="shrink-0 text-[10px] font-mono text-[var(--chat-muted-foreground)] opacity-40 transition-opacity hover:opacity-80"
            >
              Detail &rarr;
            </button>
          )}
        </div>

        <CollapsibleContent>
          <div
            ref={contentRef}
            onScroll={handleScroll}
            className={cn(
              "max-h-40 overflow-y-auto rounded-md px-3 py-2",
              "whitespace-pre-wrap font-mono text-[11px] leading-relaxed",
              "text-[var(--chat-muted-foreground)]",
              "bg-[var(--chat-muted)]/30"
            )}
          >
            {narrativeHeadline}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {canOpenActivityPanel && (
        <ReasoningActivityPanel
          open={isPanelOpen ?? false}
          onOpenChange={onPanelOpenChange ?? (() => {})}
          steps={reasoningSteps}
        />
      )}
    </>
  )
}

// --- Sub-components ---

function ThinkingShimmer() {
  return (
    <span className="inline-flex shrink-0 items-center gap-px" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            "inline-block h-[3px] w-[3px] rounded-full bg-[var(--chat-muted-foreground)]",
            "animate-chat-thought-dot",
            `chat-thought-dot-${n}`
          )}
        />
      ))}
    </span>
  )
}

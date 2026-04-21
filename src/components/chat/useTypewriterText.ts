import { useEffect, useReducer, useRef } from "react"

const SENTENCE_INTERVAL_MS = 120

/**
 * Split text into chunks by "." delimiter.
 * Each completed sentence includes its trailing period. Trailing text
 * without a period is included as-is (emitted immediately as a fragment).
 *
 * "Hello world. I am thinking. Now" → ["Hello world.", "I am thinking.", "Now"]
 */
function splitSentences(text: string): string[] {
  if (!text.trim()) return []
  // Split on ". " (period + space) keeping the period with the left part
  const parts = text.split(/(?<=\.)\s+/)
  return parts.map((s) => s.trim()).filter(Boolean)
}

type TypewriterState = {
  displayedText: string
  isActiveSnapshot: boolean
}

type TypewriterAction =
  | { type: "markInactive" }
  | { type: "startActive" }
  | { type: "replace"; text: string }

function typewriterReducer(
  state: TypewriterState,
  action: TypewriterAction
): TypewriterState {
  switch (action.type) {
    case "markInactive":
      return state.isActiveSnapshot
        ? { ...state, isActiveSnapshot: false }
        : state
    case "startActive":
      return state.displayedText === "" && state.isActiveSnapshot
        ? state
        : { displayedText: "", isActiveSnapshot: true }
    case "replace":
      return state.displayedText === action.text && state.isActiveSnapshot
        ? state
        : { displayedText: action.text, isActiveSnapshot: true }
  }
}

export function useTypewriterText(
  cumulativeText: string | null | undefined,
  isActive: boolean
): string {
  const [state, dispatch] = useReducer(
    typewriterReducer,
    isActive,
    (initialIsActive): TypewriterState => ({
      displayedText: "",
      isActiveSnapshot: initialIsActive,
    })
  )
  const queueRef = useRef<string[]>([])
  const enqueuedCountRef = useRef(0)
  const displayedSentencesRef = useRef<string[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevIsActiveRef = useRef(isActive)
  const lastSnapshotRef = useRef("")

  // Diff new cumulative snapshot → enqueue new sentences
  useEffect(() => {
    const text = cumulativeText ?? ""

    const wasInactive = !prevIsActiveRef.current && isActive
    prevIsActiveRef.current = isActive

    if (!text) {
      // During active streaming, empty text is transient (gap between
      // reasoning snapshots or reset part before new data arrives).
      // Keep showing last displayed text to avoid empty-bar flicker.
      if (isActive) return

      queueRef.current = []
      displayedSentencesRef.current = []
      enqueuedCountRef.current = 0
      lastSnapshotRef.current = ""
      dispatch({ type: "markInactive" })
      return
    }

    if (!isActive) {
      queueRef.current = []
      displayedSentencesRef.current = splitSentences(text)
      enqueuedCountRef.current = displayedSentencesRef.current.length
      lastSnapshotRef.current = text
      dispatch({ type: "markInactive" })
      return
    }

    const newSentences = splitSentences(text)

    if (wasInactive) {
      displayedSentencesRef.current = []
      enqueuedCountRef.current = 0
      dispatch({ type: "startActive" })
      queueRef.current = [...newSentences]
      enqueuedCountRef.current = newSentences.length
      lastSnapshotRef.current = text
      return
    }

    if (text === lastSnapshotRef.current) return
    lastSnapshotRef.current = text

    if (newSentences.length === enqueuedCountRef.current) {
      const displayedCount = displayedSentencesRef.current.length
      const nextDisplayed = newSentences.slice(0, displayedCount)
      const nextQueued = newSentences.slice(displayedCount)

      displayedSentencesRef.current = nextDisplayed
      queueRef.current = nextQueued

      if (displayedCount > 0) {
        dispatch({ type: "replace", text: nextDisplayed.join(" ") })
      }
      return
    }

    // Only enqueue when sentence count grows.
    // Sanitizer can modify text between snapshots, which may transiently
    // reduce sentence count — ignore decreases to avoid mid-stream resets.
    if (newSentences.length > enqueuedCountRef.current) {
      const fresh = newSentences.slice(enqueuedCountRef.current)
      queueRef.current.push(...fresh)
      enqueuedCountRef.current = newSentences.length
    }
  }, [cumulativeText, isActive])

  // Interval loop: dequeue one sentence at a time
  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      if (queueRef.current.length === 0) return

      displayedSentencesRef.current.push(queueRef.current.shift()!)
      dispatch({ type: "replace", text: displayedSentencesRef.current.join(" ") })
    }, SENTENCE_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive])

  if (!isActive) return cumulativeText ?? ""
  if (!state.isActiveSnapshot) return ""
  return state.displayedText
}

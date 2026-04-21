import { useEffect, useRef, useState } from "react"

const WORD_INTERVAL_MS = 80

export function useTypewriterText(
  cumulativeText: string | null | undefined,
  isActive: boolean
): string {
  const [displayedText, setDisplayedText] = useState("")
  const queueRef = useRef<string[]>([])
  const enqueuedCountRef = useRef(0)
  const displayedWordsRef = useRef<string[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevIsActiveRef = useRef(isActive)

  // Diff new cumulative snapshot → enqueue new words
  useEffect(() => {
    const text = cumulativeText ?? ""

    // Detect isActive transition: false → true → reset so typewriter starts fresh.
    // This handles the case where processUi.status lags behind activeReasoningState
    // causing the hook to snap-to-full while inactive, then never recovering.
    const wasInactive = !prevIsActiveRef.current && isActive
    prevIsActiveRef.current = isActive

    if (!text) {
      queueRef.current = []
      displayedWordsRef.current = []
      enqueuedCountRef.current = 0
      setDisplayedText("")
      return
    }

    if (!isActive) {
      // Snap to full text when not active
      queueRef.current = []
      displayedWordsRef.current = text.split(/\s+/).filter(Boolean)
      enqueuedCountRef.current = displayedWordsRef.current.length
      setDisplayedText(text)
      return
    }

    const newWords = text.split(/\s+/).filter(Boolean)

    if (wasInactive) {
      // Fresh start after activation — typewriter from scratch
      displayedWordsRef.current = []
      enqueuedCountRef.current = 0
      setDisplayedText("")
      queueRef.current = [...newWords]
      enqueuedCountRef.current = newWords.length
      return
    }

    // Use word count tracking instead of prefix comparison.
    // sanitizeReasoningSnapshot can modify earlier text between snapshots
    // (punctuation, markdown stripping), which breaks prefix-based diffing.
    // Word count is stable: cumulative text only grows in word count.
    if (newWords.length > enqueuedCountRef.current) {
      const freshWords = newWords.slice(enqueuedCountRef.current)
      queueRef.current.push(...freshWords)
      enqueuedCountRef.current = newWords.length
    } else if (newWords.length < enqueuedCountRef.current) {
      // Genuinely shorter text (e.g., reset between turns) — restart
      displayedWordsRef.current = []
      setDisplayedText("")
      queueRef.current = [...newWords]
      enqueuedCountRef.current = newWords.length
    }
    // If equal, nothing new to enqueue
  }, [cumulativeText, isActive])

  // Interval loop: dequeue one word at a time
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

      const word = queueRef.current.shift()!
      displayedWordsRef.current.push(word)
      setDisplayedText(displayedWordsRef.current.join(" "))
    }, WORD_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive])

  return displayedText
}

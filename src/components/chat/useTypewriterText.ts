import { useEffect, useRef, useState } from "react"

const WORD_INTERVAL_MS = 80
const CATCH_UP_THRESHOLD = 8

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

    // Only enqueue when word count grows. Ignore decreases — sanitizer can
    // merge/split tokens between snapshots (e.g., "world . foo" → "world.foo"),
    // which reduces word count without meaning the text was reset.
    // Genuine resets are handled by the empty-text branch and wasInactive branch.
    if (newWords.length > enqueuedCountRef.current) {
      const freshWords = newWords.slice(enqueuedCountRef.current)
      queueRef.current.push(...freshWords)
      enqueuedCountRef.current = newWords.length
    }
  }, [cumulativeText, isActive])

  // Interval loop: dequeue words with adaptive catch-up speed
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

      // Adaptive speed: when queue grows beyond threshold, dequeue multiple
      // words per tick so the displayed text catches up to the server.
      // Server produces ~60 words/sec, single-word drain is 12.5 words/sec.
      // Without catch-up, queue grows unbounded and typewriter lags far behind.
      const wordsPerTick = queueRef.current.length > CATCH_UP_THRESHOLD
        ? Math.ceil(queueRef.current.length / 4)
        : 1

      for (let i = 0; i < wordsPerTick && queueRef.current.length > 0; i++) {
        displayedWordsRef.current.push(queueRef.current.shift()!)
      }
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

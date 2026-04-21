import { useEffect, useRef, useState } from "react"

const WORD_INTERVAL_MS = 80

export function useTypewriterText(
  cumulativeText: string | null | undefined,
  isActive: boolean
): string {
  const [displayedText, setDisplayedText] = useState("")
  const queueRef = useRef<string[]>([])
  const prevSnapshotRef = useRef("")
  const displayedWordsRef = useRef<string[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Diff new cumulative snapshot → enqueue new words
  useEffect(() => {
    const text = cumulativeText ?? ""

    if (!text) {
      // Reset on empty/null
      queueRef.current = []
      displayedWordsRef.current = []
      prevSnapshotRef.current = ""
      setDisplayedText("")
      return
    }

    if (!isActive) {
      // Snap to full text when not active
      queueRef.current = []
      displayedWordsRef.current = text.split(/\s+/).filter(Boolean)
      prevSnapshotRef.current = text
      setDisplayedText(text)
      return
    }

    const prevWords = prevSnapshotRef.current ? prevSnapshotRef.current.split(/\s+/).filter(Boolean) : []
    const newWords = text.split(/\s+/).filter(Boolean)

    // Check if this is a continuation (new text starts with prev text)
    const isContinuation = prevWords.length > 0 &&
      newWords.slice(0, prevWords.length).join(" ") === prevWords.join(" ")

    if (isContinuation) {
      // Only enqueue the truly new words
      const freshWords = newWords.slice(prevWords.length)
      queueRef.current.push(...freshWords)
    } else {
      // Completely new text — reset and enqueue all
      displayedWordsRef.current = []
      setDisplayedText("")
      queueRef.current = [...newWords]
    }

    prevSnapshotRef.current = text
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

import { useEffect, useRef, useState } from "react"

/**
 * Split text into chunks by "." delimiter.
 * Each completed sentence includes its trailing period. Trailing text
 * without a period is included as-is (the active fragment still growing).
 *
 * "Hello world. I am thinking. Now" → ["Hello world.", "I am thinking.", "Now"]
 */
function splitSentences(text: string): string[] {
  if (!text.trim()) return []
  const parts = text.split(/(?<=\.)\s+/)
  return parts.map((s) => s.trim()).filter(Boolean)
}

/**
 * Typewriter hook for reasoning text. Shows only the LAST (most recent)
 * sentence, updating in place as it grows. When a new sentence starts
 * (period detected), switches to showing the new sentence.
 *
 * This ensures the visible text in the truncated status bar always shows
 * the CURRENT thought, not old text that scrolled off-screen.
 */
export function useTypewriterText(
  cumulativeText: string | null | undefined,
  isActive: boolean
): string {
  const [displayedText, setDisplayedText] = useState("")
  const sentenceCountRef = useRef(0)
  const prevIsActiveRef = useRef(isActive)

  useEffect(() => {
    const text = cumulativeText ?? ""

    const wasInactive = !prevIsActiveRef.current && isActive
    prevIsActiveRef.current = isActive

    if (!text) {
      if (isActive) {
        sentenceCountRef.current = 0
        return
      }
      sentenceCountRef.current = 0
      setDisplayedText("")
      return
    }

    if (!isActive) {
      const sentences = splitSentences(text)
      sentenceCountRef.current = sentences.length
      setDisplayedText(sentences.length > 0 ? sentences[sentences.length - 1] : text)
      return
    }

    const sentences = splitSentences(text)
    if (sentences.length === 0) return

    if (wasInactive) {
      sentenceCountRef.current = sentences.length
    }

    // Always show the last sentence — it's the most recent thought.
    // When sentence count grows (new period arrived), the display
    // naturally switches to the new sentence.
    const lastSentence = sentences[sentences.length - 1]
    sentenceCountRef.current = sentences.length
    setDisplayedText(lastSentence)
  }, [cumulativeText, isActive])

  return displayedText
}

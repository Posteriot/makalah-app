import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useTypewriterText } from "./useTypewriterText"

describe("useTypewriterText", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns empty string when input is null", () => {
    const { result } = renderHook(() => useTypewriterText(null, true))
    expect(result.current).toBe("")
  })

  it("returns empty string when input is undefined", () => {
    const { result } = renderHook(() => useTypewriterText(undefined, true))
    expect(result.current).toBe("")
  })

  it("returns full text immediately when isActive is false", () => {
    const { result } = renderHook(() =>
      useTypewriterText("Hello world foo bar", false)
    )
    expect(result.current).toBe("Hello world foo bar")
  })

  it("reveals words one at a time when active", () => {
    const { result } = renderHook(() =>
      useTypewriterText("Hello world", true)
    )

    // Initially empty — words are queued
    expect(result.current).toBe("")

    // After one interval tick (~80ms), first word appears
    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Hello")

    // After another tick, second word appears
    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Hello world")
  })

  it("diffs cumulative snapshots by word count to extract new words", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriterText(text, true),
      { initialProps: { text: "Analyzing" as string | null } }
    )

    // Drain first word
    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Analyzing")

    // New cumulative snapshot arrives with more words
    rerender({ text: "Analyzing the Chosen Topic" })

    // Queue now has ["the", "Chosen", "Topic"]
    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Analyzing the")

    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Analyzing the Chosen")

    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Analyzing the Chosen Topic")
  })

  it("survives sanitizer modifying earlier text between snapshots", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriterText(text, true),
      { initialProps: { text: "Hello world." as string | null } }
    )

    // Drain both words
    act(() => { vi.advanceTimersByTime(80 * 2) })
    expect(result.current).toBe("Hello world.")

    // Sanitizer modifies punctuation in earlier text but adds new words
    // Word count goes from 2 to 5 — enqueue 3 new words (positions 2,3,4)
    rerender({ text: "Hello world I am thinking" })

    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Hello world. I")

    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Hello world. I am")

    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Hello world. I am thinking")
  })

  it("ignores word count decrease from sanitizer without resetting", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriterText(text, true),
      { initialProps: { text: "Hello world . foo bar" as string | null } }
    )

    // Drain all 5 words
    act(() => { vi.advanceTimersByTime(80 * 5) })
    expect(result.current).toBe("Hello world . foo bar")

    // Sanitizer merges tokens: "world . foo" → "world.foo", word count drops 5→4
    // Should NOT reset — just ignore the decrease
    rerender({ text: "Hello world.foo bar baz" })

    // Only "baz" should be enqueued (position 4, since enqueuedCount was 5 but
    // newWords.length is now 4 which is < 5, so nothing is enqueued)
    // Actually with the fix, decreases are ignored, so displayedWords stays at 5
    // and when word count grows past 5 again, new words get enqueued
    act(() => { vi.advanceTimersByTime(80) })
    // No new words enqueued since 4 < 5
    expect(result.current).toBe("Hello world . foo bar")

    // Now word count grows past the previous high-water mark
    rerender({ text: "Hello world.foo bar baz qux extra" })
    // newWords.length = 5, enqueuedCount = 5, equal → nothing enqueued
    // newWords.length = 6 when "extra" is added
    rerender({ text: "Hello world.foo bar baz qux extra more" })
    // newWords.length = 7 > enqueuedCount(5) → enqueue ["extra", "more"]
    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Hello world . foo bar extra")
  })

  it("catches up with adaptive speed when queue grows large", () => {
    // Build a 20-word string to exceed CATCH_UP_THRESHOLD (8)
    const words = Array.from({ length: 20 }, (_, i) => `word${i}`)
    const { result } = renderHook(() =>
      useTypewriterText(words.join(" "), true)
    )

    // Queue has 20 words, threshold is 8
    // First tick: wordsPerTick = ceil(20/4) = 5
    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe(words.slice(0, 5).join(" "))

    // Second tick: queue has 15, wordsPerTick = ceil(15/4) = 4
    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe(words.slice(0, 9).join(" "))

    // Third tick: queue has 11, wordsPerTick = ceil(11/4) = 3
    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe(words.slice(0, 12).join(" "))

    // Fourth tick: queue has 8 (= threshold, not >), wordsPerTick = 1
    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe(words.slice(0, 13).join(" "))

    // Fifth tick: queue has 7 (≤ 8), wordsPerTick = 1
    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe(words.slice(0, 14).join(" "))
  })

  it("pauses naturally when queue is empty", () => {
    const { result } = renderHook(() =>
      useTypewriterText("Hello", true)
    )

    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Hello")

    // Extra ticks do nothing — queue is empty
    act(() => { vi.advanceTimersByTime(240) })
    expect(result.current).toBe("Hello")
  })

  it("snaps to full text when isActive flips to false", () => {
    const { result, rerender } = renderHook(
      ({ text, active }) => useTypewriterText(text, active),
      { initialProps: { text: "Hello world foo bar", active: true } }
    )

    // Only drain one word
    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Hello")

    // Deactivate — should snap to full text
    rerender({ text: "Hello world foo bar", active: false })
    expect(result.current).toBe("Hello world foo bar")
  })

  it("starts typewriter fresh when isActive transitions from false to true", () => {
    const { result, rerender } = renderHook(
      ({ text, active }) => useTypewriterText(text, active),
      { initialProps: { text: "Previous turn reasoning text here", active: false as boolean } }
    )

    // Inactive — snaps to full text
    expect(result.current).toBe("Previous turn reasoning text here")

    // isActive flips to true (processUi catches up)
    // Should reset and start typewriter from scratch
    rerender({ text: "Previous turn reasoning text here", active: true })

    // After reset, displayed text starts empty and words appear one by one
    expect(result.current).toBe("")

    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Previous")

    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Previous turn")
  })

  it("resets when input changes to a completely different string", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriterText(text, true),
      { initialProps: { text: "First message" as string | null } }
    )

    act(() => { vi.advanceTimersByTime(160) })
    expect(result.current).toBe("First message")

    // New unrelated snapshot (e.g., new reasoning turn with reset)
    rerender({ text: "" })
    rerender({ text: "Second message entirely" })

    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Second")

    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Second message")
  })
})

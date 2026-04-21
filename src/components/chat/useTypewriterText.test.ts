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
      useTypewriterText("Hello world. I am thinking.", false)
    )
    expect(result.current).toBe("Hello world. I am thinking.")
  })

  it("reveals sentences one at a time when active", () => {
    const { result } = renderHook(() =>
      useTypewriterText("First sentence. Second sentence. Third.", true)
    )

    // Initially empty — sentences are queued
    expect(result.current).toBe("")

    // After one tick (~120ms), first sentence appears
    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("First sentence.")

    // After another tick, second sentence appends
    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("First sentence. Second sentence.")

    // Third tick
    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("First sentence. Second sentence. Third.")
  })

  it("diffs cumulative snapshots by sentence count", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriterText(text, true),
      { initialProps: { text: "Analyzing." as string | null } }
    )

    // Drain first sentence
    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("Analyzing.")

    // New cumulative snapshot with more sentences
    rerender({ text: "Analyzing. Now I see the topic. Moving forward." })

    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("Analyzing. Now I see the topic.")

    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("Analyzing. Now I see the topic. Moving forward.")
  })

  it("holds incomplete sentence until period arrives", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriterText(text, true),
      { initialProps: { text: "First sentence." as string | null } }
    )

    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("First sentence.")

    // Incomplete sentence arrives (no period yet)
    rerender({ text: "First sentence. I am now thinking about" })

    // 2 sentences split: ["First sentence.", "I am now thinking about"]
    // "I am now thinking about" is the incomplete part — still gets enqueued
    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("First sentence. I am now thinking about")
  })

  it("ignores sentence count decrease from sanitizer", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriterText(text, true),
      { initialProps: { text: "Hello. World. Foo." as string | null } }
    )

    // Drain all 3 sentences
    act(() => { vi.advanceTimersByTime(120 * 3) })
    expect(result.current).toBe("Hello. World. Foo.")

    // Sanitizer merges sentences: "Hello. World." → "Hello World."
    // Sentence count drops 3 → 2. Should NOT reset.
    rerender({ text: "Hello World. Foo. Bar." })

    // No new sentences enqueued (3 > enqueuedCount 3? no, 3 === 3)
    // Actually: splitSentences("Hello World. Foo. Bar.") = ["Hello World.", "Foo.", "Bar."] = 3
    // 3 === enqueuedCount(3) → nothing enqueued
    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("Hello. World. Foo.")

    // Now add genuinely new sentence
    rerender({ text: "Hello World. Foo. Bar. New sentence." })
    // 4 > 3 → enqueue ["New sentence."]
    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("Hello. World. Foo. New sentence.")
  })

  it("pauses naturally when queue is empty", () => {
    const { result } = renderHook(() =>
      useTypewriterText("Hello.", true)
    )

    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("Hello.")

    // Extra ticks do nothing
    act(() => { vi.advanceTimersByTime(360) })
    expect(result.current).toBe("Hello.")
  })

  it("snaps to full text when isActive flips to false", () => {
    const { result, rerender } = renderHook(
      ({ text, active }) => useTypewriterText(text, active),
      { initialProps: { text: "First. Second. Third.", active: true } }
    )

    // Only drain one sentence
    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("First.")

    // Deactivate — snap to full text
    rerender({ text: "First. Second. Third.", active: false })
    expect(result.current).toBe("First. Second. Third.")
  })

  it("starts typewriter fresh when isActive transitions from false to true", () => {
    const { result, rerender } = renderHook(
      ({ text, active }) => useTypewriterText(text, active),
      { initialProps: { text: "Previous reasoning. Full text here.", active: false as boolean } }
    )

    expect(result.current).toBe("Previous reasoning. Full text here.")

    // Activate — reset and typewrite from scratch
    rerender({ text: "Previous reasoning. Full text here.", active: true })
    expect(result.current).toBe("")

    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("Previous reasoning.")

    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("Previous reasoning. Full text here.")
  })

  it("resets when input changes to empty then new text", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriterText(text, true),
      { initialProps: { text: "First turn." as string | null } }
    )

    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("First turn.")

    // Reset between turns
    rerender({ text: "" })
    rerender({ text: "Second turn. New reasoning." })

    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("Second turn.")

    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("Second turn. New reasoning.")
  })

  it("handles text without periods as single sentence", () => {
    const { result } = renderHook(() =>
      useTypewriterText("Analyzing the user input now", true)
    )

    // No period → single sentence → appears in one tick
    act(() => { vi.advanceTimersByTime(120) })
    expect(result.current).toBe("Analyzing the user input now")
  })
})

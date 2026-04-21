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

  it("diffs cumulative snapshots to extract only new words", () => {
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

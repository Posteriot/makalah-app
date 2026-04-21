import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useTypewriterText } from "./useTypewriterText"

describe("useTypewriterText", () => {
  it("returns empty string when input is null", () => {
    const { result } = renderHook(() => useTypewriterText(null, true))
    expect(result.current).toBe("")
  })

  it("returns empty string when input is undefined", () => {
    const { result } = renderHook(() => useTypewriterText(undefined, true))
    expect(result.current).toBe("")
  })

  it("returns last sentence when isActive is false", () => {
    const { result } = renderHook(() =>
      useTypewriterText("First thought. Second thought. Current.", false)
    )
    expect(result.current).toBe("Current.")
  })

  it("shows last sentence during active streaming", () => {
    const { result } = renderHook(() =>
      useTypewriterText("Analyzing the topic. Now reviewing.", true)
    )
    expect(result.current).toBe("Now reviewing.")
  })

  it("updates trailing fragment as it grows", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriterText(text, true),
      { initialProps: { text: "Analyzing" as string | null } }
    )
    expect(result.current).toBe("Analyzing")

    rerender({ text: "Analyzing the topic" })
    expect(result.current).toBe("Analyzing the topic")

    rerender({ text: "Analyzing the topic and reviewing" })
    expect(result.current).toBe("Analyzing the topic and reviewing")
  })

  it("switches to new sentence when period arrives", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriterText(text, true),
      { initialProps: { text: "Analyzing the topic" as string | null } }
    )
    expect(result.current).toBe("Analyzing the topic")

    // Period completes the sentence, new fragment starts
    rerender({ text: "Analyzing the topic. Now I see" })
    expect(result.current).toBe("Now I see")

    rerender({ text: "Analyzing the topic. Now I see the pattern" })
    expect(result.current).toBe("Now I see the pattern")
  })

  it("snaps to full last sentence when isActive flips to false", () => {
    const { result, rerender } = renderHook(
      ({ text, active }) => useTypewriterText(text, active),
      { initialProps: { text: "First. Second. Third.", active: true } }
    )
    expect(result.current).toBe("Third.")

    rerender({ text: "First. Second. Third.", active: false })
    expect(result.current).toBe("Third.")
  })

  it("keeps last text when input transiently empties during streaming", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriterText(text, true),
      { initialProps: { text: "Current thought." as string | null } }
    )
    expect(result.current).toBe("Current thought.")

    rerender({ text: "" })
    expect(result.current).toBe("Current thought.")
  })

  it("shows new text after empty gap during streaming", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriterText(text, true),
      { initialProps: { text: "Old reasoning." as string | null } }
    )
    expect(result.current).toBe("Old reasoning.")

    rerender({ text: "" })
    expect(result.current).toBe("Old reasoning.")

    rerender({ text: "New reasoning starts" })
    expect(result.current).toBe("New reasoning starts")
  })

  it("resets when deactivated then reactivated with new text", () => {
    const { result, rerender } = renderHook(
      ({ text, active }) => useTypewriterText(text, active),
      { initialProps: { text: "First turn." as string | null, active: true as boolean } }
    )
    expect(result.current).toBe("First turn.")

    rerender({ text: "", active: false })
    expect(result.current).toBe("")

    rerender({ text: "Second turn. New thought.", active: true })
    expect(result.current).toBe("New thought.")
  })

  it("handles text without periods as single fragment", () => {
    const { result } = renderHook(() =>
      useTypewriterText("Analyzing the user input now", true)
    )
    expect(result.current).toBe("Analyzing the user input now")
  })
})

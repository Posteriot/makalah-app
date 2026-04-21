import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ChatProcessStatusBar } from "./ChatProcessStatusBar"

const mockReasoningActivityPanel = vi.fn((..._args: unknown[]) => null)

vi.mock("./ReasoningActivityPanel", () => ({
  ReasoningActivityPanel: (props: unknown) => {
    mockReasoningActivityPanel(props)
    return null
  },
}))

describe("ChatProcessStatusBar transparent mode", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("menahan headline transparent saat status masih streaming agar tidak jatuh ke dots-only", () => {
    render(
      <ChatProcessStatusBar
        visible
        status="streaming"
        progress={48}
        elapsedSeconds={6.8}
        reasoningHeadline="Sedang membandingkan dua jalur penalaran yang paling kuat."
        reasoningSteps={[
          {
            traceId: "trace-streaming",
            stepKey: "response-compose",
            label: "Menyusun jawaban final",
            status: "running",
            progress: 48,
          },
        ]}
        reasoningTraceMode="transparent"
      />
    )

    // Advance fake timers to drain sentences through typewriter queue
    // Sentence interval is 120ms; this headline is 1 sentence
    act(() => { vi.advanceTimersByTime(120 * 2) })

    expect(
      screen.getByText("Sedang membandingkan dua jalur penalaran yang paling kuat.")
    ).toBeInTheDocument()
    expect(screen.getByText("48%")).toBeInTheDocument()
  })

  it("reveals reasoning headline sentence by sentence during streaming (typewriter)", () => {
    const { container } = render(
      <ChatProcessStatusBar
        visible
        status="streaming"
        progress={30}
        elapsedSeconds={3.5}
        reasoningHeadline="Analyzing the topic. Now reviewing the outline."
        reasoningSteps={[]}
      />
    )

    // Before any interval ticks, the inner truncate span should not exist yet
    expect(container.querySelector(".truncate .truncate")).not.toBeInTheDocument()

    // After one tick (~120ms), first sentence appears
    act(() => { vi.advanceTimersByTime(120) })
    const textEl = container.querySelector(".truncate .truncate")
    expect(textEl).toBeInTheDocument()
    expect(textEl!.textContent).toBe("Analyzing the topic.")

    // After second tick, second sentence appends
    act(() => { vi.advanceTimersByTime(120) })
    expect(container.querySelector(".truncate .truncate")!.textContent).toBe("Analyzing the topic. Now reviewing the outline.")
  })

  it("tetap menampilkan raw thought dan masih menyediakan drill-down timeline saat transparent", () => {
    render(
      <ChatProcessStatusBar
        visible
        status="ready"
        progress={100}
        elapsedSeconds={12.4}
        reasoningHeadline="Sedang memilah temuan paling relevan untuk jawaban akhir."
        reasoningSteps={[
          {
            traceId: "trace-1",
            stepKey: "response-compose",
            label: "Sedang memilah temuan paling relevan untuk jawaban akhir.",
            status: "done",
            progress: 100,
            thought: "Sedang memilah temuan paling relevan untuk jawaban akhir.",
          },
        ]}
        reasoningTraceMode="transparent"
      />
    )

    fireEvent.click(screen.getByRole("button"))

    expect(
      screen.getByText("Sedang memilah temuan paling relevan untuk jawaban akhir.")
    ).toBeInTheDocument()
    const detailButton = screen.getByText("Detail →")
    expect(detailButton).toBeInTheDocument()
    expect(mockReasoningActivityPanel).toHaveBeenCalled()

    fireEvent.click(detailButton)

    expect(
      (mockReasoningActivityPanel.mock.calls as Array<[unknown]>).some(
        ([props]) =>
          Boolean(props) &&
          typeof props === "object" &&
          "open" in (props as Record<string, unknown>) &&
          (props as { open?: boolean }).open === true
      )
    ).toBe(true)
  })

  it("respects visible=false even while streaming", () => {
    const { container } = render(
      <ChatProcessStatusBar
        visible={false}
        status="streaming"
        progress={88}
        elapsedSeconds={9.2}
        reasoningHeadline={null}
        reasoningSteps={[]}
      />
    )

    expect(container.querySelector("[role='status']")).not.toBeInTheDocument()
  })

  it("tetap mempertahankan drill-down timeline pada mode curated", () => {
    render(
      <ChatProcessStatusBar
        visible
        status="ready"
        progress={100}
        elapsedSeconds={9.1}
        reasoningSteps={[
          {
            traceId: "trace-curated",
            stepKey: "response-compose",
            label: "Menyusun jawaban final",
            status: "done",
            progress: 100,
          },
        ]}
        reasoningTraceMode="curated"
      />
    )

    fireEvent.click(screen.getByRole("button"))

    expect(
      (mockReasoningActivityPanel.mock.calls as Array<[unknown]>).some(
        ([props]) =>
          Boolean(props) &&
          typeof props === "object" &&
          "open" in (props as Record<string, unknown>) &&
          (props as { open?: boolean }).open === true
      )
    ).toBe(true)
  })
})

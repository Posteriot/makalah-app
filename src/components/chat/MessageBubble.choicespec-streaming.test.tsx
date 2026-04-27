import { render, screen } from "@testing-library/react"
import type { UIMessage } from "ai"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SPEC_DATA_PART_TYPE } from "@json-render/core"
import { MessageBubble } from "./MessageBubble"

vi.mock("./QuickActions", () => ({
  QuickActions: ({ content }: { content: string }) => <div data-testid="quick-actions-content">{content}</div>,
}))

vi.mock("./ArtifactIndicator", () => ({
  ArtifactIndicator: () => null,
}))

vi.mock("./ToolStateIndicator", () => ({
  ToolStateIndicator: () => null,
}))

vi.mock("./SourcesIndicator", () => ({
  SourcesIndicator: () => null,
}))

vi.mock("./MarkdownRenderer", () => ({
  MarkdownRenderer: ({ markdown }: { markdown: string }) => <div>{markdown}</div>,
}))

/**
 * Regression test: ChoiceSpec validation FAILED should NOT fire during
 * active streaming (persistProcessIndicators=true) when the spec is
 * still partial/invalid. It SHOULD fire when streaming is complete
 * (persistProcessIndicators=false) and the final spec is genuinely invalid.
 *
 * See: E2E test #1 stage gagasan — 80+ false-positive warnings polluted
 * browser console during streaming.
 */
describe("MessageBubble ChoiceSpec streaming suppression", () => {
  const invalidSpecMessage = {
    id: "m-partial-spec",
    role: "assistant",
    parts: [
      { type: "text", text: "Menunggu pilihan." },
      {
        type: SPEC_DATA_PART_TYPE,
        data: {
          type: "flat",
          spec: {
            root: "shell",
            elements: {
              shell: {
                type: "ChoiceCardShell",
                props: { title: "Pilihan fokus" },
                children: ["bad"],
              },
              // Invalid: null element causes Zod validation to fail
              bad: null,
            },
          },
        },
      },
    ],
  } as unknown as UIMessage

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("suppresses ChoiceSpec validation FAILED during active streaming", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    render(
      <MessageBubble
        message={invalidSpecMessage}
        persistProcessIndicators={true}
      />
    )

    expect(screen.getAllByText("Menunggu pilihan.").length).toBeGreaterThan(0)

    const choiceSpecWarnings = warnSpy.mock.calls.filter(
      (args) => typeof args[0] === "string" && args[0].includes("ChoiceSpec validation FAILED")
    )
    expect(choiceSpecWarnings).toHaveLength(0)
  })

  it("emits ChoiceSpec validation FAILED when streaming is complete and spec is invalid", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    render(
      <MessageBubble
        message={invalidSpecMessage}
        persistProcessIndicators={false}
      />
    )

    expect(screen.getAllByText("Menunggu pilihan.").length).toBeGreaterThan(0)

    const choiceSpecWarnings = warnSpy.mock.calls.filter(
      (args) => typeof args[0] === "string" && args[0].includes("ChoiceSpec validation FAILED")
    )
    expect(choiceSpecWarnings.length).toBeGreaterThan(0)
  })
})

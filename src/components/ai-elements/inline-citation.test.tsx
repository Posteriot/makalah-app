import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { InlineCitationCard, InlineCitationCardTrigger } from "./inline-citation"

describe("InlineCitationCardTrigger", () => {
  it("renders hostname with +n suffix and keeps plain text styling", () => {
    render(
      <InlineCitationCard>
        <InlineCitationCardTrigger
          sources={[
            "https://example.com/a",
            "https://example.com/b",
            "https://example.com/c",
          ]}
        />
      </InlineCitationCard>
    )

    const trigger = screen.getByText("example.com +2")
    expect(trigger).toBeInTheDocument()
    expect(trigger.className).toContain("font-mono")
    expect(trigger.className).toContain("text-[var(--chat-info)]")
    expect(trigger.className).not.toContain("bg-")
  })
})


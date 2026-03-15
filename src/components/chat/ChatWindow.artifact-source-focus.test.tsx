import { describe, expect, it } from "vitest"
import { resolveArtifactSourceFocusTarget } from "./ChatWindow"

describe("resolveArtifactSourceFocusTarget", () => {
  it("memprioritaskan sourceMessageId bila node pesan tersedia", () => {
    document.body.innerHTML = `
      <div data-message-id="message-9">
        <button data-artifact-trigger-id="artifact-1">Artifact</button>
      </div>
    `

    const target = resolveArtifactSourceFocusTarget(document, {
      artifactId: "artifact-1",
      sourceMessageId: "message-9",
    })

    expect(target?.highlightedMessageId).toBe("message-9")
    expect(target?.element.getAttribute("data-message-id")).toBe("message-9")
  })

  it("fallback ke trigger artifact terdekat saat sourceMessageId tidak ditemukan", () => {
    document.body.innerHTML = `
      <div data-message-id="message-3">
        <button data-artifact-trigger-id="artifact-2">Artifact</button>
      </div>
    `

    const target = resolveArtifactSourceFocusTarget(document, {
      artifactId: "artifact-2",
      sourceMessageId: "message-missing",
    })

    expect(target?.highlightedMessageId).toBe("message-3")
    expect(target?.element.getAttribute("data-message-id")).toBe("message-3")
  })
})

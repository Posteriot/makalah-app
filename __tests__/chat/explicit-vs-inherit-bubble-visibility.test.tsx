import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MessageBubble } from "@/components/chat/MessageBubble"

describe("explicit vs inherit attachment bubble visibility", () => {
  it("shows chip for explicit attachment message", () => {
    render(
      <MessageBubble
        message={{
          id: "msg-explicit-1",
          role: "user",
          attachmentMode: "explicit",
          fileIds: ["file-1"],
          parts: [{ type: "text", text: "Ringkasin dokumen ini" }],
          annotations: [
            {
              type: "file_ids",
              fileIds: ["file-1"],
              fileNames: ["dokumen-penting.pdf"],
              fileSizes: [1024],
              fileTypes: ["application/pdf"],
            },
          ],
        } as never}
      />
    )

    expect(screen.getByText(".pdf")).toBeInTheDocument()
  })

  it("hides chip for inherit message", () => {
    render(
      <MessageBubble
        message={{
          id: "msg-inherit-1",
          role: "user",
          attachmentMode: "inherit",
          fileIds: ["file-ctx-1"],
          parts: [{ type: "text", text: "lanjut" }],
          annotations: [
            {
              type: "file_ids",
              fileIds: ["file-ctx-1"],
              fileNames: ["dokumen-konteks.pdf"],
              fileSizes: [1024],
              fileTypes: ["application/pdf"],
            },
          ],
        } as never}
      />
    )

    expect(screen.queryByText(".pdf")).not.toBeInTheDocument()
    expect(screen.queryByText("1.0 KB")).not.toBeInTheDocument()
  })
})

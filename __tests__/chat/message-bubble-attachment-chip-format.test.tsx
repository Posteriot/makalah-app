import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MessageBubble } from "@/components/chat/MessageBubble"

describe("message bubble attachment chip format", () => {
  it("shows extension and size for long file names after message is sent", () => {
    render(
      <MessageBubble
        message={{
          id: "msg-user-1",
          role: "user",
          parts: [{ type: "text", text: "Apa ini?" }],
          annotations: [
            {
              type: "file_ids",
              fileIds: ["file-1"],
              fileNames: ["Analisis+Performa+Algoritma+Sistem+Skalabilitas+Produksi+Final.pdf"],
              fileSizes: [251084],
              fileTypes: ["application/pdf"],
            },
          ],
        } as never}
      />
    )

    expect(screen.getByText(".pdf")).toBeInTheDocument()
    expect(screen.getByText("245.2 KB")).toBeInTheDocument()
  })
})

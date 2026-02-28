import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChatInput } from "@/components/chat/ChatInput"
import type { AttachedFileMeta } from "@/lib/types/attached-file"

vi.mock("@/components/chat/FileUploadButton", () => ({
  FileUploadButton: () => <button type="button">mock upload</button>,
}))

const attachedDoc = {
  fileId: "file-1",
  name: "dokumen.pdf",
  size: 1024,
  type: "application/pdf",
} as AttachedFileMeta

const attachedLongNameDoc = {
  fileId: "file-2",
  name: "Analisis+Performa+Sistem+Skalabilitas+Produksi+Tahap+Akhir+Versi+Final.pdf",
  size: 1024,
  type: "application/pdf",
} as AttachedFileMeta

const baseProps = {
  onInputChange: vi.fn(),
  onSubmit: vi.fn(),
  onFileAttached: vi.fn(),
  onFileRemoved: vi.fn(),
}

describe("chat attachment send rule", () => {
  it("disables send when attachment exists but text is empty", () => {
    render(
      <ChatInput
        input=""
        isLoading={false}
        conversationId="conv-1"
        attachedFiles={[attachedDoc]}
        {...baseProps}
      />
    )

    const sendButtons = screen.getAllByRole("button", { name: "Send message" })
    expect(sendButtons.length).toBeGreaterThan(0)
    sendButtons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })

  it("enables send when attachment exists and text contains dot", () => {
    render(
      <ChatInput
        input="."
        isLoading={false}
        conversationId="conv-1"
        attachedFiles={[attachedDoc]}
        {...baseProps}
      />
    )

    const sendButtons = screen.getAllByRole("button", { name: "Send message" })
    expect(sendButtons.length).toBeGreaterThan(0)
    sendButtons.forEach((button) => {
      expect(button).toBeEnabled()
    })
  })

  it("keeps file extension and size visible for long attachment names", () => {
    render(
      <ChatInput
        input="."
        isLoading={false}
        conversationId="conv-1"
        attachedFiles={[attachedLongNameDoc]}
        {...baseProps}
      />
    )

    expect(screen.getAllByText(".pdf").length).toBeGreaterThan(0)
    expect(screen.getAllByText("1.0 KB").length).toBeGreaterThan(0)
  })
})

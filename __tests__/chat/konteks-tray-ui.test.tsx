import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChatInput } from "@/components/chat/ChatInput"
import type { AttachedFileMeta } from "@/lib/types/attached-file"

vi.mock("@/components/chat/FileUploadButton", () => ({
  FileUploadButton: () => <button type="button">mock upload</button>,
}))

describe("konteks tray ui", () => {
  it("renders Konteks section with per-file remove and Hapus semua", () => {
    const contextFiles = [
      {
        fileId: "file-1",
        name: "dokumen-satu.pdf",
        size: 1200,
        type: "application/pdf",
      },
      {
        fileId: "file-2",
        name: "dokumen-dua.docx",
        size: 2500,
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    ] as AttachedFileMeta[]

    render(
      <ChatInput
        input="halo"
        onInputChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
        conversationId="conv-1"
        attachedFiles={[]}
        contextFiles={contextFiles}
        onFileAttached={vi.fn()}
        onFileRemoved={vi.fn()}
        onClearAttachmentContext={vi.fn()}
        onContextFileRemoved={vi.fn()}
      />
    )

    expect(screen.getAllByText("mock upload").length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: "Hapus semua" }).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/Hapus file konteks/i).length).toBeGreaterThan(0)
  })
})

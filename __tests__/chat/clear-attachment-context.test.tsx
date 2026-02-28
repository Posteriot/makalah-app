import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChatInput } from "@/components/chat/ChatInput"
import type { AttachedFileMeta } from "@/lib/types/attached-file"

vi.mock("@/components/chat/FileUploadButton", () => ({
  FileUploadButton: () => <button type="button">mock upload</button>,
}))

describe("clear attachment context button", () => {
  it("shows and triggers clear action when composer has attachment", async () => {
    const user = userEvent.setup()
    const onClearAttachmentContext = vi.fn()

    const attachedDoc = {
      fileId: "file-1",
      name: "dokumen.pdf",
      size: 1024,
      type: "application/pdf",
    } as AttachedFileMeta

    render(
      <ChatInput
        input="teks"
        onInputChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
        conversationId="conv-1"
        attachedFiles={[attachedDoc]}
        onFileAttached={vi.fn()}
        onFileRemoved={vi.fn()}
        onClearAttachmentContext={onClearAttachmentContext}
      />
    )

    const clearButtons = screen.getAllByRole("button", { name: "Hapus semua" })
    expect(clearButtons.length).toBeGreaterThan(0)

    await user.click(clearButtons[0])
    expect(onClearAttachmentContext).toHaveBeenCalledTimes(1)
  })

  it("shows clear button when active context exists even if draft composer is empty", () => {
    render(
      <ChatInput
        input="teks"
        onInputChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
        conversationId="conv-1"
        attachedFiles={[]}
        onFileAttached={vi.fn()}
        onFileRemoved={vi.fn()}
        onClearAttachmentContext={vi.fn()}
        hasActiveAttachmentContext
      />
    )

    const clearButtons = screen.getAllByRole("button", { name: "Hapus semua" })
    expect(clearButtons.length).toBeGreaterThan(0)
  })
})

import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ChatInput } from "@/components/chat/ChatInput"
import type { AttachedFileMeta } from "@/lib/types/attached-file"

vi.mock("@/components/chat/FileUploadButton", () => ({
  FileUploadButton: ({ label }: { label?: string }) => (
    <button type="button">{label ?? "mock upload"}</button>
  ),
}))

const baseProps = {
  onInputChange: vi.fn(),
  onSubmit: vi.fn(),
  onFileAttached: vi.fn(),
  onFileRemoved: vi.fn(),
}

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

describe("chat input desktop layout", () => {
  it("menampilkan textarea desktop satu baris saat kosong", () => {
    render(
      <ChatInput
        input=""
        isLoading={false}
        conversationId="conv-1"
        attachedFiles={[]}
        {...baseProps}
      />
    )

    const textarea = screen.getByTestId("desktop-chat-input-textarea")
    expect(textarea).toHaveAttribute("rows", "1")
    expect(textarea.className).not.toContain("min-h-[72px]")
  })

  it("menampilkan strip konteks desktop tetap terlihat meski belum ada konteks aktif", () => {
    render(
      <ChatInput
        input=""
        isLoading={false}
        conversationId="conv-1"
        attachedFiles={[]}
        {...baseProps}
      />
    )

    const strip = screen.getByTestId("desktop-context-strip")
    expect(strip).toBeInTheDocument()
    expect(screen.getByTestId("desktop-context-separator")).toBeInTheDocument()
    expect(within(strip).getByText("+ Konteks")).toBeInTheDocument()
  })

  it("menampilkan konteks desktop sebagai strip horizontal, bukan tray blok besar", () => {
    render(
      <ChatInput
        input="halo"
        isLoading={false}
        conversationId="conv-1"
        attachedFiles={[]}
        contextFiles={contextFiles}
        onClearAttachmentContext={vi.fn()}
        onContextFileRemoved={vi.fn()}
        {...baseProps}
      />
    )

    const scrollStrip = screen.getByTestId("desktop-context-scroll")
    expect(scrollStrip.className).toContain("overflow-x-auto")
    expect(scrollStrip.className).toContain("whitespace-nowrap")
  })

  it("menjaga tombol kirim desktop tetap inline pada baris input", () => {
    render(
      <ChatInput
        input="isi"
        isLoading={false}
        conversationId="conv-1"
        attachedFiles={[]}
        {...baseProps}
      />
    )

    expect(screen.getByTestId("desktop-input-row")).toContainElement(
      screen.getAllByRole("button", { name: "Send message" })[0]
    )
  })

  it("tumbuh otomatis pada textarea desktop saat mengetik", () => {
    const { rerender } = render(
      <ChatInput
        input=""
        isLoading={false}
        conversationId="conv-1"
        attachedFiles={[]}
        {...baseProps}
      />
    )

    const initialTextarea = screen.getByTestId("desktop-chat-input-textarea")
    const initialClassName = initialTextarea.className

    rerender(
      <ChatInput
        input={"baris satu\nbaris dua\nbaris tiga"}
        isLoading={false}
        conversationId="conv-1"
        attachedFiles={[]}
        {...baseProps}
      />
    )

    const grownTextarea = screen.getByTestId("desktop-chat-input-textarea")
    expect(grownTextarea.className).toContain("max-h-[120px]")
    expect(initialClassName).not.toBe("")
  })
})

import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ChatInput } from "./ChatInput"

vi.mock("./FileUploadButton", () => ({
  FileUploadButton: ({ label }: { label: string }) => (
    <button type="button">{label}</button>
  ),
}))

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const baseProps = {
  input: "",
  onInputChange: vi.fn(),
  onSubmit: vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault()),
  isLoading: false,
  conversationId: "conversation-1",
  attachedFiles: [],
  onFileAttached: vi.fn(),
  onFileRemoved: vi.fn(),
}

describe("ChatInput mobile layout", () => {
  it("menjaga state diam tetap compact satu baris tanpa tombol hapus", () => {
    render(
        <ChatInput
            {...baseProps}
            contextFiles={[]}
            onClearAttachmentContext={vi.fn()}
            hasActiveAttachmentContext={false}
        />
    )

    const mobileShell = screen.getByTestId("mobile-chat-input-shell")
    expect(screen.getByTestId("mobile-chat-input-compact")).toBeInTheDocument()
    expect(screen.queryByTestId("mobile-chat-input-stacked")).not.toBeInTheDocument()
    expect(within(mobileShell).queryByRole("button", { name: /hapus semua/i })).not.toBeInTheDocument()
  })

  it("beralih ke layout dua baris saat konteks aktif dan menampilkan tombol hapus", () => {
    render(
        <ChatInput
            {...baseProps}
        contextFiles={[
          {
            fileId: "file-1" as never,
            name: "outline.pdf",
            size: 1024,
            type: "application/pdf",
          },
        ]}
        onClearAttachmentContext={vi.fn()}
        hasActiveAttachmentContext={true}
        />
    )

    const mobileShell = screen.getByTestId("mobile-chat-input-shell")
    expect(screen.getByTestId("mobile-chat-input-stacked")).toBeInTheDocument()
    expect(screen.queryByTestId("mobile-chat-input-compact")).not.toBeInTheDocument()
    expect(within(mobileShell).getByRole("button", { name: /hapus semua/i })).toBeInTheDocument()
  })
})

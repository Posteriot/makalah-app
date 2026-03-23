import { act, render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi, afterEach } from "vitest"
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

afterEach(() => {
  vi.restoreAllMocks()
})

describe("ChatInput mobile layout", () => {
  it("selalu menampilkan composer mobile dua baris dengan tray konteks terpisah", () => {
    render(
        <ChatInput
            {...baseProps}
            contextFiles={[]}
            onClearAttachmentContext={vi.fn()}
            hasActiveAttachmentContext={false}
        />
    )

    const mobileShell = screen.getByTestId("mobile-chat-input-shell")
    expect(within(mobileShell).getByTestId("mobile-chat-input-stacked")).toBeInTheDocument()
    expect(within(mobileShell).queryByTestId("mobile-chat-input-compact")).not.toBeInTheDocument()
    expect(within(mobileShell).getByRole("button", { name: /\+ konteks/i })).toBeInTheDocument()
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

  it("menjaga instance textarea dan fokus saat composer melebar ke multiline", () => {
    let scrollHeight = 32
    vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockImplementation(() => scrollHeight)

    const { rerender } = render(
      <ChatInput
        {...baseProps}
        input="Baris pertama"
        contextFiles={[]}
        onClearAttachmentContext={vi.fn()}
        hasActiveAttachmentContext={false}
      />
    )

    const mobileShell = screen.getByTestId("mobile-chat-input-shell")
    const textareaBefore = within(mobileShell).getByLabelText("Message input")
    act(() => {
      textareaBefore.focus()
    })
    expect(document.activeElement).toBe(textareaBefore)
    expect(within(mobileShell).getByTestId("mobile-chat-input-stacked")).toBeInTheDocument()

    scrollHeight = 72

    act(() => {
      rerender(
        <ChatInput
          {...baseProps}
          input={"Baris pertama\nBaris kedua"}
          contextFiles={[]}
          onClearAttachmentContext={vi.fn()}
          hasActiveAttachmentContext={false}
        />
      )
    })

    const textareaAfter = within(mobileShell).getByLabelText("Message input")
    expect(within(mobileShell).getByTestId("mobile-chat-input-stacked")).toBeInTheDocument()
    expect(textareaAfter).toBe(textareaBefore)
    expect(document.activeElement).toBe(textareaAfter)
  })

  it("tidak bolak-balik collapse saat stacked membuat textarea sedikit lebih pendek", async () => {
    let mobileMeasureCount = 0
    vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLTextAreaElement) {
      if (this.dataset.testid === "desktop-chat-input-textarea") {
        return 32
      }

      mobileMeasureCount += 1
      return mobileMeasureCount === 1 ? 72 : 40
    })

    const { rerender } = render(
      <ChatInput
        {...baseProps}
        input={"Baris pertama\nBaris kedua"}
        contextFiles={[]}
        onClearAttachmentContext={vi.fn()}
        hasActiveAttachmentContext={false}
      />
    )

    const mobileShell = screen.getByTestId("mobile-chat-input-shell")
    await waitFor(() => {
      expect(within(mobileShell).getByTestId("mobile-chat-input-stacked")).toBeInTheDocument()
    })

    act(() => {
      rerender(
        <ChatInput
          {...baseProps}
          input={"Baris pertama\nBaris kedua!"}
          contextFiles={[]}
          onClearAttachmentContext={vi.fn()}
          hasActiveAttachmentContext={false}
        />
      )
    })

    await waitFor(() => {
      expect(within(mobileShell).getByTestId("mobile-chat-input-stacked")).toBeInTheDocument()
      expect(within(mobileShell).queryByTestId("mobile-chat-input-compact")).not.toBeInTheDocument()
    })
  })

  it("tetap dua baris stabil meski textarea masih satu line", () => {
    vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLTextAreaElement) {
      if (this.dataset.testid === "desktop-chat-input-textarea") {
        return 32
      }

      return 32
    })

    render(
      <ChatInput
        {...baseProps}
        input="Pendek"
        contextFiles={[]}
        onClearAttachmentContext={vi.fn()}
        hasActiveAttachmentContext={false}
      />
    )

    const mobileShell = screen.getByTestId("mobile-chat-input-shell")
    expect(within(mobileShell).getByTestId("mobile-chat-input-stacked")).toBeInTheDocument()
    expect(within(mobileShell).queryByTestId("mobile-chat-input-compact")).not.toBeInTheDocument()
  })

  it("merapatkan jarak bawah dan tinggi row input mobile", () => {
    render(
      <ChatInput
        {...baseProps}
        input="Pendek"
        contextFiles={[]}
        onClearAttachmentContext={vi.fn()}
        hasActiveAttachmentContext={false}
      />
    )

    const mobileWrapper = screen.getByTestId("mobile-chat-input-wrapper")
    const mobileInputRow = screen.getByTestId("mobile-chat-input-row")
    const mobileTextarea = within(screen.getByTestId("mobile-chat-input-shell")).getByLabelText("Message input")

    expect(mobileWrapper.className).toContain("pb-[max(0.375rem,env(safe-area-inset-bottom))]")
    expect(mobileInputRow.className).toContain("min-h-[40px]")
    expect(mobileTextarea.className).toContain("min-h-[28px]")
  })
})

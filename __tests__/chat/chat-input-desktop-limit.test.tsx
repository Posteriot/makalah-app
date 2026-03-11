import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ChatInput } from "@/components/chat/ChatInput"

vi.mock("@/components/chat/FileUploadButton", () => ({
  FileUploadButton: ({ label }: { label?: string }) => (
    <button type="button">{label ?? "mock upload"}</button>
  ),
}))

describe("chat input desktop limit", () => {
  it("tidak menerima input di atas 8000 karakter", async () => {
    const handleChange = vi.fn()

    render(
      <ChatInput
        input=""
        onInputChange={handleChange}
        onSubmit={vi.fn()}
        isLoading={false}
        conversationId="conv-1"
        attachedFiles={[]}
        onFileAttached={vi.fn()}
        onFileRemoved={vi.fn()}
      />
    )

    const textarea = screen.getByTestId("desktop-chat-input-textarea")
    fireEvent.change(textarea, {
      target: {
        value: "a".repeat(8001),
      },
    })

    expect(handleChange).toHaveBeenCalled()
    const lastCall = handleChange.mock.calls.at(-1)?.[0]
    expect(lastCall.target.value.length).toBeLessThanOrEqual(8000)
  })

  it("tidak menampilkan counter karakter permanen", () => {
    render(
      <ChatInput
        input=""
        onInputChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
        conversationId="conv-1"
        attachedFiles={[]}
        onFileAttached={vi.fn()}
        onFileRemoved={vi.fn()}
      />
    )

    expect(screen.queryByText(/8000/i)).not.toBeInTheDocument()
  })
})

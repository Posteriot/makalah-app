import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MessageBubble } from "@/components/chat/MessageBubble"

describe("attachment resend contract", () => {
  it("should pass attachment metadata when user edits and resends message", async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()

    render(
      <MessageBubble
        message={{
          id: "msg-1",
          role: "user",
          parts: [{ type: "text", text: "Konten awal" }],
          annotations: [
            {
              type: "file_ids",
              fileIds: ["file-1"],
              fileNames: ["dokumen.pdf"],
            },
          ],
        } as never}
        onEdit={onEdit}
      />
    )

    await user.click(screen.getByRole("button", { name: "Edit message" }))

    const editor = screen.getByLabelText("Edit message content")
    await user.clear(editor)
    await user.type(editor, "Konten revisi")

    await user.click(screen.getByRole("button", { name: "Kirim pesan yang diedit" }))

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith({
      messageId: "msg-1",
      newContent: "Konten revisi",
      fileIds: ["file-1"],
      fileNames: ["dokumen.pdf"],
    })
  })
})

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MessageBubble } from "@/components/chat/MessageBubble"

describe("attachment resend contract", () => {
  it("keeps explicit attachment payload when user edits and resends message", async () => {
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
              fileSizes: [1024],
              fileTypes: ["application/pdf"],
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
      attachmentMode: "explicit",
      fileIds: ["file-1"],
      fileNames: ["dokumen.pdf"],
      fileSizes: [1024],
      fileTypes: ["application/pdf"],
    })
  })

  it("keeps inherit resend non-explicit (without file payload)", async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()

    render(
      <MessageBubble
        message={{
          id: "msg-2",
          role: "user",
          attachmentMode: "inherit",
          fileIds: ["file-ctx-1"],
          parts: [{ type: "text", text: "Follow-up dari konteks" }],
        } as never}
        onEdit={onEdit}
      />
    )

    await user.click(screen.getByRole("button", { name: "Edit message" }))
    await user.click(screen.getByRole("button", { name: "Kirim pesan yang diedit" }))

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith({
      messageId: "msg-2",
      newContent: "Follow-up dari konteks",
      attachmentMode: "inherit",
      fileIds: [],
      fileNames: [],
      fileSizes: [],
      fileTypes: [],
    })
  })
})

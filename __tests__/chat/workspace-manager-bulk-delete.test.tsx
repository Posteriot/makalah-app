import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ConversationManagerTable } from "@/components/chat/workspace-manager/ConversationManagerTable"

function buildConversation(id: string, title: string) {
  return {
    _id: id as never,
    title,
    lastMessageAt: Date.now(),
  }
}

describe("workspace manager bulk delete", () => {
  it("membuka dialog bulk delete dan meneruskan ids yang dipilih", async () => {
    const onDeleteSelected = vi.fn()
    const user = userEvent.setup()

    render(
      <ConversationManagerTable
        items={[
          buildConversation("conv-1", "Chat 1"),
          buildConversation("conv-2", "Chat 2"),
        ]}
        totalCount={2}
        page={1}
        pageSize={10}
        isLoading={false}
        onPageChange={vi.fn()}
        onDeleteSelected={onDeleteSelected}
      />
    )

    await user.click(screen.getByLabelText("Pilih percakapan Chat 1"))
    await user.click(screen.getByRole("button", { name: /hapus pilihan/i }))

    expect(screen.getByText(/1 percakapan terpilih/i)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Ya, hapus pilihan" }))

    await waitFor(() => {
      expect(onDeleteSelected).toHaveBeenCalledWith(["conv-1"])
    })
  })
})

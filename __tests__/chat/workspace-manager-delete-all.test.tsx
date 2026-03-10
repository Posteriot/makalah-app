import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ConversationManagerTable } from "@/components/chat/workspace-manager/ConversationManagerTable"

describe("workspace manager delete all", () => {
  it("disable tombol hapus semua saat total nol", () => {
    render(
      <ConversationManagerTable
        items={[]}
        totalCount={0}
        page={1}
        pageSize={10}
        isLoading={false}
        onPageChange={vi.fn()}
      />
    )

    expect(screen.getByRole("button", { name: /hapus semua/i })).toBeDisabled()
  })

  it("mewajibkan ketik HAPUS sebelum menghapus semua conversation", async () => {
    const onDeleteAll = vi.fn()
    const user = userEvent.setup()

    render(
      <ConversationManagerTable
        items={[]}
        totalCount={18}
        page={1}
        pageSize={10}
        isLoading={false}
        onPageChange={vi.fn()}
        onDeleteAll={onDeleteAll}
      />
    )

    await user.click(screen.getByRole("button", { name: /hapus semua/i }))

    const confirmButton = screen.getByRole("button", { name: "Hapus semua sekarang" })
    expect(confirmButton).toBeDisabled()

    await user.type(screen.getByLabelText("Ketik HAPUS untuk melanjutkan"), "HAPUS")

    expect(confirmButton).not.toBeDisabled()
    await user.click(confirmButton)

    await waitFor(() => {
      expect(onDeleteAll).toHaveBeenCalledTimes(1)
    })
  })
})

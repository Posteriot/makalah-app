import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ConversationManagerTable } from "@/components/chat/workspace-manager/ConversationManagerTable"

function buildConversation(id: string, title: string) {
  return {
    _id: id as never,
    title,
    lastMessageAt: Date.now(),
  }
}

describe("workspace manager conversations", () => {
  it("menampilkan list hasil paginasi dan footer halaman", () => {
    render(
      <ConversationManagerTable
        items={[
          buildConversation("conv-1", "Chat 1"),
          buildConversation("conv-2", "Chat 2"),
        ]}
        totalCount={23}
        page={1}
        pageSize={10}
        isLoading={false}
        onPageChange={vi.fn()}
        onDeleteSingle={vi.fn()}
      />
    )

    expect(screen.getByText("Chat 1")).toBeInTheDocument()
    expect(screen.getByText("Chat 2")).toBeInTheDocument()
    expect(screen.getByText("Menampilkan 1-10 dari 23")).toBeInTheDocument()
  })

  it("memakai checkbox utama untuk memilih semua item pada halaman aktif", () => {
    render(
      <ConversationManagerTable
        items={[
          buildConversation("conv-1", "Chat 1"),
          buildConversation("conv-2", "Chat 2"),
        ]}
        totalCount={23}
        page={1}
        pageSize={10}
        isLoading={false}
        onPageChange={vi.fn()}
        onDeleteSingle={vi.fn()}
      />
    )

    fireEvent.click(screen.getByLabelText("Pilih semua percakapan di halaman aktif"))

    expect(screen.getByLabelText("Pilih percakapan Chat 1")).toBeChecked()
    expect(screen.getByLabelText("Pilih percakapan Chat 2")).toBeChecked()
    expect(screen.getByRole("button", { name: /hapus pilihan/i })).not.toBeDisabled()
  })

  it("reset selection saat pindah ke halaman aktif lain", () => {
    const onPageChange = vi.fn()
    const { rerender } = render(
      <ConversationManagerTable
        items={[
          buildConversation("conv-1", "Chat 1"),
          buildConversation("conv-2", "Chat 2"),
        ]}
        totalCount={23}
        page={1}
        pageSize={10}
        isLoading={false}
        onPageChange={onPageChange}
        onDeleteSingle={vi.fn()}
      />
    )

    fireEvent.click(screen.getByLabelText("Pilih percakapan Chat 1"))
    expect(
      screen.getByRole("button", { name: /hapus pilihan/i })
    ).not.toBeDisabled()

    rerender(
      <ConversationManagerTable
        items={[
          buildConversation("conv-11", "Chat 11"),
          buildConversation("conv-12", "Chat 12"),
        ]}
        totalCount={23}
        page={2}
        pageSize={10}
        isLoading={false}
        onPageChange={onPageChange}
        onDeleteSingle={vi.fn()}
      />
    )

    expect(screen.getByRole("button", { name: /hapus pilihan/i })).toBeDisabled()
    expect(screen.getByText("Menampilkan 11-20 dari 23")).toBeInTheDocument()
  })
})

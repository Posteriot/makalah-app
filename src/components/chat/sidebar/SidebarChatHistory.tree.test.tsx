"use client"

import type { ComponentProps, ReactNode } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SidebarChatHistory } from "./SidebarChatHistory"

const mockUseQuery = vi.fn()
const mockUseCurrentUser = vi.fn()

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: (...args: unknown[]) => mockUseCurrentUser(...args),
}))

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string
    children: ReactNode
    onClick?: () => void
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}))

describe("SidebarChatHistory tree", () => {
  const conversations = [
    {
      _id: "conversation-active",
      title: "Percakapan aktif",
      lastMessageAt: Date.now(),
    },
    {
      _id: "conversation-empty",
      title: "Percakapan biasa",
      lastMessageAt: Date.now() - 1_000,
    },
    {
      _id: "conversation-other",
      title: "Percakapan paper lain",
      lastMessageAt: Date.now() - 2_000,
    },
  ]

  beforeEach(() => {
    window.localStorage.clear()

    mockUseCurrentUser.mockReturnValue({
      user: { _id: "user-1" },
    })

    let conversationScopedQueryCount = 0
    mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (args === "skip") return undefined

      if (typeof args === "object" && args !== null && "conversationIds" in args) {
        conversationScopedQueryCount += 1
        if (conversationScopedQueryCount === 1) {
          return [
            {
              _id: "session-active",
              conversationId: "conversation-active",
              currentStage: "topik",
            },
            {
              _id: "session-other",
              conversationId: "conversation-other",
              currentStage: "outline",
            },
          ]
        }

        return [
          {
            _id: "artifact-old",
            title: "Pendahuluan",
            type: "section",
            version: 1,
            conversationId: "conversation-active",
            createdAt: 1,
          },
          {
            _id: "artifact-new",
            title: "Pendahuluan",
            type: "section",
            version: 2,
            conversationId: "conversation-active",
            createdAt: 2,
            messageId: "message-1",
          },
          {
            _id: "refrasa-active",
            title: "Refrasa Pendahuluan",
            type: "refrasa",
            version: 1,
            sourceArtifactId: "artifact-new",
            conversationId: "conversation-active",
            createdAt: 3,
          },
          {
            _id: "artifact-other",
            title: "Outline Awal",
            type: "section",
            version: 1,
            conversationId: "conversation-other",
            createdAt: 4,
            messageId: "message-2",
          },
        ]
      }

      return undefined
    })
  })

  function renderSidebar(
    overrides: Partial<ComponentProps<typeof SidebarChatHistory>> = {}
  ) {
    return render(
      <SidebarChatHistory
        conversations={conversations as never}
        totalConversationCount={3}
        currentConversationId="conversation-active"
        onDeleteConversation={vi.fn()}
        onDeleteConversations={vi.fn()}
        onDeleteAllConversations={vi.fn()}
        {...overrides}
      />
    )
  }

  it("meminta data paper hanya untuk conversation yang sedang tampil", () => {
    renderSidebar()

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user-1",
        conversationIds: ["conversation-active", "conversation-empty", "conversation-other"],
      })
    )
  })
  it("auto-expand percakapan aktif dan hanya menampilkan latest file", () => {
    renderSidebar()

    expect(screen.getByText("Pendahuluan")).toBeInTheDocument()
    expect(screen.getByText("Refrasa Pendahuluan")).toBeInTheDocument()
    expect(screen.getAllByText("Pendahuluan")).toHaveLength(1)
    expect(screen.queryByText("Outline Awal")).not.toBeInTheDocument()
  })

  it("expand manual pada percakapan lain menutup subtree sebelumnya", () => {
    renderSidebar()

    fireEvent.click(screen.getByRole("button", { name: /buka subtree percakapan/i }))

    expect(screen.getByText("Outline Awal")).toBeInTheDocument()
    expect(screen.queryByText("Refrasa Pendahuluan")).not.toBeInTheDocument()
  })

  it("membuka child file nonaktif sebagai read-only artifact", () => {
    const onArtifactSelect = vi.fn()

    renderSidebar({
      onArtifactSelect,
    })

    fireEvent.click(screen.getByRole("button", { name: /buka subtree percakapan/i }))
    fireEvent.click(screen.getByText("Outline Awal").closest("button") as HTMLButtonElement)

    expect(onArtifactSelect).toHaveBeenCalledWith("artifact-other", {
      title: "Outline Awal",
      type: "section",
      readOnly: true,
      sourceConversationId: "conversation-other",
      sourceMessageId: "message-2",
      sourceKind: "artifact",
      origin: "chat",
    })
  })

  it("mode kelola mendukung hapus satu percakapan", async () => {
    const onDeleteConversation = vi.fn()

    renderSidebar({
      onDeleteConversation,
      manageRequestNonce: 1,
    })

    fireEvent.click(screen.getByRole("checkbox", { name: /pilih percakapan percakapan aktif/i }))
    fireEvent.click(screen.getByRole("button", { name: /hapus percakapan yang dipilih/i }))
    fireEvent.click(screen.getAllByRole("button", { name: /^hapus$/i }).at(-1) as HTMLButtonElement)

    await waitFor(() => {
      expect(onDeleteConversation).toHaveBeenCalledWith("conversation-active")
    })
  })

  it("checkbox utama memicu hapus semua percakapan", async () => {
    const onDeleteAllConversations = vi.fn()
    const onDeleteConversations = vi.fn()

    renderSidebar({
      totalConversationCount: 100,
      onDeleteConversations,
      onDeleteAllConversations,
      manageRequestNonce: 1,
    })

    fireEvent.click(screen.getByRole("checkbox", { name: /pilih semua percakapan/i }))
    fireEvent.click(screen.getByRole("button", { name: /hapus percakapan yang dipilih/i }))
    fireEvent.click(screen.getAllByRole("button", { name: /^hapus$/i }).at(-1) as HTMLButtonElement)

    await waitFor(() => {
      expect(onDeleteAllConversations).toHaveBeenCalledTimes(1)
      expect(onDeleteConversations).not.toHaveBeenCalled()
    })
  })

  it("menghormati collapse manual setelah remount", () => {
    const firstRender = renderSidebar()

    fireEvent.click(screen.getByRole("button", { name: /tutup subtree percakapan/i }))
    expect(screen.queryByText("Pendahuluan")).not.toBeInTheDocument()

    firstRender.unmount()

    renderSidebar()

    expect(screen.queryByText("Pendahuluan")).not.toBeInTheDocument()
  })
})

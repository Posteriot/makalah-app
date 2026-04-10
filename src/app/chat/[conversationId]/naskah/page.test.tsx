import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import NaskahConversationPage from "./page"

const mockUseQuery = vi.fn()
const mockUseCurrentUser = vi.fn()
const mockUsePaperSession = vi.fn()
const mockUseNaskah = vi.fn()

vi.mock("next/navigation", () => ({
  useParams: () => ({
    conversationId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  }),
}))

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock("@/components/chat/layout/ChatLayout", () => ({
  ChatLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chat-layout">{children}</div>
  ),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}))

vi.mock("@/lib/hooks/usePaperSession", () => ({
  usePaperSession: (...args: unknown[]) => mockUsePaperSession(...args),
}))

vi.mock("@/lib/hooks/useNaskah", () => ({
  useNaskah: (...args: unknown[]) => mockUseNaskah(...args),
}))

describe("naskah conversation page", () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
    mockUseCurrentUser.mockReset()
    mockUsePaperSession.mockReset()
    mockUseNaskah.mockReset()

    mockUseCurrentUser.mockReturnValue({
      user: { _id: "users_1" },
    })
    mockUsePaperSession.mockReturnValue({
      session: {
        _id: "paperSessions_1",
        paperTitle: "Judul Final Paper",
        workingTitle: "Judul Kerja",
      },
      isLoading: false,
    })
    mockUseNaskah.mockReturnValue({
      availability: {
        isAvailable: true,
      },
      latestSnapshot: {
        revision: 4,
        isAvailable: true,
        title: "Judul Final Paper",
        titleSource: "paper_title",
        sections: [
          {
            key: "abstrak",
            label: "Abstrak",
            content: "Isi abstrak terbaru",
            sourceStage: "abstrak",
          },
        ],
        pageEstimate: 1,
        status: "growing",
        sourceArtifactRefs: [],
      },
      updatePending: false,
      markViewed: vi.fn(),
      isLoading: false,
    })
    mockUseQuery.mockReturnValue([])
  })

  it("membuka halaman dan merender snapshot terbaru yang tersedia", () => {
    render(<NaskahConversationPage />)

    expect(
      screen.getByRole("heading", { name: "Judul Final Paper" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Isi abstrak terbaru")).toBeInTheDocument()
  })

  it("tidak menampilkan affordance export aktif di fase 1", () => {
    render(<NaskahConversationPage />)

    expect(
      screen.queryByRole("button", { name: /export/i }),
    ).not.toBeInTheDocument()
  })
})

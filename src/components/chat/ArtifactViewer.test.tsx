import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ArtifactViewer } from "./ArtifactViewer"

const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()
const mockUseCurrentUser = vi.fn()

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}))

vi.mock("@/lib/hooks/useRefrasa", () => ({
  useRefrasa: () => ({
    isLoading: false,
    error: null,
    analyzeAndRefrasa: vi.fn(),
    reset: vi.fn(),
  }),
}))

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("ArtifactViewer", () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
    mockUseMutation.mockReset()
    mockUseCurrentUser.mockReturnValue({
      user: { _id: "user-1" },
      isLoading: false,
    })
    mockUseMutation.mockReturnValue(vi.fn())
  })

  it("membentuk link percakapan terkait dengan sourceMessage bila tersedia", () => {
    let callCount = 0
    mockUseQuery.mockImplementation(() => {
      callCount += 1
      if (callCount === 1) return true
      if (callCount === 2) {
        return {
          _id: "artifact-1",
          title: "Pendahuluan",
          type: "section",
          version: 1,
          content: "Isi artifact",
          conversationId: "conversation-1",
          createdAt: 1,
        }
      }
      if (callCount === 3) return []
      if (callCount === 4) return { _id: "conversation-1", title: "Percakapan sumber" }
      return undefined
    })

    render(
      <ArtifactViewer
        artifactId={"artifact-1" as never}
        readOnly={true}
        sourceConversationId={"conversation-1" as never}
        sourceMessageId={"message-9" as never}
      />
    )

    expect(screen.getByRole("link", { name: /lihat percakapan terkait/i })).toHaveAttribute(
      "href",
      "/chat/conversation-1?artifact=artifact-1&sourceMessage=message-9"
    )
  })

  it("menampilkan status pasif untuk artifact orphan tanpa link aktif", () => {
    let callCount = 0
    mockUseQuery.mockImplementation(() => {
      callCount += 1
      if (callCount === 1) return true
      if (callCount === 2) {
        return {
          _id: "artifact-orphan",
          title: "Gagasan Paper",
          type: "refrasa",
          version: 1,
          content: "Isi artifact",
          conversationId: "conversation-missing",
          createdAt: 1,
        }
      }
      if (callCount === 3) return []
      if (callCount === 4) return null
      return undefined
    })

    render(
      <ArtifactViewer
        artifactId={"artifact-orphan" as never}
        readOnly={true}
        sourceConversationId={"conversation-missing" as never}
      />
    )

    expect(screen.getByText(/percakapan tidak ditemukan/i)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /lihat percakapan terkait/i })).not.toBeInTheDocument()
  })
})

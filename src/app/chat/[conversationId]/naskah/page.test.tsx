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

function makeSnapshotRecord(args: {
  revision: number
  title: string
  abstrakContent: string
  isAvailable?: boolean
  reasonIfUnavailable?: "empty_session" | "no_validated_abstrak" | "abstrak_guard_failed"
}) {
  return {
    revision: args.revision,
    isAvailable: args.isAvailable ?? true,
    reasonIfUnavailable: args.reasonIfUnavailable,
    title: args.title,
    titleSource: "paper_title" as const,
    sections: args.isAvailable === false
      ? []
      : [
          {
            key: "abstrak" as const,
            label: "Abstrak" as const,
            content: args.abstrakContent,
            sourceStage: "abstrak" as const,
          },
        ],
    pageEstimate: 1,
    status: "growing" as const,
    sourceArtifactRefs: [],
  }
}

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
    // Default fixture: steady state. User has already viewed the latest
    // revision, so viewedSnapshot === latestSnapshot and updatePending is
    // false. Individual tests override this to simulate first visit,
    // pending update, or unavailable state.
    mockUseNaskah.mockReturnValue({
      availability: {
        isAvailable: true,
      },
      latestSnapshot: makeSnapshotRecord({
        revision: 4,
        title: "Judul Final Paper",
        abstrakContent: "Isi abstrak revisi 4",
      }),
      viewedSnapshot: makeSnapshotRecord({
        revision: 4,
        title: "Judul Final Paper",
        abstrakContent: "Isi abstrak revisi 4",
      }),
      viewState: {
        _id: "view_1",
        lastViewedRevision: 4,
        viewedAt: 100,
      },
      updatePending: false,
      markViewed: vi.fn(),
      isLoading: false,
    })
    mockUseQuery.mockReturnValue([])
  })

  it("membuka halaman dan merender viewed snapshot saat steady state", () => {
    render(<NaskahConversationPage />)

    expect(
      screen.getByRole("heading", { name: "Judul Final Paper" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Isi abstrak revisi 4")).toBeInTheDocument()
  })

  it("D-018: masuk dari Chat dengan pending update menampilkan viewed revision, bukan latest", () => {
    // User last viewed revision 3; compiler produced revision 4.
    // Route MUST show revision 3 content. Banner shows. User clicking
    // Update acknowledges the pending state manually.
    mockUseNaskah.mockReturnValue({
      availability: { isAvailable: true },
      latestSnapshot: makeSnapshotRecord({
        revision: 4,
        title: "Judul Revisi 4",
        abstrakContent: "Isi abstrak revisi 4",
      }),
      viewedSnapshot: makeSnapshotRecord({
        revision: 3,
        title: "Judul Revisi 3",
        abstrakContent: "Isi abstrak revisi 3",
      }),
      viewState: {
        _id: "view_1",
        lastViewedRevision: 3,
        viewedAt: 100,
      },
      updatePending: true,
      markViewed: vi.fn(),
      isLoading: false,
    })

    render(<NaskahConversationPage />)

    // Viewed content (revision 3) must be visible.
    expect(
      screen.getByRole("heading", { name: "Judul Revisi 3" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Isi abstrak revisi 3")).toBeInTheDocument()

    // Latest content (revision 4) must NOT be visible yet.
    expect(
      screen.queryByRole("heading", { name: "Judul Revisi 4" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Isi abstrak revisi 4")).not.toBeInTheDocument()

    // The in-page Update button must be visible (pending banner).
    expect(
      screen.getByRole("button", { name: /update/i }),
    ).toBeInTheDocument()
  })

  it("first-visit: render latest dan firing markViewed sebagai bootstrap, banner ditekan", () => {
    // User has never visited Naskah for this session. viewState is null.
    // The route must render latestSnapshot (there's no prior revision
    // to fall back to) AND fire markViewed as a bootstrap side effect.
    // The banner must NOT appear during this first-visit frame — the
    // user is not "catching up" to pending content, they are seeing it
    // for the first time.
    const markViewedMock = vi.fn().mockResolvedValue(undefined)
    mockUseNaskah.mockReturnValue({
      availability: { isAvailable: true },
      latestSnapshot: makeSnapshotRecord({
        revision: 5,
        title: "Judul Awal",
        abstrakContent: "Isi abstrak awal",
      }),
      viewedSnapshot: undefined,
      viewState: null,
      updatePending: true,
      markViewed: markViewedMock,
      isLoading: false,
    })

    render(<NaskahConversationPage />)

    // Latest content is visible (first visit fallback).
    expect(
      screen.getByRole("heading", { name: "Judul Awal" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Isi abstrak awal")).toBeInTheDocument()

    // Banner is suppressed on first visit even though raw updatePending=true.
    expect(
      screen.queryByRole("button", { name: /update/i }),
    ).not.toBeInTheDocument()

    // Bootstrap markViewed must have been fired.
    expect(markViewedMock).toHaveBeenCalled()
  })

  it("unavailable state: menampilkan pesan belum ada section saat availability false", () => {
    mockUseNaskah.mockReturnValue({
      availability: {
        isAvailable: false,
        reasonIfUnavailable: "no_validated_abstrak",
      },
      latestSnapshot: makeSnapshotRecord({
        revision: 1,
        title: "Paper Tanpa Judul",
        abstrakContent: "",
        isAvailable: false,
        reasonIfUnavailable: "no_validated_abstrak",
      }),
      viewedSnapshot: makeSnapshotRecord({
        revision: 1,
        title: "Paper Tanpa Judul",
        abstrakContent: "",
        isAvailable: false,
        reasonIfUnavailable: "no_validated_abstrak",
      }),
      viewState: {
        _id: "view_1",
        lastViewedRevision: 1,
        viewedAt: 100,
      },
      updatePending: false,
      markViewed: vi.fn(),
      isLoading: false,
    })

    render(<NaskahConversationPage />)

    // Inline unavailable state — NOT a redirect away from the route.
    expect(
      screen.getByText(/belum ada section/i),
    ).toBeInTheDocument()
    // No abstrak heading in the body.
    expect(
      screen.queryByRole("heading", { name: "Abstrak" }),
    ).not.toBeInTheDocument()
  })

  it("tidak menampilkan affordance export aktif di fase 1", () => {
    render(<NaskahConversationPage />)

    expect(
      screen.queryByRole("button", { name: /export/i }),
    ).not.toBeInTheDocument()
  })
})

import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import NaskahConversationPage from "./page"

/**
 * Scope helper for pagination-aware content assertions.
 *
 * `PaginatedSection` renders each block twice — once in a hidden
 * measurement scratch container and once in a visible `PageContainer`.
 * Unscoped `screen.getByText(...)` on body text would match both copies
 * and throw "multiple elements found." This helper returns the visible
 * first-page element for a section so queries can be scoped.
 */
function getVisibleSectionPage(sectionKey: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(
    `[data-testid="naskah-section-${sectionKey}"]`,
  )
  if (!el) {
    throw new Error(
      `No visible first page found for section "${sectionKey}".`,
    )
  }
  return el
}

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

vi.mock("@/components/naskah/NaskahShell", () => ({
  NaskahShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="naskah-shell">{children}</div>
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
    expect(
      within(getVisibleSectionPage("abstrak")).getByText(
        "Isi abstrak revisi 4",
      ),
    ).toBeInTheDocument()
  })

  it("D-018: masuk dari Chat dengan pending update menampilkan viewed revision, bukan latest", () => {
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

    expect(
      screen.getByRole("heading", { name: "Judul Revisi 3" }),
    ).toBeInTheDocument()
    const visiblePage = getVisibleSectionPage("abstrak")
    expect(
      within(visiblePage).getByText("Isi abstrak revisi 3"),
    ).toBeInTheDocument()

    expect(
      screen.queryByRole("heading", { name: "Judul Revisi 4" }),
    ).not.toBeInTheDocument()
    expect(
      within(visiblePage).queryByText("Isi abstrak revisi 4"),
    ).not.toBeInTheDocument()

    expect(
      screen.getByRole("button", { name: /update/i }),
    ).toBeInTheDocument()
  })

  it("first-visit: render latest dan firing markViewed sebagai bootstrap, banner ditekan", () => {
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

    expect(
      screen.getByRole("heading", { name: "Judul Awal" }),
    ).toBeInTheDocument()
    expect(
      within(getVisibleSectionPage("abstrak")).getByText("Isi abstrak awal"),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /update/i }),
    ).not.toBeInTheDocument()
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

    expect(
      screen.getByText(/belum ada section/i),
    ).toBeInTheDocument()
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

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ArtifactPanel } from "./ArtifactPanel"

const mockUseQuery = vi.fn()
const mockUseCurrentUser = vi.fn()

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}))

vi.mock("./ArtifactViewer", () => ({
  ArtifactViewer: () => <div data-testid="artifact-viewer">artifact viewer</div>,
}))

vi.mock("@/components/refrasa/RefrasaTabContent", () => ({
  RefrasaTabContent: () => <div data-testid="refrasa-tab-content">refrasa</div>,
}))

vi.mock("./ArtifactTabs", () => ({
  ArtifactTabs: () => <div data-testid="artifact-tabs">tabs</div>,
}))

vi.mock("./ArtifactToolbar", () => ({
  ArtifactToolbar: () => <div data-testid="artifact-toolbar">toolbar</div>,
}))

vi.mock("./FullsizeArtifactModal", () => ({
  FullsizeArtifactModal: () => null,
}))

describe("ArtifactPanel", () => {
  it("menampilkan loading saat artifact readonly masih dimuat", () => {
    mockUseCurrentUser.mockReturnValue({
      user: { _id: "user-1" },
      isLoading: false,
    })
    mockUseQuery.mockReturnValue(undefined)

    render(
      <ArtifactPanel
        conversationId={"conversation-active" as never}
        isOpen={true}
        onToggle={vi.fn()}
        openTabs={[
          {
            id: "artifact-orphan" as never,
            title: "Artifact orphan",
            type: "section",
            readOnly: true,
            sourceConversationId: "conversation-missing" as never,
          },
        ]}
        activeTabId={"artifact-orphan" as never}
        onTabChange={vi.fn()}
        onTabClose={vi.fn()}
      />
    )

    expect(screen.getByText("Memuat artifak...")).toBeInTheDocument()
    expect(screen.queryByText(/Artifak aktif tidak ditemukan/i)).not.toBeInTheDocument()
  })

  it("tidak merender rail paper untuk origin chat", () => {
    mockUseCurrentUser.mockReturnValue({
      user: { _id: "user-1" },
      isLoading: false,
    })
    mockUseQuery.mockReturnValue({
      _id: "artifact-1",
      title: "Artifact chat",
      type: "section",
      version: 1,
      createdAt: 1,
      content: "Isi artifact",
      format: "markdown",
    })

    render(
      <ArtifactPanel
        conversationId={"conversation-active" as never}
        isOpen={true}
        onToggle={vi.fn()}
        openTabs={[
          {
            id: "artifact-1" as never,
            title: "Artifact chat",
            type: "section",
            origin: "chat",
          },
        ]}
        activeTabId={"artifact-1" as never}
        onTabChange={vi.fn()}
        onTabClose={vi.fn()}
      />
    )

    expect(screen.queryByRole("button", { name: /sesi paper lainnya/i })).not.toBeInTheDocument()
  })

  it("merender rail ke sesi aktif untuk origin paper-active-session", () => {
    mockUseCurrentUser.mockReturnValue({
      user: { _id: "user-1" },
      isLoading: false,
    })
    mockUseQuery.mockReturnValue({
      _id: "artifact-1",
      title: "Artifact aktif",
      type: "section",
      version: 1,
      createdAt: 1,
      content: "Isi artifact",
      format: "markdown",
    })

    const onReturnToActivePaperSession = vi.fn()

    render(
      <ArtifactPanel
        conversationId={"conversation-active" as never}
        isOpen={true}
        onToggle={vi.fn()}
        openTabs={[
          {
            id: "artifact-1" as never,
            title: "Artifact aktif",
            type: "section",
            origin: "paper-active-session",
            originSessionTitle: "Draft Aktif",
          },
        ]}
        activeTabId={"artifact-1" as never}
        onTabChange={vi.fn()}
        onTabClose={vi.fn()}
        onReturnToActivePaperSession={onReturnToActivePaperSession}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /draft aktif/i }))

    expect(screen.getByRole("button", { name: /^sesi paper$/i })).toBeInTheDocument()
    expect(onReturnToActivePaperSession).toHaveBeenCalledTimes(1)
  })

  it("merender rail root dan folder untuk origin paper-session-manager-folder", () => {
    mockUseCurrentUser.mockReturnValue({
      user: { _id: "user-1" },
      isLoading: false,
    })
    mockUseQuery.mockReturnValue({
      _id: "artifact-1",
      title: "Artifact readonly",
      type: "section",
      version: 1,
      createdAt: 1,
      content: "Isi artifact",
      format: "markdown",
    })

    const onReturnToPaperRoot = vi.fn()
    const onReturnToPaperSession = vi.fn()

    render(
      <ArtifactPanel
        conversationId={"conversation-active" as never}
        isOpen={true}
        onToggle={vi.fn()}
        openTabs={[
          {
            id: "artifact-1" as never,
            title: "Artifact readonly",
            type: "section",
            readOnly: true,
            origin: "paper-session-manager-folder",
            originSessionTitle: "AI & Personalisasi Pembelajaran Pendidikan Tinggi",
          },
        ]}
        activeTabId={"artifact-1" as never}
        onTabChange={vi.fn()}
        onTabClose={vi.fn()}
        onReturnToPaperRoot={onReturnToPaperRoot}
        onReturnToPaperSession={onReturnToPaperSession}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /sesi paper lainnya/i }))
    fireEvent.click(
      screen.getByRole("button", {
        name: /ai & personalisasi pembelajaran pendidikan tinggi/i,
      })
    )

    expect(onReturnToPaperRoot).toHaveBeenCalledTimes(1)
    expect(onReturnToPaperSession).toHaveBeenCalledTimes(1)
  })
})

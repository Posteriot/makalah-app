import { render, screen } from "@testing-library/react"
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
})

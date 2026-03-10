import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { WorkspaceManagerShell } from "@/components/chat/workspace-manager/WorkspaceManagerShell"

vi.mock("convex/react", () => ({
  useQuery: () => ({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 10,
  }),
  useMutation: () => vi.fn(),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: { _id: "user_1" },
    isLoading: false,
  }),
}))

describe("workspace manager shell", () => {
  it("merender area manager dengan tab awal Percakapan dan modul lanjutan non-aktif", () => {
    render(<WorkspaceManagerShell />)

    expect(
      screen.getByRole("heading", { name: "Workspace Manager" })
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Percakapan" })).toBeInTheDocument()
    expect(screen.getAllByText("Paper").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Lampiran").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Knowledge Base").length).toBeGreaterThan(0)
    expect(screen.getAllByText(/coming soon/i).length).toBeGreaterThan(0)
  })
})

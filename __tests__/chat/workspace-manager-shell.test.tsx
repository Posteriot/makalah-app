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
  it("merender card percakapan tunggal dengan link kembali ke chat", () => {
    render(<WorkspaceManagerShell />)

    expect(screen.getByRole("link", { name: /kembali ke chat/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Kelola Percakapan" })).toBeInTheDocument()
    expect(
      screen.queryByText(/Daftar penuh percakapan, paginasi, seleksi halaman aktif/i)
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Workspace Manager" })).not.toBeInTheDocument()
  })
})

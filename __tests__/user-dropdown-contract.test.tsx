import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { UserDropdown } from "@/components/layout/header"

const mockUseSession = vi.fn()
const mockUseCurrentUser = vi.fn()
const mockSignOut = vi.fn()

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("@/lib/auth-client", () => ({
  useSession: () => mockUseSession(),
  signOut: () => mockSignOut(),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}))

describe("UserDropdown auth contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCurrentUser.mockReturnValue({
      user: null,
      isLoading: false,
    })
  })

  it("bisa dirender dari displayName parent tanpa session lokal", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })

    render(<UserDropdown displayName="Makalah" isAdminOverride={false} />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Makalah/i })).toBeInTheDocument()
    })
    expect(screen.getByText("Makalah")).toBeInTheDocument()
  })

  it("memakai onSignOutOverride dari parent", async () => {
    const user = userEvent.setup()
    const onSignOutOverride = vi.fn()

    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "user-1",
          name: "Makalah Admin",
          email: "admin@example.com",
        },
      },
      isPending: false,
    })
    mockUseCurrentUser.mockReturnValue({
      user: {
        _id: "convex-user-1",
        firstName: "Makalah",
        role: "admin",
        subscriptionStatus: "pro",
      },
      isLoading: false,
    })

    render(
      <UserDropdown
        displayName="Makalah"
        isAdminOverride
        onSignOutOverride={onSignOutOverride}
      />
    )

    await user.click(await screen.findByRole("button", { name: /Makalah/i }))
    await user.click(screen.getByRole("button", { name: "Sign out" }))

    await waitFor(() => {
      expect(onSignOutOverride).toHaveBeenCalledTimes(1)
    })
    expect(mockSignOut).not.toHaveBeenCalled()
  })
})

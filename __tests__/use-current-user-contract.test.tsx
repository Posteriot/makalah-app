import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"

const mockUseSession = vi.fn()
const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()

vi.mock("@/lib/auth-client", () => ({
  useSession: () => mockUseSession(),
}))

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}))

function HookHarness() {
  const { user, isLoading } = useCurrentUser()

  return (
    <div>
      <span data-testid="user-id">{user?._id ?? "none"}</span>
      <span data-testid="loading">{String(isLoading)}</span>
    </div>
  )
}

describe("useCurrentUser auth cache contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMutation.mockReturnValue(vi.fn())
  })

  it("mempertahankan cache hanya untuk revalidasi session yang sama", async () => {
    const sessionState: {
      data: null | {
        user: {
          id: string
          name: string
          email: string
        }
      }
      isPending: boolean
    } = {
      data: {
        user: {
          id: "user-1",
          name: "Makalah Admin",
          email: "admin@example.com",
        },
      },
      isPending: false,
    }
    let queryState: unknown = {
      _id: "convex-user-1",
      firstName: "Makalah",
      role: "admin",
    }

    mockUseSession.mockImplementation(() => sessionState)
    mockUseQuery.mockImplementation(() => queryState)

    const view = render(<HookHarness />)

    await waitFor(() => {
      expect(screen.getByTestId("user-id")).toHaveTextContent("convex-user-1")
      expect(screen.getByTestId("loading")).toHaveTextContent("false")
    })

    sessionState.isPending = true
    queryState = undefined
    view.rerender(<HookHarness />)

    await waitFor(() => {
      expect(screen.getByTestId("user-id")).toHaveTextContent("convex-user-1")
      expect(screen.getByTestId("loading")).toHaveTextContent("false")
    })
  })

  it("tidak mempertahankan cache user ketika session final hilang", async () => {
    const sessionState: {
      data: null | {
        user: {
          id: string
          name: string
          email: string
        }
      }
      isPending: boolean
    } = {
      data: {
        user: {
          id: "user-1",
          name: "Makalah Admin",
          email: "admin@example.com",
        },
      },
      isPending: false,
    }
    let queryState: unknown = {
      _id: "convex-user-1",
      firstName: "Makalah",
      role: "admin",
    }

    mockUseSession.mockImplementation(() => sessionState)
    mockUseQuery.mockImplementation(() => queryState)

    const view = render(<HookHarness />)

    await waitFor(() => {
      expect(screen.getByTestId("user-id")).toHaveTextContent("convex-user-1")
    })

    sessionState.data = null
    sessionState.isPending = false
    queryState = undefined
    view.rerender(<HookHarness />)

    await waitFor(() => {
      expect(screen.getByTestId("user-id")).toHaveTextContent("none")
      expect(screen.getByTestId("loading")).toHaveTextContent("false")
    })
  })
})

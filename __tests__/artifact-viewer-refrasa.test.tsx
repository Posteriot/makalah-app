import { render, screen, act } from "@testing-library/react"
import { createRef } from "react"
import { vi } from "vitest"
import { ArtifactViewer } from "@/components/chat/ArtifactViewer"
import type { Id } from "@convex/_generated/dataModel"
import type { ArtifactViewerRef } from "@/components/chat/ArtifactViewer"

const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()
const mockUseRefrasa = vi.fn()
const mockUseCurrentUser = vi.fn()

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}))

vi.mock("@/lib/hooks/useRefrasa", () => ({
  useRefrasa: () => mockUseRefrasa(),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("ArtifactViewer - Refrasa integration", () => {
  const artifactId = "artifact_1" as Id<"artifacts">
  const userId = "user_1" as Id<"users">

  const artifact = {
    _id: artifactId,
    userId,
    type: "section",
    title: "Judul Artifact",
    content: "Ini adalah konten artifact yang cukup panjang untuk refrasa.",
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  beforeEach(() => {
    mockUseCurrentUser.mockReturnValue({ user: { _id: userId } })

    let call = 0
    mockUseQuery.mockImplementation(() => {
      call += 1
      const step = call % 4
      if (step === 1) return true
      if (step === 2) return artifact
      return []
    })

    mockUseMutation.mockReturnValue(vi.fn().mockResolvedValue({}))
    mockUseRefrasa.mockReturnValue({
      isLoading: false,
      result: null,
      error: null,
      analyzeAndRefrasa: vi.fn(),
      reset: vi.fn(),
    })
  })

  it("memanggil analyzeAndRefrasa lewat triggerRefrasa (imperative ref)", async () => {
    const analyzeAndRefrasa = vi.fn()
    mockUseRefrasa.mockReturnValue({
      isLoading: false,
      result: null,
      error: null,
      analyzeAndRefrasa,
      reset: vi.fn(),
    })

    const ref = createRef<ArtifactViewerRef>()
    render(<ArtifactViewer ref={ref} artifactId={artifactId} />)

    await act(async () => {
      await ref.current?.triggerRefrasa()
    })

    expect(analyzeAndRefrasa).toHaveBeenCalledWith(artifact.content, artifact._id, artifact.title)
  })

  it("expose state canRefrasa=true lewat imperative ref", () => {
    const ref = createRef<ArtifactViewerRef>()
    render(<ArtifactViewer ref={ref} artifactId={artifactId} />)

    expect(ref.current?.getState().canRefrasa).toBe(true)
  })

  it("menampilkan loading overlay saat refrasa sedang berjalan", () => {
    mockUseMutation.mockReturnValue(vi.fn().mockResolvedValue({}))

    mockUseRefrasa.mockReturnValue({
      isLoading: true,
      result: null,
      error: null,
      analyzeAndRefrasa: vi.fn(),
      reset: vi.fn(),
    })

    render(<ArtifactViewer artifactId={artifactId} />)

    expect(screen.getByText(/Menganalisis/i)).toBeInTheDocument()
  })
})

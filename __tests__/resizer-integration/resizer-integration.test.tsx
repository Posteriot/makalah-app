/**
 * Resizer & Integration Tests
 * Task 4.1: Write 4-6 focused tests untuk resizer dan integration
 *
 * Tests:
 * 1. Resizer drag changes panel width
 * 2. Min/max constraints enforced
 * 3. Double-click resets to default
 * 4. Collapse threshold behavior
 * 5. PanelResizer component renders correctly
 * 6. Integration: resizer updates grid layout
 */

import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"

// Components
import { PanelResizer } from "@/components/chat/layout/PanelResizer"
import { useResizer } from "@/components/chat/layout/useResizer"

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/chat",
}))

describe("useResizer Hook", () => {
  it("drag changes panel width within constraints", () => {
    const { result } = renderHook(() =>
      useResizer({
        defaultWidth: 280,
        minWidth: 180,
        maxWidth: 500,
        collapseThreshold: 100,
      })
    )

    // Initial width
    expect(result.current.width).toBe(280)

    // Drag to new width
    act(() => {
      result.current.handleDrag(350)
    })
    expect(result.current.width).toBe(350)
    expect(result.current.isCollapsed).toBe(false)
  })

  it("enforces min/max constraints", () => {
    const { result } = renderHook(() =>
      useResizer({
        defaultWidth: 280,
        minWidth: 180,
        maxWidth: 500,
        collapseThreshold: 100,
      })
    )

    // Try to set below min - should clamp to min
    act(() => {
      result.current.setWidth(100)
    })
    expect(result.current.width).toBe(180)

    // Try to set above max - should clamp to max
    act(() => {
      result.current.setWidth(600)
    })
    expect(result.current.width).toBe(500)
  })

  it("double-click resets to default width", () => {
    const { result } = renderHook(() =>
      useResizer({
        defaultWidth: 280,
        minWidth: 180,
        maxWidth: 500,
        collapseThreshold: 100,
      })
    )

    // Change width
    act(() => {
      result.current.setWidth(400)
    })
    expect(result.current.width).toBe(400)

    // Reset to default
    act(() => {
      result.current.resetToDefault()
    })
    expect(result.current.width).toBe(280)
    expect(result.current.isCollapsed).toBe(false)
  })

  it("collapse threshold triggers collapse state", () => {
    const onCollapseChange = vi.fn()

    const { result } = renderHook(() =>
      useResizer({
        defaultWidth: 280,
        minWidth: 180,
        maxWidth: 500,
        collapseThreshold: 100,
        onCollapseChange,
      })
    )

    // Initially not collapsed
    expect(result.current.isCollapsed).toBe(false)

    // Drag below threshold
    act(() => {
      result.current.handleDrag(50)
    })

    expect(result.current.isCollapsed).toBe(true)
    expect(onCollapseChange).toHaveBeenCalledWith(true)
  })
})

describe("PanelResizer Component", () => {
  it("renders with correct role and aria attributes", () => {
    const handleResize = vi.fn()
    const handleReset = vi.fn()

    render(
      <PanelResizer
        position="left"
        onResize={handleResize}
        onDoubleClick={handleReset}
      />
    )

    const resizer = screen.getByRole("separator")
    expect(resizer).toBeInTheDocument()
    expect(resizer).toHaveAttribute("aria-label")
  })

  it("calls onDoubleClick when double-clicked", () => {
    const handleResize = vi.fn()
    const handleReset = vi.fn()

    render(
      <PanelResizer
        position="left"
        onResize={handleResize}
        onDoubleClick={handleReset}
      />
    )

    const resizer = screen.getByRole("separator")
    fireEvent.doubleClick(resizer)

    expect(handleReset).toHaveBeenCalled()
  })

  it("applies visual feedback on hover", () => {
    const handleResize = vi.fn()
    const handleReset = vi.fn()

    render(
      <PanelResizer
        position="right"
        onResize={handleResize}
        onDoubleClick={handleReset}
      />
    )

    const resizer = screen.getByRole("separator")

    // Check that resizer has hover styles class (Mechanical Grace: sky instead of primary)
    expect(resizer).toHaveClass("hover:bg-sky-300")
  })
})

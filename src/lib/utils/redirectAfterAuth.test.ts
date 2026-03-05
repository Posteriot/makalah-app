import { describe, expect, it, beforeEach } from "vitest"
import { getRedirectUrl } from "./redirectAfterAuth"

describe("getRedirectUrl", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/sign-in")
  })

  it("mengizinkan redirect ke support technical report", () => {
    const searchParams = new URLSearchParams({
      redirect_url: "/support/technical-report?source=footer-link",
    })

    const result = getRedirectUrl(searchParams, "/")

    expect(result).toBe(
      `${window.location.origin}/support/technical-report?source=footer-link`
    )
  })

  it("mengizinkan redirect ke technical-report path pendek", () => {
    const searchParams = new URLSearchParams({
      redirect_url: "/technical-report?source=footer-link",
    })

    const result = getRedirectUrl(searchParams, "/")

    expect(result).toBe(
      `${window.location.origin}/technical-report?source=footer-link`
    )
  })

  it("tetap fallback ke default untuk path yang tidak diizinkan", () => {
    const searchParams = new URLSearchParams({
      redirect_url: "/admin-only",
    })

    const result = getRedirectUrl(searchParams, "/")

    expect(result).toBe(`${window.location.origin}/`)
  })
})


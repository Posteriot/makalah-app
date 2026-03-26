import { describe, expect, it } from "vitest"
import { isValidCitationUrl, normalizeHttpishUrlCandidate } from "./url-validation"

describe("url-validation", () => {
  it("accepts valid punycode IDN URL", () => {
    expect(isValidCitationUrl("https://xn--e1afmkfd.xn--p1ai/path")).toBe(true)
    expect(normalizeHttpishUrlCandidate("https://xn--e1afmkfd.xn--p1ai/path"))
      .toBe("https://xn--e1afmkfd.xn--p1ai/path")
  })

  it("rejects pseudo-domain n.d", () => {
    expect(isValidCitationUrl("n.d")).toBe(false)
    expect(normalizeHttpishUrlCandidate("n.d")).toBeNull()
  })
})

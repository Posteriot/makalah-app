import { describe, expect, it } from "vitest"

import { normalizeOvoMobileNumber } from "./mobile-number-format"

describe("normalizeOvoMobileNumber", () => {
  it("normalizes 08-prefixed numbers to +62 format", () => {
    expect(normalizeOvoMobileNumber("0818412712")).toBe("+62818412712")
  })

  it("normalizes 62-prefixed numbers to +62 format", () => {
    expect(normalizeOvoMobileNumber("62818412712")).toBe("+62818412712")
  })

  it("keeps +62-prefixed numbers unchanged", () => {
    expect(normalizeOvoMobileNumber("+62818412712")).toBe("+62818412712")
  })
})

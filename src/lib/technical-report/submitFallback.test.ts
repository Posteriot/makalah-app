import { describe, expect, it } from "vitest"
import {
  isMissingConvexFunctionError,
  toUserFriendlyTechnicalReportError,
} from "./submitFallback"

describe("isMissingConvexFunctionError", () => {
  it("detects missing public function error", () => {
    const error = new Error(
      "[CONVEX M(technicalReports:submitTechnicalReport)] Server Error Could not find public function for 'technicalReports:submitTechnicalReport'."
    )

    expect(
      isMissingConvexFunctionError(error, "technicalReports:submitTechnicalReport")
    ).toBe(true)
  })

  it("returns false for unrelated errors", () => {
    const error = new Error("Network timeout")
    expect(
      isMissingConvexFunctionError(error, "technicalReports:submitTechnicalReport")
    ).toBe(false)
  })
})

describe("toUserFriendlyTechnicalReportError", () => {
  it("maps missing function error to friendly message", () => {
    const error = new Error(
      "Could not find public function for 'technicalReports:submitTechnicalReport'"
    )
    expect(toUserFriendlyTechnicalReportError(error)).toContain("sinkronisasi")
  })

  it("keeps short explicit message for non-system errors", () => {
    expect(toUserFriendlyTechnicalReportError(new Error("Deskripsi laporan wajib diisi."))).toBe(
      "Deskripsi laporan wajib diisi."
    )
  })
})


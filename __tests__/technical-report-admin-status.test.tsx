import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  TechnicalReportStatusBadge,
  getTechnicalReportStatusMeta,
  type TechnicalReportStatus,
} from "@/components/admin/TechnicalReportStatusBadge"

describe("technical report status mapping", () => {
  it("maps open status to Pending", () => {
    expect(getTechnicalReportStatusMeta("open").label).toBe("Pending")
  })

  it("maps triaged status to Proses", () => {
    expect(getTechnicalReportStatusMeta("triaged").label).toBe("Proses")
  })

  it("maps resolved status to Selesai", () => {
    expect(getTechnicalReportStatusMeta("resolved").label).toBe("Selesai")
  })

  it("renders status badge labels consistently", () => {
    const statuses: TechnicalReportStatus[] = ["open", "triaged", "resolved"]
    const labels = statuses.map((status) => getTechnicalReportStatusMeta(status).label)

    render(
      <div>
        {statuses.map((status) => (
          <TechnicalReportStatusBadge key={status} status={status} />
        ))}
      </div>
    )

    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })
})

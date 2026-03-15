import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { RecentFailuresPanel } from "./RecentFailuresPanel"
import { ToolHealthPanel } from "./ToolHealthPanel"
import { WebsearchToolMonitorPanel } from "./WebsearchToolMonitorPanel"

describe("AI Ops websearch telemetry panels", () => {
  it("shows websearch health for current tool names", () => {
    render(
      <WebsearchToolMonitorPanel
        toolHealth={[
          {
            tool: "two_pass_search",
            totalCalls: 12,
            successCount: 10,
            failureCount: 2,
            successRate: 10 / 12,
            avgLatencyMs: 850,
          },
        ]}
        recentFailures={[]}
        failoverTimeline={[]}
      />
    )

    expect(screen.getByText("12")).toBeInTheDocument()
    expect(screen.queryByText(/telemetry `google_search`/i)).not.toBeInTheDocument()
  })

  it("treats current websearch events as websearch trace entries", () => {
    render(
      <WebsearchToolMonitorPanel
        toolHealth={[]}
        recentFailures={[
          {
            _id: "evt-1",
            provider: "openrouter",
            model: "perplexity/sonar",
            mode: "websearch",
            toolUsed: "two_pass_search",
            success: true,
            createdAt: Date.now(),
          },
        ]}
        failoverTimeline={[]}
      />
    )

    expect(screen.getByText(/websearch \/ two_pass_search/i)).toBeInTheDocument()
    expect(screen.queryByText(/Tidak ada event websearch/i)).not.toBeInTheDocument()
  })

  it("labels current websearch tool names as Pencarian Web in summary panels", () => {
    const now = Date.now()

    render(
      <>
        <ToolHealthPanel
          data={[
            {
              tool: "two_pass_search",
              totalCalls: 8,
              successCount: 7,
              failureCount: 1,
              successRate: 0.875,
              avgLatencyMs: 920,
              lastFailure: now - 60_000,
            },
            {
              tool: "web_search",
              totalCalls: 2,
              successCount: 1,
              failureCount: 1,
              successRate: 0.5,
              avgLatencyMs: 410,
            },
          ]}
        />
        <RecentFailuresPanel
          data={[
            {
              _id: "fail-1",
              provider: "openrouter",
              model: "perplexity/sonar",
              toolUsed: "web_search",
              mode: "websearch",
              errorType: "search_unavailable",
              errorMessage: "search down",
              failoverUsed: false,
              createdAt: now,
            },
          ]}
        />
      </>
    )

    const labels = screen.getAllByText("Pencarian Web")
    expect(labels).toHaveLength(3)
  })
})

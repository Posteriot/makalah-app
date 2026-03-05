import { UIMessage } from "ai"

export type TechnicalReportSearchStatus = "searching" | "done" | "off" | "error"

const SEARCH_STATUS_SET = new Set<TechnicalReportSearchStatus>([
  "searching",
  "done",
  "off",
  "error",
])

export function collectSearchStatusesFromMessages(
  messages: UIMessage[]
): TechnicalReportSearchStatus[] {
  const statuses: TechnicalReportSearchStatus[] = []

  for (const message of messages) {
    if (message.role !== "assistant") continue

    for (const part of message.parts ?? []) {
      if (!part || typeof part !== "object") continue
      const maybeDataPart = part as { type?: unknown; data?: unknown }
      if (maybeDataPart.type !== "data-search") continue
      if (!maybeDataPart.data || typeof maybeDataPart.data !== "object") continue

      const rawStatus = (maybeDataPart.data as { status?: unknown }).status
      if (typeof rawStatus !== "string") continue
      if (!SEARCH_STATUS_SET.has(rawStatus as TechnicalReportSearchStatus)) continue

      statuses.push(rawStatus as TechnicalReportSearchStatus)
    }
  }

  return statuses
}

export function resolveTechnicalReportSearchStatus(
  messages: UIMessage[]
): TechnicalReportSearchStatus | undefined {
  const statuses = collectSearchStatusesFromMessages(messages)
  if (statuses.some((status) => status === "error")) return "error"
  return statuses.at(-1)
}


export type ToolStateSnapshot = {
  toolName: string
  state: string
  errorText?: string
}

export type ClientSnapshotInput = {
  routePath?: string
  chatStatus?: string
  model?: string
  errorMessage?: string
  toolStates?: ToolStateSnapshot[]
  userAgent?: string
}

const MAX_DESCRIPTION = 3000
const MAX_TOOL_STATES = 8

export function normalizeDescription(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ")
  if (!normalized) throw new Error("Deskripsi laporan wajib diisi.")
  if (normalized.length > MAX_DESCRIPTION) {
    throw new Error(`Deskripsi maksimal ${MAX_DESCRIPTION} karakter.`)
  }
  return normalized
}

export function sanitizeToolStates(value: ToolStateSnapshot[] = []): ToolStateSnapshot[] {
  return value
    .filter((item) => item && typeof item.toolName === "string" && typeof item.state === "string")
    .slice(0, MAX_TOOL_STATES)
    .map((item) => ({
      toolName: item.toolName.trim().slice(0, 80),
      state: item.state.trim().slice(0, 40),
      ...(item.errorText?.trim() ? { errorText: item.errorText.trim().slice(0, 240) } : {}),
    }))
}

export function buildClientSnapshot(input: ClientSnapshotInput): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {}

  if (input.routePath) snapshot.routePath = input.routePath
  if (input.chatStatus) snapshot.chatStatus = input.chatStatus
  if (input.model) snapshot.model = input.model
  if (input.errorMessage) snapshot.errorMessage = input.errorMessage

  const toolStates = sanitizeToolStates(input.toolStates ?? [])
  if (toolStates.length > 0) snapshot.toolStates = toolStates
  if (input.userAgent) snapshot.userAgent = input.userAgent

  return snapshot
}

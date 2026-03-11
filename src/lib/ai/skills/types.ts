export interface SkillContext {
  isPaperMode: boolean
  currentStage: string | null
  hasRecentSources: boolean
  availableSources: SourceEntry[]
}

export interface SourceEntry {
  url: string
  title: string
  publishedAt?: number
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string; suggestion?: string }

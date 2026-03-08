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

export interface ToolExample {
  toolName: string
  scenario: string
  correctArgs: Record<string, unknown>
  incorrectArgs?: Record<string, unknown>
  explanation: string
}

export interface Skill<TValidateArgs = unknown> {
  name: string
  wrappedTools: string[]
  instructions(context: SkillContext): string | null
  validate(args: TValidateArgs): ValidationResult
  examples: ToolExample[]
}

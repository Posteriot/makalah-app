import { webSearchQualitySkill, type WebSearchSkill } from "./web-search-quality"
import type { SkillContext } from "./types"

export function getSearchSkill(): WebSearchSkill {
  return webSearchQualitySkill
}

export function composeSkillInstructions(context: SkillContext): string {
  return webSearchQualitySkill.getInstructions(context) ?? ""
}

export { webSearchQualitySkill } from "./web-search-quality"
export type { WebSearchSkill } from "./web-search-quality"
export type { SkillContext, ValidationResult, SourceEntry } from "./types"

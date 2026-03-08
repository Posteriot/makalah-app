import type { Skill, SkillContext } from "./types"
import { referenceIntegritySkill } from "./reference-integrity.skill"
import { sourceQualitySkill } from "./source-quality.skill"

const skills: Skill<unknown>[] = [
  referenceIntegritySkill as Skill<unknown>,
  sourceQualitySkill as Skill<unknown>,
]

export function composeSkillInstructions(context: SkillContext): string {
  return skills
    .map((skill) => skill.instructions(context))
    .filter((text): text is string => text !== null)
    .join("\n\n")
}

export function getSkill<T>(name: string): Skill<T> | undefined {
  return skills.find((s) => s.name === name) as Skill<T> | undefined
}

export function getToolExamples(toolName: string): string {
  const relevantExamples = skills
    .flatMap((s) => s.examples)
    .filter((e) => e.toolName === toolName)

  if (relevantExamples.length === 0) return ""

  return relevantExamples
    .map(
      (e) =>
        `Example (${e.scenario}):\n${JSON.stringify(e.correctArgs, null, 2)}\n→ ${e.explanation}`
    )
    .join("\n\n")
}

export { referenceIntegritySkill } from "./reference-integrity.skill"
export { sourceQualitySkill } from "./source-quality.skill"
export type { SkillContext, ValidationResult, ToolExample } from "./types"

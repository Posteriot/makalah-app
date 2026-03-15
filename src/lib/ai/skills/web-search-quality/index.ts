import fs from "fs"
import path from "path"
import matter from "gray-matter"
import type { SkillContext, SourceEntry, ValidationResult } from "../types"
import { scoreSources, type ScoreResult } from "./scripts/score-sources"
import {
  checkReferences,
  type ReferenceCheckArgs,
} from "./scripts/check-references"

// ---------------------------------------------------------------------------
// Parsed SKILL.md cache
// ---------------------------------------------------------------------------

interface ParsedSkill {
  name: string
  sections: Map<string, string>
  stageGuidance: Map<string, string>
}

let cached: ParsedSkill | null = null

function parseSkillMd(): ParsedSkill {
  if (cached) return cached

  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/lib/ai/skills/web-search-quality/SKILL.md"),
    "utf-8"
  )
  const { data, content } = matter(raw)

  // Split body by ## headers
  const sections = new Map<string, string>()
  const sectionRegex = /^## (.+)$/gm
  const sectionMatches = [...content.matchAll(sectionRegex)]

  for (let i = 0; i < sectionMatches.length; i++) {
    const headerName = sectionMatches[i][1].trim()
    const start = sectionMatches[i].index! + sectionMatches[i][0].length
    const end =
      i + 1 < sectionMatches.length ? sectionMatches[i + 1].index! : content.length
    sections.set(headerName, content.slice(start, end).trim())
  }

  // Parse stage guidance from STAGE CONTEXT section
  const stageGuidance = new Map<string, string>()
  const stageContextRaw = sections.get("STAGE CONTEXT")
  if (stageContextRaw) {
    const stageRegex = /^### (.+)$/gm
    const stageMatches = [...stageContextRaw.matchAll(stageRegex)]

    for (let i = 0; i < stageMatches.length; i++) {
      const stageName = stageMatches[i][1].trim()
      const start = stageMatches[i].index! + stageMatches[i][0].length
      const end =
        i + 1 < stageMatches.length
          ? stageMatches[i + 1].index!
          : stageContextRaw.length
      stageGuidance.set(stageName, stageContextRaw.slice(start, end).trim())
    }
  }

  cached = {
    name: data.name as string,
    sections,
    stageGuidance,
  }

  return cached
}

// ---------------------------------------------------------------------------
// WebSearchSkill interface & implementation
// ---------------------------------------------------------------------------

export interface WebSearchSkill {
  name: string
  getInstructions(context: SkillContext): string | null
  scoreSources(sources: SourceEntry[]): ScoreResult
  checkReferences(args: ReferenceCheckArgs): ValidationResult
}

export const webSearchQualitySkill: WebSearchSkill = {
  get name(): string {
    return parseSkillMd().name
  },

  getInstructions(context: SkillContext): string | null {
    const parsed = parseSkillMd()

    // In paper mode, require a known stage (no stage = no skill)
    // Both ACTIVE and PASSIVE stages get skill instructions — ACTIVE stages get
    // stage-specific guidance, PASSIVE stages get "default" guidance via fallback
    // at line 127. Search can happen in any stage; quality rules always apply.
    if (context.isPaperMode && !context.currentStage) {
      return null
    }

    // In chat mode with no recent sources, skill is not needed
    if (!context.isPaperMode && !context.hasRecentSources) {
      return null
    }

    // Compose instructions
    const parts: string[] = []

    const prioritySources = parsed.sections.get("PRIORITY SOURCES")
    if (prioritySources) {
      parts.push(`## PRIORITY SOURCES\n\n${prioritySources}`)
    }

    const researchStrategy = parsed.sections.get("RESEARCH SOURCE STRATEGY")
    if (researchStrategy) {
      parts.push(`## RESEARCH SOURCE STRATEGY\n\n${researchStrategy}`)
    }

    const responseComposition = parsed.sections.get("RESPONSE COMPOSITION")
    if (responseComposition) {
      parts.push(`## RESPONSE COMPOSITION\n\n${responseComposition}`)
    }

    const referenceIntegrity = parsed.sections.get("REFERENCE INTEGRITY")
    if (referenceIntegrity) {
      parts.push(`## REFERENCE INTEGRITY\n\n${referenceIntegrity}`)
    }

    const informationSufficiency = parsed.sections.get("INFORMATION SUFFICIENCY")
    if (informationSufficiency) {
      parts.push(`## INFORMATION SUFFICIENCY\n\n${informationSufficiency}`)
    }

    // Add stage-specific guidance
    if (context.isPaperMode && context.currentStage) {
      const stageGuide =
        parsed.stageGuidance.get(context.currentStage) ??
        parsed.stageGuidance.get("default")
      if (stageGuide) {
        parts.push(`## STAGE CONTEXT\n\n### ${context.currentStage}\n${stageGuide}`)
      }
    } else {
      // Chat mode: use default guidance
      const defaultGuide = parsed.stageGuidance.get("default")
      if (defaultGuide) {
        parts.push(`## STAGE CONTEXT\n\n### default\n${defaultGuide}`)
      }
    }

    return parts.length > 0 ? parts.join("\n\n") : null
  },

  scoreSources,
  checkReferences,
}

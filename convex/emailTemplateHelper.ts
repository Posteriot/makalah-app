import { internal } from "./_generated/api"
import { replacePlaceholders } from "./emailTemplates"

/**
 * Fetch active email template from DB and replace placeholders.
 * Returns null if template not found or inactive (caller should use fallback).
 * For use in Convex runtime (actions, HTTP actions, BetterAuth callbacks).
 */
export async function fetchAndRenderTemplate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: { runQuery: any },
  templateType: string,
  data: Record<string, string>
): Promise<{ subject: string; html: string } | null> {
  try {
    const template = await ctx.runQuery(
      internal.emailTemplates.getActiveTemplateInternal,
      { templateType }
    )
    if (!template || !template.preRenderedHtml) return null
    return {
      subject: replacePlaceholders(template.subject, data),
      html: replacePlaceholders(template.preRenderedHtml, data),
    }
  } catch (error) {
    console.error(`[Email Template] Failed to fetch "${templateType}":`, error)
    return null
  }
}

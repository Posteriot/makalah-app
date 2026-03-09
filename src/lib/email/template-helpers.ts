import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"

/**
 * Replace {{placeholders}} in a string with actual values.
 * Unknown placeholders are left as-is.
 */
export function replacePlaceholders(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`)
}

/**
 * Fetch pre-rendered template from DB and replace placeholders.
 * Returns null if template not found or inactive (caller should use fallback).
 * For use in Next.js server context (API routes, server actions).
 */
export async function fetchTemplateAndRender(
  templateType: string,
  data: Record<string, string>
): Promise<{ subject: string; html: string } | null> {
  try {
    const template = await fetchQuery(api.emailTemplates.getActiveTemplate, {
      templateType,
    })
    if (!template || !template.preRenderedHtml) return null

    return {
      subject: replacePlaceholders(template.subject, data),
      html: replacePlaceholders(template.preRenderedHtml, data),
    }
  } catch (error) {
    console.error(
      `[Email Template] Failed to fetch template "${templateType}":`,
      error
    )
    return null
  }
}

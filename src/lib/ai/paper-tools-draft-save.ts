/**
 * Filters backend warnings for saveStageDraft tool.
 * "Ringkasan not provided." is expected noise for draft saves — filter by exact prefix.
 * All other warnings (unknown keys, URL validation) pass through.
 */
export function filterDraftSaveWarnings(warning: string | undefined): string | undefined {
  if (!warning) return undefined

  const filtered = warning
    .split(" | ")
    .filter((w) => !w.startsWith("Ringkasan not provided."))
    .join(" | ")

  return filtered.length > 0 ? filtered : undefined
}

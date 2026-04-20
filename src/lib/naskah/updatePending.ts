export function deriveNaskahUpdatePending(args: {
  latestRevision: number | undefined
  viewedRevision: number | undefined
}): boolean {
  const { latestRevision, viewedRevision } = args
  if (latestRevision == null && viewedRevision == null) return false
  if (latestRevision == null) return false
  if (viewedRevision == null) return true
  return latestRevision !== viewedRevision
}

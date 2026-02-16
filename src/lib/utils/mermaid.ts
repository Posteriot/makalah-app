const MERMAID_KEYWORDS =
  /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|mindmap|timeline|journey|quadrantChart|xychart|block-beta|sankey-beta|packet-beta)\b/
const MERMAID_FENCE = /^```mermaid\s*\n([\s\S]*?)```\s*$/

export function isMermaidContent(content: string): boolean {
  const trimmed = content.trimStart()
  return MERMAID_KEYWORDS.test(trimmed) || MERMAID_FENCE.test(trimmed)
}

export function extractMermaidCode(content: string): string {
  const match = content.trimStart().match(MERMAID_FENCE)
  return match ? match[1].trim() : content
}

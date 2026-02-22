const DEFAULT_PAPER_TITLE = "Paper Tanpa Judul"
const PLACEHOLDER_CONVERSATION_TITLES = new Set(["Percakapan baru", "New Chat"])
const PLACEHOLDER_WORKING_TITLES = new Set([
  DEFAULT_PAPER_TITLE,
  ...PLACEHOLDER_CONVERSATION_TITLES,
])

export type PaperTitleSource =
  | "paperTitle"
  | "workingTitle"
  | "conversationTitle"
  | "fallback"

interface ResolvePaperDisplayTitleInput {
  paperTitle?: string | null
  workingTitle?: string | null
  conversationTitle?: string | null
}

interface ResolvePaperDisplayTitleResult {
  displayTitle: string
  source: PaperTitleSource
}

function normalizeTitle(title?: string | null): string {
  if (!title) return ""
  return title.trim().replace(/\s+/g, " ")
}

export function resolvePaperDisplayTitle(
  input: ResolvePaperDisplayTitleInput
): ResolvePaperDisplayTitleResult {
  const normalizedPaperTitle = normalizeTitle(input.paperTitle)
  if (normalizedPaperTitle) {
    return { displayTitle: normalizedPaperTitle, source: "paperTitle" }
  }

  const normalizedWorkingTitle = normalizeTitle(input.workingTitle)
  if (
    normalizedWorkingTitle &&
    !PLACEHOLDER_WORKING_TITLES.has(normalizedWorkingTitle)
  ) {
    return { displayTitle: normalizedWorkingTitle, source: "workingTitle" }
  }

  const normalizedConversationTitle = normalizeTitle(input.conversationTitle)
  if (
    normalizedConversationTitle &&
    !PLACEHOLDER_CONVERSATION_TITLES.has(normalizedConversationTitle)
  ) {
    return {
      displayTitle: normalizedConversationTitle,
      source: "conversationTitle",
    }
  }

  return { displayTitle: DEFAULT_PAPER_TITLE, source: "fallback" }
}

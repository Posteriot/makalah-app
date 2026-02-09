import {
  Book,
  Page,
  Globe,
  LightBulb,
  Settings,
  ShieldCheck,
  Group,
  Flash,
} from "iconoir-react"
import type { SearchRecord } from "./types"

// ---------------------------------------------------------------------------
// Icon map — backward-compatible keys matching database iconName values
// ---------------------------------------------------------------------------

const iconMap = {
  BookOpen: Book,
  FileText: Page,
  Globe,
  Lightbulb: LightBulb,
  Settings,
  ShieldCheck,
  Users: Group,
  Zap: Flash,
}

type IconKey = keyof typeof iconMap

export const getIcon = (key?: string) => {
  if (!key) return null
  const Icon = iconMap[key as IconKey]
  return Icon ?? null
}

// ---------------------------------------------------------------------------
// Text normalisation & stemming (Indonesian-aware)
// ---------------------------------------------------------------------------

export const stripDiacritics = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g, "")

export const baseNorm = (value: string) => stripDiacritics(value.toLowerCase())

export const stemToken = (value: string) => {
  let token = value
  token = token.replace(/^[^\p{L}0-9]+|[^\p{L}0-9]+$/gu, "")
  token = token.replace(/(nya|lah|kah|pun|ku|mu)$/i, "")
  token = token.replace(/(kan|an|i)$/i, (match) => (token.length > 4 ? "" : match))
  return token
}

const escapeReg = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export const tokenize = (value: string) =>
  baseNorm(value)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)

export const tokensFromText = (value: string) => tokenize(value).map(stemToken).filter(Boolean)

// ---------------------------------------------------------------------------
// Scoring & snippets
// ---------------------------------------------------------------------------

export const scoreDoc = (record: SearchRecord, stems: string[]) => {
  const titleTokens = record.stemTitle.split(" ").filter(Boolean)
  const textTokens = record.stemText.split(" ").filter(Boolean)
  let score = 0

  for (const token of stems) {
    if (!token) continue
    const titleHits = titleTokens.reduce((count, t) => count + (t === token ? 1 : 0), 0)
    const textHits = textTokens.reduce((count, t) => count + (t === token ? 1 : 0), 0)
    score += titleHits * 2 + textHits
  }

  return score
}

const makeSnippet = (text: string, term: string, span = 80) => {
  const index = text.toLowerCase().indexOf(term.toLowerCase())
  if (index < 0) return text.slice(0, 120) + (text.length > 120 ? "..." : "")
  const start = Math.max(0, index - span)
  const end = Math.min(text.length, index + span)
  return (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "")
}

const buildMatchRegex = (stems: string[]) => {
  const parts = stems.filter(Boolean).map((token) => escapeReg(token))
  if (parts.length === 0) return null
  return new RegExp(`\\b(?:${parts.join("|")})[\\w-]*`, "i")
}

export const makeSnippetAdvanced = (text: string, stems: string[], fallback: string) => {
  const rx = buildMatchRegex(stems)
  if (rx) {
    const match = rx.exec(baseNorm(text))
    if (match) {
      return makeSnippet(text, match[0])
    }
  }
  return makeSnippet(text, fallback)
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export const highlightSnippet = (snippet: string, stems: string[]) => {
  const escaped = escapeHtml(snippet)
  const parts = stems.filter(Boolean).map((token) => escapeReg(token))
  if (parts.length === 0) return escaped
  const rx = new RegExp(`\\b(${parts.join("|")})[\\w-]*`, "gi")
  return escaped.replace(rx, "<mark>$&</mark>")
}

// ---------------------------------------------------------------------------
// Inline markdown renderer (bold + code)
// ---------------------------------------------------------------------------

export const renderInline = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="text-narrative font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="text-interface rounded-sm bg-slate-950/10 px-1 py-0.5 text-xs text-foreground dark:bg-slate-950"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={`${part}-${index}`}>{part}</span>
  })
}

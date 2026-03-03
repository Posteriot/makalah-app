export type ParagraphCitationSource = {
  url: string
}

export type ParagraphCitationAnchor = {
  position?: number | null
  sourceNumbers: number[]
}

type ParagraphSegment = {
  text: string
  separator: string
  start: number
  end: number
}

type LineCitationSlot = {
  segmentIndex: number
  lineIndex: number
}

type LineCitationMap = Map<number, Map<number, Set<number>>>

const CITATION_TAIL_REGEX = /\[\d+(?:\s*,\s*\d+)*\]\s*$/
const INLINE_CITATION_REGEX = /\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g
const BARE_URL_REGEX = /\bhttps?:\/\/[^\s<>()\[\]{}"']+/gi
const DOMAIN_LIKE_REGEX = /^(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const splitParagraphs = (text: string): ParagraphSegment[] => {
  if (!text) return []

  const segments: ParagraphSegment[] = []
  const separatorRegex = /\n\s*\n+/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = separatorRegex.exec(text)) !== null) {
    const separatorStart = match.index
    const separator = match[0]
    const segmentText = text.slice(cursor, separatorStart)
    segments.push({
      text: segmentText,
      separator,
      start: cursor,
      end: Math.max(cursor, separatorStart - 1),
    })
    cursor = separatorStart + separator.length
  }

  segments.push({
    text: text.slice(cursor),
    separator: "",
    start: cursor,
    end: text.length > cursor ? text.length - 1 : cursor,
  })

  return segments
}

const toHost = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl)
    return parsed.hostname.replace(/^www\./i, "").toLowerCase()
  } catch {
    return rawUrl.replace(/^https?:\/\//i, "").replace(/^www\./i, "").toLowerCase()
  }
}

const removeKnownSourceMentions = (input: string, sources: ParagraphCitationSource[]) => {
  if (!input) return input

  const sourceHosts = Array.from(new Set(
    sources
      .map((source) => toHost(source.url))
      .filter((host) => host.length > 0 && host.includes("."))
  ))

  let text = input

  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, (_full, label: string) => {
    const cleanedLabel = label.trim()
    if (!cleanedLabel) return ""
    if (DOMAIN_LIKE_REGEX.test(cleanedLabel)) return ""
    return cleanedLabel
  })

  text = text.replace(BARE_URL_REGEX, "")

  for (const host of sourceHosts) {
    const hostRegex = new RegExp(
      `(^|[\\s([{\"'` + "`" + `])((?:www\\.)?${escapeRegExp(host)})(?=$|[\\s)\\]}\"'` + "`" + `.,;:!?])`,
      "gi",
    )
    text = text.replace(hostRegex, (_full, prefix: string) => prefix)
  }

  return text
}

const normalizeSpacing = (input: string) => {
  const lines = input.split("\n")
  const normalizedLines = lines.map((line) =>
    line
      .replace(/\s+([.,;:!?])/g, "$1")
      .replace(/\s{2,}/g, " ")
      .replace(/\(\s+/g, "(")
      .replace(/\s+\)/g, ")")
      .trimEnd()
  )
  return normalizedLines.join("\n")
}

const appendCitationTail = (paragraph: string, sourceNumbers: number[]) => {
  if (sourceNumbers.length === 0) return paragraph
  if (CITATION_TAIL_REGEX.test(paragraph.trimEnd())) return paragraph

  const sortedUnique = Array.from(new Set(sourceNumbers))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b)
  if (sortedUnique.length === 0) return paragraph

  const marker = ` [${sortedUnique.join(",")}]`
  const trailingWhitespace = paragraph.match(/\s*$/)?.[0] ?? ""
  const core = trailingWhitespace
    ? paragraph.slice(0, paragraph.length - trailingWhitespace.length)
    : paragraph

  return `${core}${marker}${trailingWhitespace}`
}

const isBulletLikeLine = (line: string) =>
  /^\s*(?:[-*•]|\d+[.)])\s+/.test(line)

const stripLineFormatting = (line: string) =>
  line
    .replace(/\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g, "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .trim()

const isTitleCaseLikeLine = (line: string) => {
  const words = line
    .split(/\s+/)
    .map((word) => word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ""))
    .filter(Boolean)
  if (words.length < 2 || words.length > 14) return false

  let titleLikeCount = 0
  for (const word of words) {
    if (/^[A-Z0-9]/.test(word)) {
      titleLikeCount += 1
    }
  }
  return titleLikeCount / words.length >= 0.8
}

const isPotentialHeadingLine = (line: string) => {
  const trimmed = stripLineFormatting(line)
  if (!trimmed) return true
  if (/^#{1,6}\s+/.test(trimmed)) return true
  if (trimmed.endsWith(":")) return true
  if (/^(?:\*\*|__)?[^*_]+(?:\*\*|__)\s*:?$/.test(line.trim()) && !/[.!?]$/.test(trimmed)) return true
  if (!/[.!?]$/.test(trimmed) && isTitleCaseLikeLine(trimmed)) return true
  return false
}

const isCitableLine = (line: string) => {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (!/[a-zA-Z0-9]/.test(trimmed)) return false
  if (isPotentialHeadingLine(trimmed)) return false
  return true
}

const extractFallbackSlots = (segments: ParagraphSegment[]): LineCitationSlot[] => {
  const bulletSlots: LineCitationSlot[] = []
  const genericSlots: LineCitationSlot[] = []

  segments.forEach((segment, segmentIndex) => {
    const lines = segment.text.split("\n")
    lines.forEach((line, lineIndex) => {
      if (!isCitableLine(line)) return
      const slot = { segmentIndex, lineIndex }
      if (isBulletLikeLine(line)) {
        bulletSlots.push(slot)
      } else {
        genericSlots.push(slot)
      }
    })
  })

  if (bulletSlots.length > 0) return bulletSlots
  return genericSlots
}

const collectLineCitationMarkers = (segments: ParagraphSegment[]) => {
  const lineCitationMap: LineCitationMap = new Map()
  const sourceNumberSet = new Set<number>()

  segments.forEach((segment, segmentIndex) => {
    const lines = segment.text.split("\n")
    const citableIndexes = lines
      .map((line, lineIndex) => ({ line, lineIndex }))
      .filter((entry) => isCitableLine(entry.line))
      .map((entry) => entry.lineIndex)

    const resolveTargetLineIndex = (lineIndex: number): number | null => {
      if (isCitableLine(lines[lineIndex])) return lineIndex
      if (citableIndexes.length === 0) return null
      const nextIndex = citableIndexes.find((idx) => idx > lineIndex)
      if (typeof nextIndex === "number") return nextIndex
      return citableIndexes[citableIndexes.length - 1]
    }

    lines.forEach((line, lineIndex) => {
      INLINE_CITATION_REGEX.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = INLINE_CITATION_REGEX.exec(line)) !== null) {
        const numbers = match[1]
          .split(",")
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isFinite(value) && value > 0)
        if (numbers.length === 0) continue

        const targetLineIndex = resolveTargetLineIndex(lineIndex)
        if (targetLineIndex === null) continue

        const linesMap = lineCitationMap.get(segmentIndex) ?? new Map<number, Set<number>>()
        const set = linesMap.get(targetLineIndex) ?? new Set<number>()
        numbers.forEach((number) => {
          set.add(number)
          sourceNumberSet.add(number)
        })
        linesMap.set(targetLineIndex, set)
        lineCitationMap.set(segmentIndex, linesMap)
      }
    })
  })

  return {
    lineCitationMap,
    sourceNumbers: Array.from(sourceNumberSet).sort((a, b) => a - b),
  }
}

const stripInlineCitationMarkers = (input: string) => {
  INLINE_CITATION_REGEX.lastIndex = 0
  return input.replace(INLINE_CITATION_REGEX, "")
}

const distributeNumbersAcrossSlots = (
  numbers: number[],
  slots: LineCitationSlot[]
) => {
  const map: LineCitationMap = new Map()
  if (numbers.length === 0 || slots.length === 0) return map

  numbers.forEach((number, index) => {
    const targetSlot = slots[index % slots.length]
    const linesMap = map.get(targetSlot.segmentIndex) ?? new Map<number, Set<number>>()
    const set = linesMap.get(targetSlot.lineIndex) ?? new Set<number>()
    set.add(number)
    linesMap.set(targetSlot.lineIndex, set)
    map.set(targetSlot.segmentIndex, linesMap)
  })

  return map
}

export function formatParagraphEndCitations(input: {
  text: string
  sources: ParagraphCitationSource[]
  anchors: ParagraphCitationAnchor[]
}): string {
  const { text, sources, anchors } = input
  if (!text || sources.length === 0) return text

  const segments = splitParagraphs(text)
  if (segments.length === 0) return text

  const markerExtraction = collectLineCitationMarkers(segments)

  const citationByParagraph = new Map<number, Set<number>>()
  const noPositionNumbers: number[] = []

  const findParagraphIndexByPosition = (position: number): number => {
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i]
      if (position >= segment.start && position <= segment.end) return i
    }
    return segments.length - 1
  }

  for (const anchor of anchors) {
    const numbers = Array.from(new Set(anchor.sourceNumbers))
      .filter((n) => Number.isFinite(n) && n > 0)
    if (numbers.length === 0) continue

    if (typeof anchor.position !== "number" || !Number.isFinite(anchor.position)) {
      noPositionNumbers.push(...numbers)
      continue
    }

    const clampedPosition = Math.max(0, Math.min(text.length - 1, Math.floor(anchor.position)))
    const paragraphIndex = findParagraphIndexByPosition(clampedPosition)
    const set = citationByParagraph.get(paragraphIndex) ?? new Set<number>()
    numbers.forEach((n) => set.add(n))
    citationByParagraph.set(paragraphIndex, set)
  }

  const fallbackNumbers = Array.from(new Set(
    noPositionNumbers.length > 0
      ? noPositionNumbers
      : markerExtraction.sourceNumbers.length > 0
        ? markerExtraction.sourceNumbers
      : Array.from({ length: sources.length }, (_, i) => i + 1)
  )).sort((a, b) => a - b)

  const fallbackLineCitationMap = citationByParagraph.size === 0
    ? (markerExtraction.lineCitationMap.size > 0
      ? markerExtraction.lineCitationMap
      : distributeNumbersAcrossSlots(fallbackNumbers, extractFallbackSlots(segments)))
    : new Map<number, Map<number, Set<number>>>()

  if (citationByParagraph.size === 0) {
    if (fallbackLineCitationMap.size === 0) {
      const lastNonEmptyIndex = (() => {
        for (let i = segments.length - 1; i >= 0; i -= 1) {
          if (segments[i].text.trim().length > 0) return i
        }
        return segments.length - 1
      })()
      const fallbackSet = citationByParagraph.get(lastNonEmptyIndex) ?? new Set<number>()
      fallbackNumbers.forEach((n) => fallbackSet.add(n))
      citationByParagraph.set(lastNonEmptyIndex, fallbackSet)
    }
  } else if (noPositionNumbers.length > 0) {
    const sortedParagraphIndexes = Array.from(citationByParagraph.keys()).sort((a, b) => a - b)
    noPositionNumbers.forEach((n, idx) => {
      const paragraphIndex = sortedParagraphIndexes[idx % sortedParagraphIndexes.length]
      const set = citationByParagraph.get(paragraphIndex) ?? new Set<number>()
      set.add(n)
      citationByParagraph.set(paragraphIndex, set)
    })
  }

  const rendered = segments.map((segment, index) => {
    const raw = removeKnownSourceMentions(segment.text, sources)
    const withoutInlineCitations = stripInlineCitationMarkers(raw)
    const cleaned = normalizeSpacing(withoutInlineCitations)
    const lineMap = fallbackLineCitationMap.get(index)

    if (lineMap && lineMap.size > 0) {
      const lines = cleaned.split("\n")
      const withLineCitations = lines.map((line, lineIndex) => {
        const numbers = Array.from(lineMap.get(lineIndex) ?? new Set<number>())
        return appendCitationTail(line, numbers)
      }).join("\n")
      return withLineCitations + segment.separator
    }

    const sourceNumbers = Array.from(citationByParagraph.get(index) ?? new Set<number>())
    return appendCitationTail(cleaned, sourceNumbers) + segment.separator
  }).join("")

  return rendered
}

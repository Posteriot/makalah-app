"use client"

import { Fragment, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { InlineCitationChip } from "./InlineCitationChip"

const MermaidRenderer = dynamic(
  () => import("./MermaidRenderer").then((m) => ({ default: m.MermaidRenderer })),
  { ssr: false, loading: () => <div className="my-2 h-32 animate-pulse rounded-action bg-muted" /> }
)

interface MarkdownRendererProps {
  markdown: string
  className?: string
  sources?: CitationSource[]
}

type CitationSource = {
  url: string
  title: string
  publishedAt?: number | null
}

type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "ul"; items: { text: string; children: Block[] }[] }
  | { type: "ol"; items: { number: number; lines: string[]; children: Block[] }[] }
  | { type: "outline"; items: { number: number; title: string; children: Block[] }[]; useOriginalNumbers: boolean }
  | { type: "table"; headers: string[]; alignments: ("left" | "center" | "right" | null)[]; rows: string[][] }
  | { type: "code"; language?: string; code: string }
  | { type: "blockquote"; lines: string[] }
  | { type: "hr" }

function isHeading(line: string) {
  const trimmed = line.trimStart()
  if (!trimmed.startsWith("#")) return null
  let level = 0
  while (level < trimmed.length && trimmed[level] === "#") level += 1
  if (level < 1 || level > 6) return null
  const rest = trimmed.slice(level)
  if (!rest.startsWith(" ")) return null
  return { level: level as 1 | 2 | 3 | 4 | 5 | 6, text: rest.trim() }
}

function isUnorderedItem(line: string) {
  const indent = line.length - line.trimStart().length
  const trimmed = line.trimStart()
  if (!(trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("+"))) return null
  const rest = trimmed.slice(1)
  if (!rest.startsWith(" ")) return null
  return { text: rest.trim(), indent }
}

function isOrderedItem(line: string) {
  const indent = line.length - line.trimStart().length
  const trimmed = line.trimStart()
  let i = 0
  while (i < trimmed.length && trimmed[i] >= "0" && trimmed[i] <= "9") i += 1
  if (i === 0) return null
  const number = Number(trimmed.slice(0, i))
  if (!Number.isFinite(number)) return null
  if (!trimmed.slice(i).startsWith(". ")) return null
  return { number, text: trimmed.slice(i + 2).trim(), indent }
}

function isTableRow(line: string) {
  const trimmed = line.trim()
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null
  const cells = trimmed.slice(1, -1).split("|").map((c) => c.trim())
  if (cells.length < 1) return null
  return cells
}

function isTableSeparator(line: string) {
  const trimmed = line.trim()
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return false
  const cells = trimmed.slice(1, -1).split("|").map((c) => c.trim())
  return cells.length >= 1 && cells.every((c) => /^:?-{2,}:?$/.test(c))
}

function parseTableAlignments(line: string): ("left" | "center" | "right" | null)[] {
  const cells = line.trim().slice(1, -1).split("|").map((c) => c.trim())
  return cells.map((c) => {
    const left = c.startsWith(":")
    const right = c.endsWith(":")
    if (left && right) return "center"
    if (right) return "right"
    if (left) return "left"
    return null
  })
}

function isHr(line: string) {
  const t = line.trim()
  return t === "---" || t === "***" || t === "___"
}

function isBlockquote(line: string) {
  const trimmed = line.trimStart()
  if (!trimmed.startsWith(">")) return null
  return trimmed.slice(1).replace(/^ /, "")
}

function buildNestedUlItems(
  rawItems: { text: string; indent: number }[],
  startIdx: number,
): { text: string; children: Block[] }[] {
  const result: { text: string; children: Block[] }[] = []
  const baseIndent = rawItems[startIdx]?.indent ?? 0
  let i = startIdx

  while (i < rawItems.length) {
    const item = rawItems[i]
    if (item.indent < baseIndent) break
    if (item.indent > baseIndent) {
      // This is a deeper-indented item; attach as children to last item
      if (result.length > 0) {
        const childItems = buildNestedUlItems(rawItems, i)
        result[result.length - 1].children.push({ type: "ul", items: childItems })
        // Skip over all items consumed by the recursive call
        let consumed = 0
        const countItems = (items: { text: string; children: Block[] }[]): number => {
          let count = 0
          for (const ci of items) {
            count += 1
            for (const child of ci.children) {
              if (child.type === "ul") count += countItems(child.items as { text: string; children: Block[] }[])
            }
          }
          return count
        }
        consumed = countItems(childItems)
        i += consumed
      } else {
        // Edge case: indented item with no parent, treat as top-level
        result.push({ text: item.text, children: [] })
        i += 1
      }
      continue
    }
    result.push({ text: item.text, children: [] })
    i += 1
  }

  return result
}

function buildNestedOlItems(
  rawItems: { number: number; text: string; indent: number; continuationLines: string[] }[],
  startIdx: number,
): { number: number; lines: string[]; children: Block[] }[] {
  const result: { number: number; lines: string[]; children: Block[] }[] = []
  const baseIndent = rawItems[startIdx]?.indent ?? 0
  let i = startIdx

  while (i < rawItems.length) {
    const item = rawItems[i]
    if (item.indent < baseIndent) break
    if (item.indent > baseIndent) {
      // Deeper-indented: attach as children to last item
      if (result.length > 0) {
        const childItems = buildNestedOlItems(rawItems, i)
        result[result.length - 1].children.push({ type: "ol", items: childItems })
        const countItems = (items: { number: number; lines: string[]; children: Block[] }[]): number => {
          let count = 0
          for (const ci of items) {
            count += 1
            for (const child of ci.children) {
              if (child.type === "ol") count += countItems(child.items as { number: number; lines: string[]; children: Block[] }[])
            }
          }
          return count
        }
        i += countItems(childItems)
      } else {
        result.push({ number: item.number, lines: [item.text, ...item.continuationLines], children: [] })
        i += 1
      }
      continue
    }
    result.push({ number: item.number, lines: [item.text, ...item.continuationLines], children: [] })
    i += 1
  }

  return result
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n")
  const blocks: Block[] = []
  let i = 0

  const isBlank = (line: string) => line.trim().length === 0

  while (i < lines.length) {
    const line = lines[i]
    if (isBlank(line)) {
      i += 1
      continue
    }

    const trimmed = line.trimStart()
    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim() || undefined
      i += 1
      const codeLines: string[] = []
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i])
        i += 1
      }
      if (i < lines.length) i += 1
      blocks.push({ type: "code", language, code: codeLines.join("\n") })
      continue
    }

    if (isHr(line)) {
      blocks.push({ type: "hr" })
      i += 1
      continue
    }

    const heading = isHeading(line)
    if (heading) {
      blocks.push({ type: "heading", level: heading.level, text: heading.text })
      i += 1
      continue
    }

    const quoteLine = isBlockquote(line)
    if (quoteLine !== null) {
      const quoteLines: string[] = []
      while (i < lines.length) {
        const q = isBlockquote(lines[i])
        if (q === null) break
        quoteLines.push(q)
        i += 1
      }
      blocks.push({ type: "blockquote", lines: quoteLines })
      continue
    }

    const ulItem = isUnorderedItem(line)
    if (ulItem !== null) {
      // Collect all raw items with their indent levels
      const rawItems: { text: string; indent: number }[] = []
      while (i < lines.length) {
        const item = isUnorderedItem(lines[i])
        if (item === null) break
        rawItems.push(item)
        i += 1
      }
      // Build nested structure from flat indented items
      blocks.push({ type: "ul", items: buildNestedUlItems(rawItems, 0) })
      continue
    }

    const olItem = isOrderedItem(line)
    if (olItem !== null) {
      // Collect all raw items with indent levels, including continuation lines
      const rawItems: { number: number; text: string; indent: number; continuationLines: string[] }[] = []
      while (i < lines.length) {
        const item = isOrderedItem(lines[i])
        if (item === null) break

        const continuationLines: string[] = []
        i += 1

        // Treat subsequent non-list lines as continuation of the same numbered item.
        while (i < lines.length) {
          const current = lines[i]
          if (isBlank(current)) break
          if (isOrderedItem(current) !== null) break
          if (isUnorderedItem(current) !== null) break
          if (isHeading(current)) break
          if (isBlockquote(current) !== null) break
          if (isHr(current)) break
          if (current.trimStart().startsWith("```")) break

          continuationLines.push(current.trim())
          i += 1
        }

        rawItems.push({
          number: item.number,
          text: item.text,
          indent: item.indent,
          continuationLines: continuationLines.filter((l) => l.length > 0),
        })
      }
      blocks.push({ type: "ol", items: buildNestedOlItems(rawItems, 0) })
      continue
    }

    // Table: detect header row + separator + data rows
    const tableHeaders = isTableRow(line)
    if (tableHeaders !== null && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const alignments = parseTableAlignments(lines[i + 1])
      i += 2
      const rows: string[][] = []
      while (i < lines.length) {
        const row = isTableRow(lines[i])
        if (row === null) break
        rows.push(row)
        i += 1
      }
      blocks.push({ type: "table", headers: tableHeaders, alignments, rows })
      continue
    }

    const paragraphLines: string[] = []
    while (i < lines.length) {
      const cur = lines[i]
      if (isBlank(cur)) break
      if (cur.trimStart().startsWith("```")) break
      if (isHr(cur)) break
      if (isHeading(cur)) break
      if (isBlockquote(cur) !== null) break
      if (isUnorderedItem(cur) !== null) break
      if (isOrderedItem(cur) !== null) break
      // Break for table: current line is table row and next is separator
      if (isTableRow(cur) !== null && i + 1 < lines.length && isTableSeparator(lines[i + 1])) break
      paragraphLines.push(cur)
      i += 1
    }
    blocks.push({ type: "paragraph", lines: paragraphLines })
  }

  return blocks
}

function isOutlineHeadingCandidate(block: Block): block is { type: "ol"; items: { number: number; lines: string[]; children: Block[] }[] } {
  return block.type === "ol" && block.items.length === 1 && block.items[0].children.length === 0
}

function shouldUseOriginalOutlineNumbers(items: { number: number }[]) {
  const numbers = items.map((it) => it.number)
  const uniqueCount = new Set(numbers).size
  const hasDuplicates = uniqueCount !== numbers.length
  const allOnes = numbers.length > 0 && numbers.every((n) => n === 1)
  const nonDecreasing = numbers.every((n, idx) => idx === 0 || n >= numbers[idx - 1])

  if (allOnes) return false
  if (hasDuplicates) return false
  if (!nonDecreasing) return false
  return true
}

function groupOutlineLists(blocks: Block[]): Block[] {
  const candidateCount = blocks.filter(isOutlineHeadingCandidate).length
  if (candidateCount < 2) return blocks

  const result: Block[] = []
  let i = 0

  while (i < blocks.length) {
    const current = blocks[i]
    if (!isOutlineHeadingCandidate(current)) {
      result.push(current)
      i += 1
      continue
    }

    const items: { number: number; title: string; children: Block[] }[] = []
    let j = i
    while (j < blocks.length && isOutlineHeadingCandidate(blocks[j])) {
      const heading = (blocks[j] as { type: "ol"; items: { number: number; lines: string[]; children: Block[] }[] }).items[0]
      j += 1
      const children: Block[] = []
      while (j < blocks.length && !isOutlineHeadingCandidate(blocks[j])) {
        children.push(blocks[j])
        j += 1
      }
      items.push({
        number: heading.number,
        title: heading.lines.join(" ").trim(),
        children,
      })
    }

    const useOriginalNumbers = shouldUseOriginalOutlineNumbers(items)
    result.push({ type: "outline", items, useOriginalNumbers })
    i = j
  }

  return result
}

function sanitizeHref(href: string | undefined): string | undefined {
  if (!href) return undefined
  const trimmed = href.trim()
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed
  return undefined
}

const BARE_URL_REGEX = /\bhttps?:\/\/[^\s<>()\[\]{}"']+/g

function BareUrlCopyBadge({ url }: { url: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("URL referensi disalin")
    } catch {
      toast.error("Gagal menyalin URL referensi")
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleCopy}
          className="mx-0.5 inline-flex items-center rounded-badge border border-slate-300 bg-slate-200 px-2 py-0.5 font-mono text-xs font-normal text-slate-900 transition-colors hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          URL Referensi
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>Klik untuk salin URL</p>
      </TooltipContent>
    </Tooltip>
  )
}

function renderInline(text: string, keyPrefix: string, sources?: CitationSource[]): ReactNode[] {
  const nodes: ReactNode[] = []
  let cursor = 0
  let partIndex = 0

  const pushText = (value: string) => {
    if (!value) return
    BARE_URL_REGEX.lastIndex = 0
    const matches = Array.from(value.matchAll(BARE_URL_REGEX))

    if (matches.length === 0) {
      nodes.push(<Fragment key={`${keyPrefix}-t-${partIndex++}`}>{value}</Fragment>)
      return
    }

    let localCursor = 0

    for (const match of matches) {
      const rawUrl = match[0]
      const startIndex = match.index ?? 0
      const endIndex = startIndex + rawUrl.length
      let leftBoundary = startIndex
      while (leftBoundary > localCursor && /\s/.test(value[leftBoundary - 1] ?? "")) {
        leftBoundary -= 1
      }

      let rightBoundary = endIndex
      while (rightBoundary < value.length && /\s/.test(value[rightBoundary] ?? "")) {
        rightBoundary += 1
      }

      const hasBracketWrapper =
        leftBoundary > localCursor &&
        value[leftBoundary - 1] === "[" &&
        rightBoundary < value.length &&
        value[rightBoundary] === "]"
      const textEnd = hasBracketWrapper ? leftBoundary - 1 : startIndex

      if (textEnd > localCursor) {
        nodes.push(
          <Fragment key={`${keyPrefix}-t-${partIndex++}`}>
            {value.slice(localCursor, textEnd)}
          </Fragment>,
        )
      }

      nodes.push(
        <BareUrlCopyBadge
          key={`${keyPrefix}-url-${partIndex++}`}
          url={rawUrl}
        />,
      )

      localCursor = hasBracketWrapper ? rightBoundary + 1 : endIndex
    }

    if (localCursor < value.length) {
      nodes.push(
        <Fragment key={`${keyPrefix}-t-${partIndex++}`}>
          {value.slice(localCursor)}
        </Fragment>,
      )
    }
  }

  while (cursor < text.length) {
    const rest = text.slice(cursor)

    const nextCode = rest.indexOf("`")
    const nextLink = rest.indexOf("[")
    const nextStrongA = rest.indexOf("**")
    const nextStrongB = rest.indexOf("__")
    const nextEmA = rest.indexOf("*")
    const nextEmB = rest.indexOf("_")

    const candidates = [nextCode, nextLink, nextStrongA, nextStrongB, nextEmA, nextEmB]
      .filter((n) => n >= 0)
      .sort((a, b) => a - b)

    if (candidates.length === 0) {
      pushText(rest)
      break
    }

    const next = candidates[0]
    pushText(rest.slice(0, next))
    cursor += next

    if (text[cursor] === "`") {
      const end = text.indexOf("`", cursor + 1)
      if (end === -1) {
        pushText(text.slice(cursor))
        break
      }
      const inner = text.slice(cursor + 1, end)
      nodes.push(
        <code
          key={`${keyPrefix}-code-${partIndex++}`}
          className="inline-flex items-center rounded-badge border border-slate-500 bg-slate-300 px-2 py-0.5 font-mono text-[0.85em] font-medium text-slate-950 shadow-sm dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:shadow-none"
        >
          {inner}
        </code>,
      )
      cursor = end + 1
      continue
    }

    if (text[cursor] === "[") {
      const restFromCursor = text.slice(cursor)
      const citationMatch = restFromCursor.match(/^\[(\d+(?:\s*,\s*\d+)*)\]/)
      if (citationMatch) {
        const full = citationMatch[0]
        const after = text[cursor + full.length]
        // Kalau langsung diikuti "(", ini kemungkinan link markdown [label](url), bukan sitasi.
        if (after !== "(") {
          const numbers = citationMatch[1]
            .split(",")
            .map((value) => Number(value.trim()))
            .filter((value) => Number.isFinite(value) && value > 0)

          const selectedSources: CitationSource[] = []
          const seen = new Set<number>()
          for (const num of numbers) {
            if (seen.has(num)) continue
            const source = sources?.[num - 1]
            if (!source) continue
            selectedSources.push(source)
            seen.add(num)
          }

          if (selectedSources.length > 0) {
            nodes.push(
              <InlineCitationChip
                key={`${keyPrefix}-cite-${partIndex++}`}
                sources={selectedSources}
              />,
            )
          }
          cursor += full.length
          continue
        }
      }

      const closeBracket = text.indexOf("]", cursor + 1)
      if (closeBracket !== -1) {
        const bracketBody = text.slice(cursor + 1, closeBracket).trim()
        const bracketedBareUrl = sanitizeHref(bracketBody)
        const nextChar = text[closeBracket + 1]
        if (bracketedBareUrl && nextChar !== "(") {
          nodes.push(
            <BareUrlCopyBadge
              key={`${keyPrefix}-url-${partIndex++}`}
              url={bracketedBareUrl}
            />,
          )
          cursor = closeBracket + 1
          continue
        }
      }

      const openParen = closeBracket >= 0 ? text.indexOf("(", closeBracket + 1) : -1
      const closeParen = openParen >= 0 ? text.indexOf(")", openParen + 1) : -1
      if (closeBracket === -1 || openParen === -1 || closeParen === -1 || text.slice(closeBracket, openParen + 1) !== "](") {
        pushText("[")
        cursor += 1
        continue
      }
      const label = text.slice(cursor + 1, closeBracket)
      const hrefRaw = text.slice(openParen + 1, closeParen)
      const href = sanitizeHref(hrefRaw)
      const children = renderInline(label, `${keyPrefix}-link-${partIndex}`, sources)

      if (href) {
        nodes.push(
          <a
            key={`${keyPrefix}-a-${partIndex++}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-80 [overflow-wrap:anywhere] break-all"
          >
            {children}
          </a>,
        )
      } else {
        nodes.push(<Fragment key={`${keyPrefix}-badlink-${partIndex++}`}>{children}</Fragment>)
      }

      cursor = closeParen + 1
      continue
    }

    const startsWithStrong =
      text.startsWith("**", cursor) || text.startsWith("__", cursor)
    if (startsWithStrong) {
      const delimiter = text.startsWith("**", cursor) ? "**" : "__"
      const end = text.indexOf(delimiter, cursor + delimiter.length)
      if (end === -1) {
        pushText(text.slice(cursor))
        break
      }
      const inner = text.slice(cursor + delimiter.length, end)
      nodes.push(
        <strong key={`${keyPrefix}-strong-${partIndex++}`} className="text-foreground">
          {renderInline(inner, `${keyPrefix}-strongi-${partIndex}`, sources)}
        </strong>,
      )
      cursor = end + delimiter.length
      continue
    }

    const startsWithEm = text[cursor] === "*" || text[cursor] === "_"
    if (startsWithEm) {
      const delimiter = text[cursor]
      const end = text.indexOf(delimiter, cursor + 1)
      if (end === -1) {
        pushText(text.slice(cursor))
        break
      }
      const inner = text.slice(cursor + 1, end)
      nodes.push(
        <em key={`${keyPrefix}-em-${partIndex++}`}>
          {renderInline(inner, `${keyPrefix}-emi-${partIndex}`, sources)}
        </em>,
      )
      cursor = end + 1
      continue
    }

    pushText(text[cursor])
    cursor += 1
  }

  return nodes
}

function renderBlocks(
  blocks: Block[],
  keyPrefix: string,
  sources?: CitationSource[],
  options?: { appendFallbackChip?: boolean },
): ReactNode {
  return blocks.map((block, idx) => {
    const k = `${keyPrefix}-b-${idx}`
    const shouldAppendFallback = !!options?.appendFallbackChip && idx === blocks.length - 1
    const fallbackChip =
      shouldAppendFallback && sources && sources.length > 0 ? (
        <InlineCitationChip sources={sources} />
      ) : null

    switch (block.type) {
      case "heading": {
        const content = renderInline(block.text, `${k}-h`, sources)
        // h1: Display title - largest
        if (block.level === 1)
          return (
            <h1 key={k} className="mt-6 mb-2 text-2xl font-bold tracking-tight text-foreground">
              {content}
              {fallbackChip}
            </h1>
          )
        // h2: Section heading - dominant, border-t divider + big spacing to separate sections
        if (block.level === 2)
          return (
            <h2 key={k} className="mt-10 pt-6 mb-1 border-t border-border/40 text-xl font-bold tracking-tight text-foreground first:mt-0 first:border-t-0 first:pt-0">
              {content}
              {fallbackChip}
            </h2>
          )
        // h3: Sub-section heading
        if (block.level === 3)
          return (
            <h3 key={k} className="mt-6 mb-1 text-lg font-semibold tracking-tight text-foreground">
              {content}
              {fallbackChip}
            </h3>
          )
        // h4+: Minor heading
        return (
          <h4 key={k} className="mt-4 mb-1 text-base font-semibold tracking-tight text-foreground">
            {content}
            {fallbackChip}
          </h4>
        )
      }
      case "paragraph": {
        const lines = block.lines
        return (
          <p key={k} className="mb-3 leading-relaxed text-foreground [overflow-wrap:anywhere] break-words">
            {lines.map((line, lineIdx) => (
              <Fragment key={`${k}-p-${lineIdx}`}>
                {renderInline(line, `${k}-pi-${lineIdx}`, sources)}
                {lineIdx === lines.length - 1 ? fallbackChip : null}
                {lineIdx < lines.length - 1 ? <br /> : null}
              </Fragment>
            ))}
          </p>
        )
      }
      case "ul":
        return (
          <ul key={k} className="list-disc pl-6 mb-3 space-y-1 text-foreground [overflow-wrap:anywhere] break-words">
            {block.items.map((item, itemIdx) => (
              <li key={`${k}-li-${itemIdx}`} className="leading-relaxed [overflow-wrap:anywhere] break-words">
                {renderInline(item.text, `${k}-uli-${itemIdx}`, sources)}
                {item.children.length > 0
                  ? renderBlocks(item.children, `${k}-ulc-${itemIdx}`, sources)
                  : null}
                {itemIdx === block.items.length - 1 && item.children.length === 0 ? fallbackChip : null}
              </li>
            ))}
          </ul>
        )
      case "ol":
        return (
          <ol key={k} className="mb-3 space-y-2 text-foreground [overflow-wrap:anywhere] break-words">
            {block.items.map((item, itemIdx) => (
              <li key={`${k}-li-${itemIdx}`} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-2 leading-relaxed [overflow-wrap:anywhere] break-words">
                <span className="pt-[1px] text-right font-mono tabular-nums text-muted-foreground">
                  {item.number}.
                </span>
                <div className="min-w-0 [overflow-wrap:anywhere] break-words">
                  {item.lines.map((line, lineIdx) => (
                    <Fragment key={`${k}-ol-line-${itemIdx}-${lineIdx}`}>
                      {renderInline(line, `${k}-oli-${itemIdx}-${lineIdx}`, sources)}
                      {itemIdx === block.items.length - 1 && lineIdx === item.lines.length - 1 && item.children.length === 0 ? fallbackChip : null}
                      {lineIdx < item.lines.length - 1 ? <br /> : null}
                    </Fragment>
                  ))}
                  {item.children.length > 0
                    ? renderBlocks(item.children, `${k}-olc-${itemIdx}`, sources)
                    : null}
                </div>
              </li>
            ))}
          </ol>
        )
      case "outline":
        return (
          <ol key={k} className="mb-3 space-y-2 text-foreground [overflow-wrap:anywhere] break-words">
            {block.items.map((item, itemIdx) => (
              <li
                key={`${k}-oli-${itemIdx}`}
                className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-2 leading-relaxed"
              >
                <span className="pt-[1px] text-right font-mono tabular-nums text-muted-foreground">
                  {block.useOriginalNumbers ? item.number : itemIdx + 1}.
                </span>
                <div className="min-w-0 [overflow-wrap:anywhere] break-words">
                  <div className="font-semibold text-foreground">
                    {renderInline(item.title, `${k}-ot-${itemIdx}`, sources)}
                    {item.children.length === 0 && itemIdx === block.items.length - 1 ? fallbackChip : null}
                  </div>
                  {item.children.length > 0 ? (
                    <div className="mt-2 pl-4 space-y-2">
                      {renderBlocks(item.children, `${k}-oc-${itemIdx}`, sources, {
                        appendFallbackChip: shouldAppendFallback && itemIdx === block.items.length - 1,
                      })}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )
      case "code":
        if (block.language === "mermaid") {
          return (
            <Fragment key={k}>
              <MermaidRenderer code={block.code} />
              {fallbackChip ? <div className="mt-2">{fallbackChip}</div> : null}
            </Fragment>
          )
        }
        return (
          <Fragment key={k}>
            <pre className="my-2 overflow-x-auto rounded-action bg-background/50 p-3 text-xs leading-relaxed">
              <code>{block.code}</code>
            </pre>
            {fallbackChip ? <div className="mt-2">{fallbackChip}</div> : null}
          </Fragment>
        )
      case "blockquote": {
        const inner = parseBlocks(block.lines.join("\n"))
        return (
          <blockquote key={k} className="border-l-2 border-border pl-3 my-2 opacity-90 space-y-2">
            {renderBlocks(groupOutlineLists(inner), `${k}-q`, sources, {
              appendFallbackChip: shouldAppendFallback,
            })}
          </blockquote>
        )
      }
      case "table":
        return (
          <div key={k} className="my-3 overflow-x-auto">
            <table className="w-full border-collapse rounded-action border border-border text-sm">
              <thead>
                <tr className="bg-muted">
                  {block.headers.map((header, hIdx) => (
                    <th
                      key={`${k}-th-${hIdx}`}
                      className="border-b border-border px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                      style={{ textAlign: block.alignments[hIdx] ?? "left" }}
                    >
                      {renderInline(header, `${k}-th-${hIdx}`, sources)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rIdx) => (
                  <tr key={`${k}-tr-${rIdx}`} className="border-b border-border/50 last:border-b-0">
                    {row.map((cell, cIdx) => (
                      <td
                        key={`${k}-td-${rIdx}-${cIdx}`}
                        className="px-3 py-2 font-mono text-sm text-foreground"
                        style={{ textAlign: block.alignments[cIdx] ?? "left" }}
                      >
                        {renderInline(cell, `${k}-td-${rIdx}-${cIdx}`, sources)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {fallbackChip ? <div className="mt-2">{fallbackChip}</div> : null}
          </div>
        )
      case "hr":
        return (
          <Fragment key={k}>
            <hr className="my-3 border-border/50" />
            {fallbackChip ? <div className="mt-2">{fallbackChip}</div> : null}
          </Fragment>
        )
    }
  })
}

export function MarkdownRenderer({ markdown, className, sources }: MarkdownRendererProps) {
  const blocks = groupOutlineLists(parseBlocks(markdown))
  const hasCitationMarkers = /\[\d+(?:\s*,\s*\d+)*\]/.test(markdown)
  const shouldAppendFallbackChip = !!sources && sources.length > 0 && !hasCitationMarkers
  return (
    <div className={`[overflow-wrap:anywhere] break-words ${className ?? ""}`}>
      {renderBlocks(blocks, "md", sources, { appendFallbackChip: shouldAppendFallbackChip })}
    </div>
  )
}

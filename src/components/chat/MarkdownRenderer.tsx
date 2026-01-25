"use client"

import { Fragment, type ReactNode } from "react"
import { InlineCitationChip } from "./InlineCitationChip"

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
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: { number: number; text: string }[] }
  | { type: "outline"; items: { number: number; title: string; children: Block[] }[]; useOriginalNumbers: boolean }
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
  const trimmed = line.trimStart()
  if (!(trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("+"))) return null
  const rest = trimmed.slice(1)
  if (!rest.startsWith(" ")) return null
  return rest.trim()
}

function isOrderedItem(line: string) {
  const trimmed = line.trimStart()
  let i = 0
  while (i < trimmed.length && trimmed[i] >= "0" && trimmed[i] <= "9") i += 1
  if (i === 0) return null
  const number = Number(trimmed.slice(0, i))
  if (!Number.isFinite(number)) return null
  if (!trimmed.slice(i).startsWith(". ")) return null
  return { number, text: trimmed.slice(i + 2).trim() }
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
      const items: string[] = []
      while (i < lines.length) {
        const item = isUnorderedItem(lines[i])
        if (item === null) break
        items.push(item)
        i += 1
      }
      blocks.push({ type: "ul", items })
      continue
    }

    const olItem = isOrderedItem(line)
    if (olItem !== null) {
      const items: { number: number; text: string }[] = []
      while (i < lines.length) {
        const item = isOrderedItem(lines[i])
        if (item === null) break
        items.push(item)
        i += 1
      }
      blocks.push({ type: "ol", items })
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
      paragraphLines.push(cur)
      i += 1
    }
    blocks.push({ type: "paragraph", lines: paragraphLines })
  }

  return blocks
}

function isOutlineHeadingCandidate(block: Block): block is { type: "ol"; items: { number: number; text: string }[] } {
  return block.type === "ol" && block.items.length === 1
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
      const heading = (blocks[j] as { type: "ol"; items: { number: number; text: string }[] }).items[0]
      j += 1
      const children: Block[] = []
      while (j < blocks.length && !isOutlineHeadingCandidate(blocks[j])) {
        children.push(blocks[j])
        j += 1
      }
      items.push({
        number: heading.number,
        title: heading.text,
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

function renderInline(text: string, keyPrefix: string, sources?: CitationSource[]): ReactNode[] {
  const nodes: ReactNode[] = []
  let cursor = 0
  let partIndex = 0

  const pushText = (value: string) => {
    if (!value) return
    nodes.push(<Fragment key={`${keyPrefix}-t-${partIndex++}`}>{value}</Fragment>)
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
          className="rounded bg-background/50 px-1 py-0.5 font-mono text-[0.85em]"
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
            className="underline underline-offset-2 hover:opacity-80 break-words"
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
        <strong key={`${keyPrefix}-strong-${partIndex++}`}>
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
            <h1 key={k} className="mt-6 mb-2 text-2xl font-bold text-foreground">
              {content}
              {fallbackChip}
            </h1>
          )
        // h2: Section heading - dominant, big top margin to separate sections
        if (block.level === 2)
          return (
            <h2 key={k} className="mt-8 mb-1 text-xl font-bold text-foreground first:mt-0">
              {content}
              {fallbackChip}
            </h2>
          )
        // h3: Sub-section heading
        if (block.level === 3)
          return (
            <h3 key={k} className="mt-5 mb-1 text-lg font-semibold text-foreground">
              {content}
              {fallbackChip}
            </h3>
          )
        // h4+: Minor heading
        return (
          <h4 key={k} className="mt-4 mb-1 text-base font-semibold text-foreground">
            {content}
            {fallbackChip}
          </h4>
        )
      }
      case "paragraph": {
        const lines = block.lines
        return (
          <p key={k} className="mb-3 leading-relaxed text-foreground">
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
          <ul key={k} className="list-disc pl-6 mb-3 space-y-1 text-foreground">
            {block.items.map((item, itemIdx) => (
              <li key={`${k}-li-${itemIdx}`} className="leading-relaxed">
                {renderInline(item, `${k}-uli-${itemIdx}`, sources)}
                {itemIdx === block.items.length - 1 ? fallbackChip : null}
              </li>
            ))}
          </ul>
        )
      case "ol":
        return (
          <ol key={k} className="list-decimal pl-6 mb-3 space-y-1 text-foreground">
            {block.items.map((item, itemIdx) => (
              <li key={`${k}-li-${itemIdx}`} className="leading-relaxed">
                {renderInline(item.text, `${k}-oli-${itemIdx}`, sources)}
                {itemIdx === block.items.length - 1 ? fallbackChip : null}
              </li>
            ))}
          </ol>
        )
      case "outline":
        return (
          <ol key={k} className="list-decimal pl-6 mb-3 space-y-2 text-foreground">
            {block.items.map((item, itemIdx) => (
              <li
                key={`${k}-oli-${itemIdx}`}
                className="leading-relaxed"
                value={block.useOriginalNumbers ? item.number : undefined}
              >
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
              </li>
            ))}
          </ol>
        )
      case "code":
        return (
          <Fragment key={k}>
            <pre className="my-2 overflow-x-auto rounded-md bg-background/50 p-3 text-xs leading-relaxed">
              <code>{block.code}</code>
            </pre>
            {fallbackChip ? <div className="mt-2">{fallbackChip}</div> : null}
          </Fragment>
        )
      case "blockquote": {
        const inner = parseBlocks(block.lines.join("\n"))
        return (
          <blockquote key={k} className="border-l-2 pl-3 my-2 opacity-90 space-y-2">
            {renderBlocks(groupOutlineLists(inner), `${k}-q`, sources, {
              appendFallbackChip: shouldAppendFallback,
            })}
          </blockquote>
        )
      }
      case "hr":
        return (
          <Fragment key={k}>
            <hr className="my-3 border-muted-foreground/20" />
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
    <div className={className}>
      {renderBlocks(blocks, "md", sources, { appendFallbackChip: shouldAppendFallbackChip })}
    </div>
  )
}

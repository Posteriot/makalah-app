import { NavArrowRight, NavArrowLeft } from "iconoir-react"
import { cn } from "@/lib/utils"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { SectionBadge } from "@/components/ui/section-badge"
import { RichTextRenderer } from "@/components/marketing/RichTextRenderer"
import type { DocumentationSection } from "./types"
import { getIcon, renderInline } from "./utils"

type DocArticleProps = {
  activeContent: DocumentationSection | null
  previousSection: DocumentationSection | null
  nextSection: DocumentationSection | null
  nextStepSections: DocumentationSection[]
  onSelectSection: (sectionId: string) => void
}

type ContentBlock = DocumentationSection["blocks"][number]
type SectionBlock = Extract<ContentBlock, { type: "section" }>
type NonSectionBlock = Exclude<ContentBlock, { type: "section" }>

type ContentBlockGroup =
  | {
      type: "sections"
      items: Array<{
        block: SectionBlock
        index: number
      }>
    }
  | {
      type: "block"
      block: NonSectionBlock
      index: number
    }

const isNextStepsBlock = (block: DocumentationSection["blocks"][number]) =>
  block.type === "section" &&
  /^(ke mana setelah ini\??|selanjutnya)$/i.test(block.title.trim())

const getTldrText = (content: DocumentationSection | null) => {
  if (!content) return null
  if (content.summary?.trim()) return content.summary.trim()

  for (const block of content.blocks) {
    if (block.type === "section") {
      if (block.paragraphs?.[0]?.trim()) return block.paragraphs[0].trim()
      if (block.description?.trim()) return block.description.trim()
      if (block.list?.items[0]?.text?.trim()) return block.list.items[0].text.trim()
      continue
    }

    if (block.type === "infoCard") {
      if (block.description?.trim()) return block.description.trim()
      if (block.items[0]?.trim()) return block.items[0].trim()
      continue
    }

    if (block.type === "ctaCards" && block.items[0]?.description?.trim()) {
      return block.items[0].description.trim()
    }
  }

  return null
}

export function DocArticle({
  activeContent,
  previousSection,
  nextSection,
  nextStepSections,
  onSelectSection,
}: DocArticleProps) {
  const tldrText = getTldrText(activeContent)
  const contentBlocks = activeContent
    ? activeContent.blocks.filter((block) => !isNextStepsBlock(block))
    : []
  const groupedContentBlocks = contentBlocks.reduce<ContentBlockGroup[]>((groups, block, index) => {
    if (block.type === "section") {
      const lastGroup = groups[groups.length - 1]
      if (lastGroup?.type === "sections") {
        lastGroup.items.push({ block, index })
      } else {
        groups.push({
          type: "sections",
          items: [{ block, index }],
        })
      }
      return groups
    }

    groups.push({
      type: "block",
      block,
      index,
    })
    return groups
  }, [])

  return (
    <main>
      <div className="mx-auto w-full max-w-4xl rounded-shell border-hairline bg-card/90 px-5 py-6 backdrop-blur-[1px] dark:bg-slate-900 md:px-8">
        {activeContent ? (
          <article className="space-y-8">
            <div className="space-y-4">
              <SectionBadge>{activeContent.group}</SectionBadge>
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = getIcon(activeContent.headerIcon ?? activeContent.icon)
                  return Icon ? <Icon className="h-6 w-6 text-foreground" /> : null
                })()}
                <h1 className="text-narrative text-2xl font-medium tracking-tight text-foreground md:text-3xl">
                  {activeContent.title}
                </h1>
              </div>
              {tldrText && (
                <section
                  aria-label="Ringkasan cepat konten"
                  className="relative overflow-hidden rounded-shell border-main border border-sky-300/45 bg-sky-400/10 px-5 py-4 dark:border-sky-200/35 dark:bg-sky-400/20"
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-sky-300 to-sky-500 dark:from-sky-200 dark:to-sky-400"
                  />
                  <p className="text-narrative relative text-base leading-relaxed text-slate-700 dark:text-slate-100">
                    {tldrText}
                  </p>
                </section>
              )}
            </div>

            <div className="space-y-6">
              {groupedContentBlocks.map((group) => {
                if (group.type === "sections") {
                  return (
                    <Accordion
                      key={`sections-${group.items[0]?.index ?? "empty"}`}
                      type="single"
                      collapsible
                      className="space-y-6"
                    >
                      {group.items.map(({ block, index }) => (
                        <AccordionItem
                          key={`${block.type}-${index}`}
                          value={`section-${index}`}
                          className="rounded-shell border-main border border-border bg-card transition-colors duration-200 hover:bg-muted/40 last:border-b"
                        >
                          <AccordionTrigger className="text-interface px-5 py-4 font-mono text-sm font-medium text-slate-800 hover:no-underline dark:text-foreground">
                            {block.title}
                          </AccordionTrigger>
                          <AccordionContent className="px-5 pt-0 pb-5">
                            {block.richContent ? (
                              <RichTextRenderer content={block.richContent} />
                            ) : (
                              <div className="space-y-3">
                                {block.description && (
                                  <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
                                    {block.description}
                                  </p>
                                )}
                                {block.paragraphs?.map((paragraph, paragraphIndex) => (
                                  <p
                                    key={`${block.title}-p-${paragraphIndex}`}
                                    className="text-narrative text-sm leading-relaxed text-muted-foreground"
                                  >
                                    {renderInline(paragraph)}
                                  </p>
                                ))}
                                {block.list && (
                                  <ol
                                    className={cn(
                                      "ml-4 space-y-2 pl-6 text-sm text-muted-foreground",
                                      block.list.variant === "bullet"
                                        ? "list-disc"
                                        : "list-decimal"
                                    )}
                                  >
                                    {block.list.items.map((item, itemIndex) => (
                                      <li key={`${block.title}-item-${itemIndex}`}>
                                        <div>{renderInline(item.text)}</div>
                                        {item.subItems && item.subItems.length > 0 && (
                                          <ul className="mt-2 ml-2 list-disc space-y-1 pl-6 text-xs text-muted-foreground">
                                            {item.subItems.map((subItem, subIndex) => (
                                              <li key={`${block.title}-sub-${subIndex}`}>
                                                {renderInline(subItem)}
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )
                }

                const { block, index } = group

                if (block.type === "infoCard") {
                  return (
                    <div
                      key={`${block.type}-${index}`}
                      className="rounded-shell border-main border border-info/20 bg-info/5"
                    >
                      <div className="border-l-4 border-info px-5 py-4">
                        <h2 className="text-interface text-base font-medium text-info">
                          {block.title}
                        </h2>
                        {block.description && (
                          <p className="text-narrative mt-1 text-sm text-muted-foreground">
                            {block.description}
                          </p>
                        )}
                      </div>
                      <div className="px-5 pb-5 pt-4">
                        <ul className="space-y-2 pl-2 text-narrative text-sm text-muted-foreground">
                          {block.items.map((item, itemIndex) => (
                            <li key={`${block.title}-${itemIndex}`} className="relative pl-6">
                              <span className="absolute left-1 top-1 text-info">•</span>
                              {renderInline(item)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )
                }

                if (block.type === "ctaCards") {
                  return (
                    <div key={`${block.type}-${index}`} className="grid gap-4 sm:grid-cols-2">
                      {block.items.map((item) => {
                        const Icon = getIcon(item.icon)
                        return (
                          <button
                            key={item.title}
                            type="button"
                            onClick={() => onSelectSection(item.targetSection)}
                            className="group flex h-full w-full flex-col rounded-shell border-main border bg-card px-5 py-4 text-left transition-colors duration-200 hover:bg-muted/40"
                          >
                            <div className="mb-4">
                              {Icon && <Icon className="mb-3 h-7 w-7 text-foreground" />}
                              <h3 className="text-interface text-base font-medium text-foreground">
                                {item.title}
                              </h3>
                              <p className="text-narrative mt-1 text-sm text-muted-foreground">
                                {item.description}
                              </p>
                            </div>
                            <span className="text-signal mt-auto inline-flex w-fit items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground transition-colors group-hover:text-foreground">
                              {item.ctaText}
                              <NavArrowRight className="icon-interface" />
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )
                }
              })}
            </div>

            {nextStepSections.length > 0 && (
              <section className="space-y-3 pt-6">
                <h2 className="text-interface text-base font-medium text-foreground">Selanjutnya</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {nextStepSections.map((section) => {
                    const Icon = getIcon(section.icon)
                    return (
                      <button
                        key={section.slug}
                        type="button"
                        onClick={() => onSelectSection(section.slug)}
                        className="group relative flex h-full w-full flex-col overflow-hidden rounded-shell border-main border bg-card px-5 py-4 text-left transition-colors duration-200 hover:bg-muted/40"
                      >
                        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-amber-600" />
                        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground">
                          {Icon && <Icon className="h-4 w-4 text-foreground" />}
                          <span className="text-signal">{section.group}</span>
                        </div>
                        <h3 className="text-interface text-base font-medium text-foreground">
                          {section.title}
                        </h3>
                        <p className="text-narrative mt-1 text-sm leading-relaxed text-muted-foreground">
                          {section.summary ?? "Buka topik ini untuk melanjutkan dokumentasi."}
                        </p>
                        <span className="text-signal mt-4 inline-flex w-fit items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground transition-colors group-hover:text-foreground">
                          Buka Topik
                          <NavArrowRight className="icon-interface" />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            <div className="flex items-center justify-between border-t border-hairline pt-4 md:hidden">
              <button
                type="button"
                className={cn(
                  "text-signal inline-flex items-center gap-2 rounded-action border-main border px-3 py-2 text-[10px]",
                  previousSection
                    ? "border-border text-foreground"
                    : "cursor-not-allowed border-border/50 text-muted-foreground"
                )}
                onClick={() =>
                  previousSection && onSelectSection(previousSection.slug)
                }
                disabled={!previousSection}
              >
                <NavArrowLeft className="h-4 w-4" />
                Kembali
              </button>
              <button
                type="button"
                className={cn(
                  "text-signal inline-flex items-center gap-2 rounded-action border-main border px-3 py-2 text-[10px]",
                  nextSection
                    ? "border-border text-foreground"
                    : "cursor-not-allowed border-border/50 text-muted-foreground"
                )}
                onClick={() => nextSection && onSelectSection(nextSection.slug)}
                disabled={!nextSection}
              >
                Lanjut
                <NavArrowRight className="h-4 w-4" />
              </button>
            </div>
          </article>
        ) : (
          <div className="rounded-shell border-main border border-border bg-card/60 p-6 text-center">
            <p className="text-interface text-xs uppercase tracking-widest text-muted-foreground">
              Dokumentasi sedang dimuat.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

import { NavArrowRight, NavArrowLeft } from "iconoir-react"
import { cn } from "@/lib/utils"
import { SectionBadge } from "@/components/ui/section-badge"
import type { DocumentationSection } from "./types"
import { getIcon, renderInline } from "./utils"

type DocArticleProps = {
  activeContent: DocumentationSection | null
  previousSection: DocumentationSection | null
  nextSection: DocumentationSection | null
  onSelectSection: (sectionId: string) => void
}

export function DocArticle({
  activeContent,
  previousSection,
  nextSection,
  onSelectSection,
}: DocArticleProps) {
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
              {activeContent.summary && (
                <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
                  {activeContent.summary}
                </p>
              )}
            </div>

            <div className="space-y-6">
              {activeContent.blocks.map((block, index) => {
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
                        <ul className="space-y-2 text-narrative text-sm text-muted-foreground">
                          {block.items.map((item, itemIndex) => (
                            <li key={`${block.title}-${itemIndex}`} className="relative pl-4">
                              <span className="absolute left-0 top-1 text-info">•</span>
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
                    <div
                      key={`${block.type}-${index}`}
                      className="grid gap-4 sm:grid-cols-2"
                    >
                      {block.items.map((item) => {
                        const Icon = getIcon(item.icon)
                        return (
                          <div
                            key={item.title}
                            className="group flex h-full flex-col rounded-shell border border-main bg-card px-5 py-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-slate-400 hover:bg-[color:var(--slate-100)] dark:hover:border-slate-500 dark:hover:bg-[color:var(--slate-800)]"
                          >
                            <div className="mb-4">
                              {Icon && (
                                <Icon className="mb-3 h-7 w-7 text-foreground" />
                              )}
                              <h3 className="text-interface text-base font-medium text-foreground">
                                {item.title}
                              </h3>
                              <p className="text-narrative mt-1 text-sm text-muted-foreground">
                                {item.description}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSelectSection(item.targetSection)}
                              className="text-signal mt-auto inline-flex w-fit cursor-pointer items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground transition-colors hover:text-foreground hover:underline"
                            >
                              {item.ctaText}
                              <NavArrowRight className="icon-interface" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )
                }

                return (
                  <section key={`${block.type}-${index}`} className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">
                      {block.title}
                    </h2>
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
                          "space-y-2 text-sm text-muted-foreground",
                          block.list.variant === "bullet"
                            ? "list-disc pl-5"
                            : "list-decimal pl-5"
                        )}
                      >
                        {block.list.items.map((item, itemIndex) => (
                          <li key={`${block.title}-item-${itemIndex}`}>
                            <div>{renderInline(item.text)}</div>
                            {item.subItems && item.subItems.length > 0 && (
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
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
                  </section>
                )
              })}
            </div>

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

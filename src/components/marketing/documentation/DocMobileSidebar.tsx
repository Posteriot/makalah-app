import { Search, NavArrowRight } from "iconoir-react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { NavigationGroup, SearchRecord } from "./types"
import {
  getIcon,
  tokensFromText,
  highlightSnippet,
  makeSnippetAdvanced,
} from "./utils"

type DocMobileSidebarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  query: string
  onQueryChange: (value: string) => void
  onSelectSection: (sectionId: string) => void
  activeSection: string | null
  navigationGroups: NavigationGroup[]
  results: SearchRecord[]
}

export function DocMobileSidebar({
  open,
  onOpenChange,
  query,
  onQueryChange,
  onSelectSection,
  activeSection,
  navigationGroups,
  results,
}: DocMobileSidebarProps) {
  const handleSelect = (sectionId: string) => {
    onSelectSection(sectionId)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <div className="border-b border-border px-5 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && results.length > 0) {
                  handleSelect(results[0].id)
                }
              }}
              placeholder="Cari dokumentasi..."
              className="text-interface focus-ring h-10 w-full rounded-action border-main border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-info focus:outline-none focus:ring-2 focus:ring-info/20"
            />
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          {navigationGroups.map((group) => (
            <div key={group.title} className="mb-6">
              <h3 className="text-signal text-[10px] font-bold text-muted-foreground">
                {group.title}
              </h3>
              <ul className="mt-3 space-y-1">
                {group.items.map((item) => {
                  const Icon = getIcon(item.icon)
                  const isActive = activeSection === item.slug
                  return (
                    <li key={item.slug}>
                      <button
                        type="button"
                        onClick={() => handleSelect(item.slug)}
                        className={cn(
                          "relative flex w-full items-center gap-3 rounded-action px-3 py-2 text-sm transition",
                          isActive
                            ? "bg-amber-500/5 text-amber-500"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full bg-amber-500" />
                        )}
                        {Icon && <Icon className="h-4 w-4 shrink-0" />}
                        <span className="text-interface flex-1 truncate text-left">
                          {item.title}
                        </span>
                        {isActive && <NavArrowRight className="h-4 w-4 shrink-0" />}
                      </button>
                    </li>
                  )
                })}
              </ul>

              {query.length > 0 && (
                <div className="mt-4 rounded-action border-main border border-border bg-card/60">
                  <div className="text-signal px-3 py-2 text-[10px] font-bold text-muted-foreground">
                    Hasil pencarian
                  </div>
                  {results.length === 0 ? (
                    <div className="px-3 pb-3 text-xs text-muted-foreground">
                      Tidak ada hasil
                    </div>
                  ) : (
                    <ul className="max-h-48 overflow-auto px-2 pb-3">
                      {results.map((result) => {
                        // Safe: highlightSnippet escapes HTML via escapeHtml() before injecting <mark> tags.
                        // Content sourced from server-side search index, not user input.
                        const snippetHtml = highlightSnippet(
                          makeSnippetAdvanced(result.text, tokensFromText(query), query),
                          tokensFromText(query)
                        )
                        return (
                          <li key={result.id}>
                            <button
                              type="button"
                              onClick={() => handleSelect(result.id)}
                              className={cn(
                                "w-full rounded-action px-2 py-2 text-left text-xs transition hover:bg-muted/50",
                                activeSection === result.id && "bg-muted/70"
                              )}
                            >
                              <div className="text-interface font-medium text-foreground">{result.title}</div>
                              <div
                                className="line-clamp-2 text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: snippetHtml }}
                              />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

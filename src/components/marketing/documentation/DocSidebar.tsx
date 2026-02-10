import { Search, NavArrowRight } from "iconoir-react"
import { cn } from "@/lib/utils"
import type { NavigationGroup, SearchRecord } from "./types"
import {
  getIcon,
  tokensFromText,
  highlightSnippet,
  makeSnippetAdvanced,
} from "./utils"

type DocSidebarProps = {
  query: string
  onQueryChange: (value: string) => void
  onSelectSection: (sectionId: string) => void
  activeSection: string | null
  navigationGroups: NavigationGroup[]
  results: SearchRecord[]
}

export function DocSidebar({
  query,
  onQueryChange,
  onSelectSection,
  activeSection,
  navigationGroups,
  results,
}: DocSidebarProps) {
  return (
    <div>
      <div className="mb-6 rounded-action bg-background/70 px-3 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results.length > 0) {
                onSelectSection(results[0].id)
              }
            }}
            placeholder="Cari dokumentasi..."
            className="blog-neutral-input text-interface h-10 w-full rounded-action border-main border border-slate-300 bg-background pl-10 pr-3 text-xs text-foreground placeholder:text-muted-foreground dark:border-slate-600"
          />
        </div>
        {query.length > 0 && (
          <div className="mt-2 rounded-action border-main border border-border bg-card/70">
            {results.length === 0 ? (
              <div className="text-interface px-3 py-2 text-xs text-muted-foreground">
                Tidak ada hasil yang cocok
              </div>
            ) : (
              <ul className="max-h-56 overflow-auto">
                {results.map((result) => {
                  // highlightSnippet escapes HTML via escapeHtml() before injecting <mark> tags
                  const snippetHtml = highlightSnippet(
                    makeSnippetAdvanced(result.text, tokensFromText(query), query),
                    tokensFromText(query)
                  )
                  return (
                    <li key={result.id}>
                      <button
                        type="button"
                        onClick={() => onSelectSection(result.id)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-xs transition hover:bg-muted/50",
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
            <div className="text-interface border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
              Tekan Enter untuk membuka hasil teratas
            </div>
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-6">
        {navigationGroups.map((group) => (
          <div key={group.title}>
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
                      onClick={() => onSelectSection(item.slug)}
                      className={cn(
                        "text-interface flex w-full items-center gap-3 rounded-action px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100"
                          : "text-muted-foreground hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-500 dark:hover:text-slate-50"
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4 shrink-0" />}
                      <span className="flex-1 truncate text-left">
                        {item.title}
                      </span>
                      {isActive && <NavArrowRight className="h-4 w-4 shrink-0" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )
}

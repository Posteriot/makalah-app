"use client"

import * as React from "react"
import { NavArrowDown } from "iconoir-react"

import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type AccordionBadgeVariant = "default" | "secondary"

export interface AccordionItemData {
  /** Unique identifier for the item */
  id: string
  /** Anchor ID for URL hash navigation (e.g., "bergabung-dengan-tim") */
  anchorId?: string
  /** Title displayed in the trigger */
  title: string
  /** Content displayed when expanded */
  content: React.ReactNode
  /** Optional icon component */
  icon?: React.ReactNode
  /** Optional badge label */
  badgeLabel?: string
  /** Badge variant: "default" (success/green) or "secondary" (muted) */
  badgeVariant?: AccordionBadgeVariant
}

export interface AccordionAboutProps {
  /** Array of accordion items */
  items: AccordionItemData[]
  /** ID of the item to open by default */
  defaultOpen?: string | null
  /** Additional class name for the wrapper */
  className?: string
  /** Optional override for trigger title text styling */
  titleClassName?: string
  /** Optional override for content text styling */
  contentClassName?: string
  /** Optional override for chevron styling */
  chevronClassName?: string
  /** Callback when an item is opened/closed */
  onOpenChange?: (openId: string | null) => void
}

// =============================================================================
// ACCORDION ITEM COMPONENT
// =============================================================================

interface AccordionItemProps {
  item: AccordionItemData
  isOpen: boolean
  onToggle: () => void
  titleClassName?: string
  contentClassName?: string
  chevronClassName?: string
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ item, isOpen, onToggle, titleClassName, contentClassName, chevronClassName }, ref) => {
    return (
      <Collapsible
        open={isOpen}
        onOpenChange={onToggle}
        asChild
      >
        <div
          ref={ref}
          data-anchor-id={item.anchorId}
          id={item.anchorId}
          className="border-b border-hairline"
        >
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center justify-between p-comfort",
                "rounded-action hover-slash overflow-hidden",
                "bg-transparent text-left text-base",
                "text-foreground transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
              aria-expanded={isOpen}
            >
              <div className="flex flex-1 items-center gap-3">
                {/* Optional Icon */}
                {item.icon && (
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center",
                      "rounded-action bg-[color:var(--amber-500)]/10"
                    )}
                  >
                    <span className="text-[color:var(--amber-500)] [&>svg]:h-4 [&>svg]:w-4">
                      {item.icon}
                    </span>
                  </div>
                )}

                {/* Title */}
                <span
                  className={cn(
                    "text-interface flex-1 font-bold tracking-tight",
                    titleClassName
                  )}
                >
                  {item.title}
                </span>

                {/* Optional Badge */}
                {item.badgeLabel && (
                  <Badge
                    variant={item.badgeVariant === "secondary" ? "secondary" : "default"}
                    className={cn(
                      "text-signal ml-auto mr-3 shrink-0 rounded-badge text-[10px] font-bold tracking-widest",
                      item.badgeVariant !== "secondary" &&
                        "bg-[color:var(--emerald-500)] text-[color:var(--slate-950)]"
                    )}
                  >
                    {item.badgeLabel}
                  </Badge>
                )}
              </div>

              {/* Chevron */}
              <NavArrowDown
                className={cn(
                  "h-4 w-4 shrink-0 text-[color:var(--amber-500)] transition-transform duration-300",
                  chevronClassName,
                  isOpen && "rotate-180"
                )}
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent
            className={cn(
              "overflow-hidden",
              "data-[state=open]:animate-accordion-down",
              "data-[state=closed]:animate-accordion-up"
            )}
          >
            <div
              className={cn(
                "text-narrative p-dense pb-4 text-sm leading-relaxed text-muted-foreground",
                contentClassName
              )}
            >
              {item.content}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    )
  }
)
AccordionItem.displayName = "AccordionItem"

// =============================================================================
// MAIN ACCORDION COMPONENT
// =============================================================================

export function AccordionAbout({
  items,
  defaultOpen = null,
  className,
  titleClassName,
  contentClassName,
  chevronClassName,
  onOpenChange,
}: AccordionAboutProps) {
  const [openId, setOpenId] = React.useState<string | null>(defaultOpen)

  // Refs for each item (for anchor scroll)
  const itemRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())

  // Handle anchor scroll on mount
  React.useEffect(() => {
    const hash = window.location.hash.slice(1) // Remove #
    if (hash) {
      const matchingItem = items.find(
        (item) => item.anchorId === hash || item.id === hash
      )
      if (matchingItem) {
        // Open the item
        setOpenId(matchingItem.id)
        onOpenChange?.(matchingItem.id)

        // Scroll to it after a short delay (for animation)
        setTimeout(() => {
          const element = itemRefs.current.get(matchingItem.id)
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        }, 100)
      }
    }
  }, [items, onOpenChange])

  const handleToggle = (itemId: string) => {
    const newOpenId = openId === itemId ? null : itemId
    setOpenId(newOpenId)
    onOpenChange?.(newOpenId)
  }

  const setItemRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      itemRefs.current.set(id, el)
    } else {
      itemRefs.current.delete(id)
    }
  }

  return (
    <div className={cn("rounded-shell border-main border-border border-t bg-card/30", className)}>
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          ref={setItemRef(item.id)}
          item={item}
          isOpen={openId === item.id}
          onToggle={() => handleToggle(item.id)}
          titleClassName={titleClassName}
          contentClassName={contentClassName}
          chevronClassName={chevronClassName}
        />
      ))}
    </div>
  )
}

"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

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
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ item, isOpen, onToggle }, ref) => {
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
          className="border-b border-border"
        >
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center justify-between py-4",
                "bg-transparent text-left text-base font-medium",
                "text-foreground transition-colors duration-200",
                "hover:text-brand focus-visible:outline-none focus-visible:ring-2",
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
                      "rounded-md bg-brand/10"
                    )}
                  >
                    <span className="text-brand [&>svg]:h-4 [&>svg]:w-4">
                      {item.icon}
                    </span>
                  </div>
                )}

                {/* Title */}
                <span className="flex-1">{item.title}</span>

                {/* Optional Badge */}
                {item.badgeLabel && (
                  <Badge
                    variant={item.badgeVariant === "secondary" ? "secondary" : "default"}
                    className={cn(
                      "ml-auto mr-3 shrink-0 text-[10px] uppercase tracking-wide",
                      item.badgeVariant !== "secondary" &&
                        "bg-success text-success-foreground"
                    )}
                  >
                    {item.badgeLabel}
                  </Badge>
                )}
              </div>

              {/* Chevron */}
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
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
            <div className="pb-4 text-sm leading-relaxed text-muted-foreground">
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
    <div className={cn("border-t border-border", className)}>
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          ref={setItemRef(item.id)}
          item={item}
          isOpen={openId === item.id}
          onToggle={() => handleToggle(item.id)}
        />
      ))}
    </div>
  )
}

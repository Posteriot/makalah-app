"use client"

import { Check, StarSolid } from "iconoir-react"
import { useStateValue, useStateStore, type BaseComponentProps } from "@json-render/react"
import { cn } from "@/lib/utils"

interface ChoiceOptionButtonProps {
  optionId: string
  label: string
  recommended?: boolean
  selected?: boolean
  disabled?: boolean
}

export function ChoiceOptionButton({
  props,
}: BaseComponentProps<ChoiceOptionButtonProps>) {
  const selectedOptionId = useStateValue<string | null>("/selection/selectedOptionId")
  const store = useStateStore()
  const isSelected = selectedOptionId === props.optionId
  // Detect recommendation from prop OR from pre-selection (model may set either)
  const isRecommended = props.recommended === true || props.selected === true
  const disabled = props.disabled === true

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        // Toggle directly via state store — works for both old specs (setState action)
        // and new specs (toggleOption action). Bypasses emit("press") to guarantee
        // toggle behavior regardless of what action the spec declares.
        store.set("/selection/selectedOptionId", isSelected ? null : props.optionId)
      }}
      className={cn(
        "w-full rounded-action border bg-[var(--chat-background)] px-3 py-3 text-left transition-colors",
        "focus-ring disabled:cursor-not-allowed disabled:opacity-60",
        isSelected
          ? "border-sky-500/70 bg-sky-500/10"
          : isRecommended
            ? "border-sky-500/40 bg-sky-500/5"
            : "border-[color:var(--chat-border)] hover:bg-[var(--chat-accent)]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--chat-foreground)]">
              {props.label}
            </span>
            {isRecommended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-400">
                <StarSolid className="h-2.5 w-2.5" />
                Rekomendasi
              </span>
            )}
          </div>
        </div>
        <span
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-action border",
            isSelected
              ? "border-sky-500 bg-sky-500 text-white"
              : "border-[color:var(--chat-border)] text-transparent"
          )}
          aria-hidden="true"
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  )
}

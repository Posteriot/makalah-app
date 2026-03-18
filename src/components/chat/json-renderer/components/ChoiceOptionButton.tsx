"use client"

import { Check } from "iconoir-react"
import { useStateValue, type BaseComponentProps } from "@json-render/react"
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
  emit,
}: BaseComponentProps<ChoiceOptionButtonProps>) {
  const selectedOptionId = useStateValue<string>("/selection/selectedOptionId")
  const isSelected = selectedOptionId === props.optionId
  const disabled = props.disabled === true

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => emit("press")}
      className={cn(
        "w-full rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-background)] px-3 py-3 text-left transition-colors",
        "focus-ring disabled:cursor-not-allowed disabled:opacity-60",
        isSelected
          ? "border-sky-500/70 bg-sky-500/10"
          : "hover:bg-[var(--chat-accent)]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 text-sm font-medium text-[var(--chat-foreground)]">
          {props.label}
        </span>
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

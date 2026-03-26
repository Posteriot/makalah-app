"use client"

import { Send } from "iconoir-react"
import type { BaseComponentProps } from "@json-render/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChoiceSubmitButtonProps {
  label: string
  disabled?: boolean
}

export function ChoiceSubmitButton({
  props,
  emit,
}: BaseComponentProps<ChoiceSubmitButtonProps>) {
  const disabled = props.disabled === true

  return (
    <div className="flex items-center justify-end">
      <Button
        type="button"
        size="sm"
        onClick={() => emit("press")}
        disabled={disabled}
        className={cn(
          "h-9 rounded-action px-4",
          disabled
            ? "border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] text-[var(--chat-secondary-foreground)]"
            : "chat-validation-approve-button"
        )}
      >
        <Send className="h-3.5 w-3.5" />
        {props.label}
      </Button>
    </div>
  )
}

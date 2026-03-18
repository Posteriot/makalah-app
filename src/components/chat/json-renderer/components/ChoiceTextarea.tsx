"use client"

import { useBoundProp, type BaseComponentProps } from "@json-render/react"
import { Textarea } from "@/components/ui/textarea"

interface ChoiceTextareaProps {
  label: string
  placeholder?: string | null
  value?: string | Record<string, unknown> | null
  disabled?: boolean
}

export function ChoiceTextarea({
  props,
  bindings,
}: BaseComponentProps<ChoiceTextareaProps>) {
  const textareaId = `json-render-choice-note-${props.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`
  const [value, setValue] = useBoundProp<string | null>(
    typeof props.value === "string" ? props.value : null,
    bindings?.value
  )

  return (
    <div>
      <label
        htmlFor={textareaId}
        className="mb-2 block text-signal text-[10px] text-[var(--chat-muted-foreground)]"
      >
        {props.label}
      </label>
      <Textarea
        id={textareaId}
        value={value ?? ""}
        onChange={(event) => setValue(event.target.value)}
        placeholder={props.placeholder ?? "Tambahkan preferensi kalau perlu"}
        disabled={props.disabled === true}
        className="min-h-24 rounded-action border-[color:var(--chat-border)] bg-[var(--chat-background)] text-sm shadow-none"
      />
    </div>
  )
}

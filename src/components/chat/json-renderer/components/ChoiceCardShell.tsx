"use client"

import type { BaseComponentProps } from "@json-render/react"

interface ChoiceCardShellProps {
  title: string
}

export function ChoiceCardShell({
  props,
  children,
}: BaseComponentProps<ChoiceCardShellProps>) {
  return (
    <section
      className="mt-3 rounded-shell border border-[color:var(--chat-border)] bg-[var(--chat-card)] p-4 shadow-none animate-in fade-in slide-in-from-bottom-2 duration-300"
      data-testid="json-render-choice-card"
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[var(--chat-foreground)]">
          {props.title}
        </h3>
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  )
}

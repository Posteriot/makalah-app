"use client"

import type { ArtifactOrigin } from "@/lib/hooks/useArtifactTabs"
import { Folder, NavArrowRight } from "iconoir-react"
import { cn } from "@/lib/utils"

interface ArtifactOriginRailProps {
  origin?: ArtifactOrigin
  originSessionTitle?: string
  onReturnToPaperRoot?: () => void
  onReturnToPaperSession?: () => void
  onReturnToActivePaperSession?: () => void
}

function RailButton({
  label,
  onClick,
  icon,
}: {
  label: string
  onClick?: () => void
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-8 items-center gap-1 rounded-action px-1.5 py-0.5 text-left text-[11px] font-mono font-medium leading-none",
        "text-sky-700 transition-colors duration-150 dark:text-sky-300",
        "hover:bg-[var(--chat-accent)] hover:text-sky-800 dark:hover:text-sky-200"
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      {label}
    </button>
  )
}

function BackGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 7 5 11l4 4" />
      <path d="M5 11h8.5c3.75 0 5.5 1.75 5.5 5 0 2.15-1.1 3.85-3 5" />
    </svg>
  )
}

function ClosedFolderGlyph() {
  return (
    <Folder
      className="h-[15px] w-[15px] text-sky-500 dark:text-sky-400 [&_path]:fill-current [&_path]:stroke-current"
      aria-hidden="true"
    />
  )
}

function OpenFolderGlyph() {
  return (
    <Folder
      className="h-[15px] w-[15px] text-sky-500 dark:text-sky-400 [&_path]:fill-current [&_path]:stroke-current"
      aria-hidden="true"
    />
  )
}

function RailBackButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-action",
        "text-sky-700 transition-colors duration-150 dark:text-sky-300",
        "hover:bg-[var(--chat-accent)] hover:text-sky-800 dark:hover:text-sky-200"
      )}
      aria-label="Kembali satu langkah"
    >
      <BackGlyph />
    </button>
  )
}

export function ArtifactOriginRail({
  origin,
  originSessionTitle,
  onReturnToPaperRoot,
  onReturnToPaperSession,
  onReturnToActivePaperSession,
}: ArtifactOriginRailProps) {
  if (!origin || origin === "chat") {
    return null
  }

  if (origin === "paper-active-session") {
    return (
      <div className="border-b border-[color:var(--chat-border)] px-4 py-2">
        <div className="flex flex-wrap items-center gap-0.5 text-[11px] font-mono">
          <RailBackButton onClick={onReturnToActivePaperSession} />
          <RailButton
            label="Sesi Paper"
            icon={<ClosedFolderGlyph />}
            onClick={onReturnToActivePaperSession}
          />
          <NavArrowRight className="h-3.5 w-3.5 text-[var(--chat-muted-foreground)]" aria-hidden="true" />
          <RailButton
            label={originSessionTitle ?? "Sesi Aktif"}
            icon={<OpenFolderGlyph />}
            onClick={onReturnToActivePaperSession}
          />
        </div>
      </div>
    )
  }

  if (origin === "paper-session-manager-root") {
    return (
      <div className="border-b border-[color:var(--chat-border)] px-4 py-2">
        <div className="flex flex-wrap items-center gap-0.5 text-[11px] font-mono">
          <RailBackButton onClick={onReturnToPaperRoot} />
          <RailButton
            label="Sesi Paper Lainnya"
            icon={<ClosedFolderGlyph />}
            onClick={onReturnToPaperRoot}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="border-b border-[color:var(--chat-border)] px-4 py-2">
      <div className="flex flex-wrap items-center gap-0.5 text-[11px] font-mono">
        <RailBackButton onClick={onReturnToPaperSession} />
        <RailButton
          label="Sesi Paper Lainnya"
          icon={<ClosedFolderGlyph />}
          onClick={onReturnToPaperRoot}
        />
        <NavArrowRight className="h-3.5 w-3.5 text-[var(--chat-muted-foreground)]" aria-hidden="true" />
        <RailButton
          label={originSessionTitle ?? "Folder Sesi"}
          icon={<OpenFolderGlyph />}
          onClick={onReturnToPaperSession}
        />
      </div>
    </div>
  )
}

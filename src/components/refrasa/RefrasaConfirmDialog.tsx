"use client"

import { useState, useRef, useEffect } from "react"
import {
  ViewColumns2,
  DocMagnifyingGlass,
  WarningTriangle,
  Check,
  Xmark,
  NavArrowDown,
  NavArrowRight,
} from "iconoir-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { RefrasaIssueItem } from "./RefrasaIssueItem"
import type { RefrasaIssue } from "@/lib/refrasa/types"

interface RefrasaConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  originalContent: string
  refrasedText: string
  issues: RefrasaIssue[]
  onApply: () => void
  isApplying?: boolean
}

export function RefrasaConfirmDialog({
  open,
  onOpenChange,
  originalContent,
  refrasedText,
  issues,
  onApply,
  isApplying = false,
}: RefrasaConfirmDialogProps) {
  const [showOriginal, setShowOriginal] = useState(false)
  const [showIssues, setShowIssues] = useState(false)
  const [naturalnessOpen, setNaturalnessOpen] = useState(true)
  const [styleOpen, setStyleOpen] = useState(true)
  const issuesPanelRef = useRef<HTMLDivElement>(null)

  const naturalnessIssues = issues.filter((i) => i.category === "naturalness")
  const styleIssues = issues.filter((i) => i.category === "style")
  const totalIssues = issues.length

  // Close issues panel on outside click or Escape
  useEffect(() => {
    if (!showIssues) return
    const handleClick = (e: MouseEvent) => {
      if (issuesPanelRef.current && !issuesPanelRef.current.contains(e.target as Node)) {
        setShowIssues(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowIssues(false)
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [showIssues])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setShowOriginal(false)
      setShowIssues(false)
    }
  }, [open])

  const iconBtnClass =
    "flex h-8 w-8 items-center justify-center rounded-action text-slate-600 transition-colors hover:bg-slate-200/80 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-slate-100"

  const contentContainerClass =
    "flex-1 overflow-y-auto rounded-sm border border-slate-300/85 bg-slate-50 p-4 scrollbar-thin dark:border-slate-700/70 dark:bg-slate-900"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-[90vw] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden border-slate-300/75 bg-slate-100 p-0 sm:max-w-6xl md:min-h-[60vh] dark:border-slate-700/80 dark:bg-slate-800"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-slate-300/75 px-4 py-3 dark:border-slate-700/80">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Tinjau Hasil Refrasa
            </DialogTitle>

            <div className="flex items-center gap-1.5">
              {/* Compare toggle — desktop only */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowOriginal((v) => !v)}
                    className={cn(
                      iconBtnClass,
                      "hidden md:flex",
                      showOriginal && "bg-slate-200/80 text-slate-900 dark:bg-slate-700/70 dark:text-slate-100"
                    )}
                    aria-label="Bandingkan teks asli"
                  >
                    <ViewColumns2 className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="font-mono text-xs">
                  {showOriginal ? "Sembunyikan teks asli" : "Bandingkan teks asli"}
                </TooltipContent>
              </Tooltip>

              {/* Issues toggle — clickable badge or disabled icon fallback */}
              <div className="relative" ref={issuesPanelRef}>
                {totalIssues > 0 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowIssues((v) => !v)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-badge border px-1.5 py-0.5 text-[10px] font-mono font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                          showIssues
                            ? "border-amber-500/50 bg-amber-500/20 text-amber-600 dark:text-amber-300"
                            : "border-amber-500/35 bg-amber-500/10 text-amber-700 hover:border-amber-500/50 hover:bg-amber-500/20 dark:text-amber-300 dark:hover:border-amber-500/50 dark:hover:bg-amber-500/20"
                        )}
                        aria-label="Lihat masalah"
                        aria-expanded={showIssues}
                      >
                        <WarningTriangle className="h-3 w-3" />
                        {totalIssues}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="font-mono text-xs">
                      {showIssues ? "Tutup masalah" : "Lihat masalah"}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="flex h-8 w-8 cursor-default items-center justify-center rounded-action text-slate-400 dark:text-slate-600"
                        aria-label="Tidak ada masalah"
                      >
                        <DocMagnifyingGlass className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="font-mono text-xs">
                      Tidak ada masalah terdeteksi
                    </TooltipContent>
                  </Tooltip>
                )}

                  {/* Issues floating panel */}
                  {showIssues && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-[320px] overflow-hidden rounded-action border border-slate-300/85 bg-slate-100 shadow-lg dark:border-slate-700/70 dark:bg-slate-800">
                      <div className="max-h-[300px] overflow-y-auto p-3 scrollbar-thin">
                        <div className="space-y-3">
                          {naturalnessIssues.length > 0 && (
                            <Collapsible open={naturalnessOpen} onOpenChange={setNaturalnessOpen}>
                              <CollapsibleTrigger className="flex items-center gap-1.5 rounded-sm text-[10px] font-mono font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:text-slate-400 dark:hover:text-slate-100">
                                {naturalnessOpen ? <NavArrowDown className="h-3 w-3" /> : <NavArrowRight className="h-3 w-3" />}
                                Naturalness ({naturalnessIssues.length})
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-2 space-y-2">
                                  {naturalnessIssues.map((issue) => (
                                    <RefrasaIssueItem key={`nat-${issue.type}-${issue.severity}-${issue.message.slice(0, 30)}`} issue={issue} />
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}

                          {styleIssues.length > 0 && (
                            <Collapsible open={styleOpen} onOpenChange={setStyleOpen}>
                              <CollapsibleTrigger className="flex items-center gap-1.5 rounded-sm text-[10px] font-mono font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:text-slate-400 dark:hover:text-slate-100">
                                {styleOpen ? <NavArrowDown className="h-3 w-3" /> : <NavArrowRight className="h-3 w-3" />}
                                Style ({styleIssues.length})
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-2 space-y-2">
                                  {styleIssues.map((issue) => (
                                    <RefrasaIssueItem key={`sty-${issue.type}-${issue.severity}-${issue.message.slice(0, 30)}`} issue={issue} />
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              {/* Close */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onOpenChange(false)}
                    className={iconBtnClass}
                    aria-label="Tutup"
                  >
                    <Xmark className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="font-mono text-xs">Tutup</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Action buttons row */}
          <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-slate-300/80 pt-2 dark:border-slate-700/70">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isApplying}
              className="h-7 px-2.5 font-mono text-[11px] text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={onApply}
              disabled={isApplying}
              className="h-7 bg-emerald-600 px-2.5 font-mono text-[11px] text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700"
            >
              {isApplying ? (
                <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              )}
              {isApplying ? "Menerapkan..." : "Terapkan"}
            </Button>
          </div>
        </div>

        {/* Content — Desktop (md+) */}
        <div className="hidden min-h-0 flex-1 overflow-hidden p-4 md:flex md:gap-4">
          {showOriginal && (
            <div className="flex w-[40%] shrink-0 flex-col">
              <p className="mb-2 text-[10px] font-mono font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Teks Asli
              </p>
              <div className={cn(contentContainerClass, "text-slate-600 dark:text-slate-400")}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{originalContent}</p>
              </div>
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="mb-2 text-[10px] font-mono font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Hasil Perbaikan
            </p>
            <div className={contentContainerClass}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-900 dark:text-slate-100">{refrasedText}</p>
            </div>
          </div>
        </div>

        {/* Content — Mobile (<md) */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
          <Tabs defaultValue="hasil" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mx-4 mt-3 shrink-0">
              <TabsTrigger value="asli" className="font-mono text-[11px]">Asli</TabsTrigger>
              <TabsTrigger value="hasil" className="font-mono text-[11px]">Hasil</TabsTrigger>
            </TabsList>
            <TabsContent value="asli" className="flex-1 overflow-hidden px-4 pb-4">
              <div className={cn(contentContainerClass, "h-full text-slate-600 dark:text-slate-400")}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{originalContent}</p>
              </div>
            </TabsContent>
            <TabsContent value="hasil" className="flex-1 overflow-hidden px-4 pb-4">
              <div className={cn(contentContainerClass, "h-full")}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-900 dark:text-slate-100">{refrasedText}</p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Mobile footer */}
          <div className="shrink-0 border-t border-slate-300/80 px-4 py-2.5 dark:border-slate-700/70">
            <div className="flex justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isApplying}
                className="h-7 px-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={onApply}
                disabled={isApplying}
                className="h-7 px-2.5 font-mono text-[11px]"
              >
                {isApplying ? (
                  <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                )}
                {isApplying ? "Menerapkan..." : "Terapkan"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

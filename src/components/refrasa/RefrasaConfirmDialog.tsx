"use client"

import { useState } from "react"
import { NavArrowDown, NavArrowRight } from "iconoir-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { RefrasaIssueItem } from "./RefrasaIssueItem"
import type { RefrasaIssue } from "@/lib/refrasa/types"

interface RefrasaConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Original content before refrasa */
  originalContent: string
  /** Text after refrasa improvements */
  refrasedText: string
  /** List of issues found */
  issues: RefrasaIssue[]
  /** Callback when user applies changes */
  onApply: () => void
  /** Loading state for apply action */
  isApplying?: boolean
}

/**
 * RefrasaConfirmDialog - Side-by-side comparison dialog
 *
 * Layout:
 * - Left panel: Original content with collapsible issues list
 * - Right panel: Refrasad text (clean)
 *
 * Issues grouped by category (naturalness/style)
 */
export function RefrasaConfirmDialog({
  open,
  onOpenChange,
  originalContent,
  refrasedText,
  issues,
  onApply,
  isApplying = false,
}: RefrasaConfirmDialogProps) {
  const [naturalnessOpen, setNaturalnessOpen] = useState(true)
  const [styleOpen, setStyleOpen] = useState(true)

  // Group issues by category
  const naturalnessIssues = issues.filter((i) => i.category === "naturalness")
  const styleIssues = issues.filter((i) => i.category === "style")

  const totalIssues = issues.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Tinjau Hasil Refrasa</DialogTitle>
          <DialogDescription>
            {totalIssues > 0 ? (
              <>
                <span className="font-semibold text-orange-600">
                  {totalIssues} masalah terdeteksi
                </span>{" "}
                &rarr; Tinjau hasil perbaikan di bawah
              </>
            ) : (
              "Tidak ada masalah terdeteksi. Teks sudah memenuhi kriteria."
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Side-by-side comparison */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Left panel - Original */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Teks Asli</h3>
            <div className="h-[200px] rounded-md border p-3 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{originalContent}</p>
            </div>

            {/* Collapsible issues list */}
            {totalIssues > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">
                  Masalah yang Ditemukan ({totalIssues})
                </h4>

                {/* Naturalness Issues */}
                {naturalnessIssues.length > 0 && (
                  <Collapsible open={naturalnessOpen} onOpenChange={setNaturalnessOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-400 hover:underline">
                      {naturalnessOpen ? (
                        <NavArrowDown className="h-4 w-4" />
                      ) : (
                        <NavArrowRight className="h-4 w-4" />
                      )}
                      Naturalness Issues ({naturalnessIssues.length})
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="max-h-[150px] mt-2 overflow-y-auto">
                        <div className="space-y-2 pr-2">
                          {naturalnessIssues.map((issue, idx) => (
                            <RefrasaIssueItem key={`nat-${idx}`} issue={issue} />
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Style Issues */}
                {styleIssues.length > 0 && (
                  <Collapsible open={styleOpen} onOpenChange={setStyleOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-teal-700 dark:text-teal-400 hover:underline">
                      {styleOpen ? (
                        <NavArrowDown className="h-4 w-4" />
                      ) : (
                        <NavArrowRight className="h-4 w-4" />
                      )}
                      Style Issues ({styleIssues.length})
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="max-h-[150px] mt-2 overflow-y-auto">
                        <div className="space-y-2 pr-2">
                          {styleIssues.map((issue, idx) => (
                            <RefrasaIssueItem key={`sty-${idx}`} issue={issue} />
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}
          </div>

          {/* Right panel - Refrasad */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-green-700 dark:text-green-400">
              Hasil Perbaikan
            </h3>
            <div className="h-[400px] md:h-[calc(100%-2rem)] rounded-md border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20 p-3 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{refrasedText}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isApplying}
          >
            Batal
          </Button>
          <Button onClick={onApply} disabled={isApplying}>
            {isApplying ? "Menerapkan..." : "Terapkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

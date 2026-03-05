"use client"

import { FormEvent, useMemo, useState } from "react"
import { toast } from "sonner"
import type { Id } from "@convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  useTechnicalReport,
  type TechnicalReportSource,
} from "@/lib/hooks/useTechnicalReport"
import { buildClientSnapshot, normalizeDescription } from "@/lib/technical-report/payload"

type TechnicalReportFormProps = {
  source: TechnicalReportSource
  initialConversationId?: Id<"conversations">
  initialPaperSessionId?: Id<"paperSessions">
  initialSnapshot?: Record<string, unknown>
  onSubmitted?: (reportId: string) => void
}

const UNKNOWN_SESSION_VALUE = "__unknown__"

export function TechnicalReportForm({
  source,
  initialConversationId,
  initialPaperSessionId,
  initialSnapshot,
  onSubmitted,
}: TechnicalReportFormProps) {
  const { contexts, submitReport, isSubmitting } = useTechnicalReport()
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true)
  const [contextValue, setContextValue] = useState<string>(
    initialConversationId ?? ""
  )

  const contextOptions = useMemo(() => {
    const mapped = contexts.map((context) => ({
      value: context.conversationId as string,
      label: context.title || "Percakapan tanpa judul",
      paperSessionId: context.paperSessionId as Id<"paperSessions"> | null,
    }))

    if (
      initialConversationId &&
      !mapped.some((context) => context.value === initialConversationId)
    ) {
      mapped.unshift({
        value: initialConversationId,
        label: "Percakapan saat ini",
        paperSessionId: initialPaperSessionId ?? null,
      })
    }

    mapped.push({
      value: UNKNOWN_SESSION_VALUE,
      label: "Sesi chat tidak diketahui",
      paperSessionId: null,
    })

    return mapped
  }, [contexts, initialConversationId, initialPaperSessionId])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setReportId(null)

    let normalizedDescription = ""
    try {
      normalizedDescription = normalizeDescription(description)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deskripsi laporan wajib diisi."
      setError(message)
      return
    }

    const selectedContext = contextOptions.find((context) => context.value === contextValue)
    const resolvedConversationId =
      contextValue && contextValue !== UNKNOWN_SESSION_VALUE
        ? (contextValue as Id<"conversations">)
        : undefined
    const resolvedPaperSessionId =
      initialPaperSessionId ?? selectedContext?.paperSessionId ?? undefined

    try {
      const result = await submitReport({
        source,
        description: normalizedDescription,
        ...(resolvedConversationId ? { conversationId: resolvedConversationId } : {}),
        ...(resolvedPaperSessionId ? { paperSessionId: resolvedPaperSessionId } : {}),
        ...(includeDiagnostics
          ? {
              contextSnapshot: buildClientSnapshot({
                routePath: typeof window !== "undefined" ? window.location.pathname : undefined,
                ...(initialSnapshot ?? {}),
              }),
            }
          : {}),
      })

      const submittedReportId = String(result.reportId)
      setReportId(submittedReportId)
      setDescription("")
      toast.success("Laporan teknis berhasil dikirim.")
      onSubmitted?.(submittedReportId)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal mengirim laporan teknis. Coba lagi."
      setError(message)
      toast.error(message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="technical-report-description" className="block text-sm font-medium text-foreground">
          Uraian kendala teknis
        </label>
        <textarea
          id="technical-report-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Contoh: Tool pencarian web gagal dipanggil setelah tombol Kirim ditekan."
          className="min-h-28 w-full rounded-action border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="technical-report-context" className="block text-sm font-medium text-foreground">
          Sesi chat terkait
        </label>
        <select
          id="technical-report-context"
          value={contextValue}
          onChange={(event) => setContextValue(event.target.value)}
          className="h-10 w-full rounded-action border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Pilih sesi chat terkait (opsional)</option>
          {contextOptions.map((context) => (
            <option key={context.value} value={context.value}>
              {context.label}
            </option>
          ))}
        </select>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={includeDiagnostics}
          onChange={(event) => setIncludeDiagnostics(event.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Sertakan diagnostik teknis
      </label>

      {error && (
        <p role="alert" className="text-sm text-[var(--chat-destructive)]">
          {error}
        </p>
      )}

      {reportId && (
        <p className="text-sm text-[var(--chat-success)]">
          Laporan terkirim. ID: <span className="font-mono">{reportId}</span>
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="chat-validation-approve-button h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
        >
          {isSubmitting ? "Mengirim..." : "Kirim Laporan"}
        </Button>
      </div>
    </form>
  )
}

"use client"

import { FormEvent, useMemo, useState } from "react"
import { toast } from "sonner"
import type { Id } from "@convex/_generated/dataModel"
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
  paymentContext?: {
    transactionId?: string
    amount?: number
    paymentMethod?: string
    providerPaymentId?: string
    errorCode?: string
  }
  onSubmitted?: (reportId: string) => void
}

const UNKNOWN_SESSION_VALUE = "__unknown__"

export function TechnicalReportForm({
  source,
  initialConversationId,
  initialPaperSessionId,
  initialSnapshot,
  paymentContext,
  onSubmitted,
}: TechnicalReportFormProps) {
  const isPaymentScope = source.startsWith("payment-")
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
        ...(paymentContext ? { paymentContext } : {}),
      })

      const submittedReportId = String(result.reportId)
      setReportId(submittedReportId)
      setDescription("")
      toast.success("Laporan berhasil dikirim.")
      onSubmitted?.(submittedReportId)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal mengirim laporan. Coba lagi."
      setError(message)
      toast.error(message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900">
        <div className="border-b border-slate-300 px-4 py-3 text-narrative text-md font-medium dark:border-slate-600">
          Form Laporan
        </div>
        <div className="space-y-4 bg-slate-50 p-4 dark:bg-slate-800">
          <div className="space-y-1.5">
            <label
              htmlFor="technical-report-description"
              className="text-interface text-xs font-medium text-foreground"
            >
              Ceritakan masalah yang terjadi
            </label>
            <textarea
              id="technical-report-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Contoh: Jawaban berhenti di tengah atau chat error saat tombol Kirim ditekan."
              className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:font-mono placeholder:text-muted-foreground transition-colors focus:border-border focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-300 dark:focus:border-slate-600"
            />
          </div>

          {!isPaymentScope && (
            <div className="space-y-1.5">
              <label
                htmlFor="technical-report-context"
                className="text-interface text-xs font-medium text-foreground"
              >
                Sesi chat terkait
              </label>
              <select
                id="technical-report-context"
                value={contextValue}
                onChange={(event) => setContextValue(event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground transition-colors focus:border-border focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-600"
              >
                <option value="">Pilih sesi chat terkait (opsional)</option>
                {contextOptions.map((context) => (
                  <option key={context.value} value={context.value}>
                    {context.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <label className="inline-flex items-center gap-2 text-interface text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={includeDiagnostics}
              onChange={(event) => setIncludeDiagnostics(event.target.checked)}
              className="h-4 w-4 rounded border-border dark:border-slate-600"
            />
            Sertakan informasi tambahan otomatis (disarankan)
          </label>

          {error && (
            <p role="alert" className="text-interface text-xs text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          {reportId && (
            <p className="text-interface text-xs text-emerald-600 dark:text-emerald-400">
              Laporan terkirim. ID: <span className="font-mono">{reportId}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-action border border-transparent bg-slate-800 px-4 py-1 text-narrative text-xs font-medium text-slate-100 transition-colors hover:border-slate-600 hover:text-slate-800 focus-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-800 dark:hover:border-slate-400 dark:hover:text-slate-100"
        >
          <span
            className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
            aria-hidden="true"
          />
          <span className="relative z-10">{isSubmitting ? "Mengirim..." : "Kirim Laporan"}</span>
        </button>
      </div>
    </form>
  )
}

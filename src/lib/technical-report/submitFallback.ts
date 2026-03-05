export function isMissingConvexFunctionError(
  error: unknown,
  functionName: string
): boolean {
  const message = extractErrorMessage(error).toLowerCase()
  if (!message) return false

  return (
    message.includes("could not find public function") &&
    message.includes(functionName.toLowerCase())
  )
}

export function toUserFriendlyTechnicalReportError(error: unknown): string {
  if (isMissingConvexFunctionError(error, "technicalReports:submitTechnicalReport")) {
    return "Layanan laporan teknis sedang melakukan sinkronisasi. Laporan tetap dikirim melalui jalur dukungan."
  }

  const message = extractErrorMessage(error).trim()
  if (!message) return "Laporan teknis belum dapat dikirim. Silakan coba beberapa saat lagi."

  if (message.length > 240) {
    return "Laporan teknis belum dapat dikirim. Silakan coba beberapa saat lagi."
  }

  return message
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return ""
}


import { formatDistanceToNow, format } from "date-fns"
import { id as localeId } from "date-fns/locale"

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

/**
 * Format waktu relatif untuk conversation list.
 *
 * - Jika < 1 tahun: "5 menit lalu", "2 jam lalu", "3 hari lalu"
 * - Jika >= 1 tahun: "13 Jan 2024" (absolute date)
 */
export function formatRelativeTime(timestamp: number): string {
    const diffInMs = Date.now() - timestamp

    if (diffInMs >= ONE_YEAR_MS) {
        // Lebih dari 1 tahun: tampilkan absolute date
        return format(timestamp, "d MMM yyyy", { locale: localeId })
    }

    // Kurang dari 1 tahun: tampilkan relative time
    const relative = formatDistanceToNow(timestamp, {
        addSuffix: true,
        locale: localeId,
    })

    // "5 menit yang lalu" -> "5 menit lalu" (lebih ringkas)
    return relative.replace(" yang lalu", " lalu")
}

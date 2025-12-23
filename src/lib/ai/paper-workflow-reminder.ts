/**
 * Paper Workflow Reminder
 *
 * System prompt injection when paper intent is detected but no session exists.
 * Forces AI to trigger paper workflow instead of directly creating artifacts.
 */

/**
 * Reminder injected when:
 * - User message indicates paper writing intent
 * - No active paper session exists for this conversation
 *
 * This overrides the default behavior of creating artifacts directly.
 */
export const PAPER_WORKFLOW_REMINDER = `
═══════════════════════════════════════════════════════════════════════════════
⚠️ PAPER WRITING WORKFLOW - WAJIB DIIKUTI
═══════════════════════════════════════════════════════════════════════════════

User tampaknya ingin bantuan menulis paper/makalah akademik.

LANGKAH WAJIB SEBELUM APAPUN:
1. Panggil tool "startPaperSession" dengan ide awal dari user
2. JANGAN langsung bikin outline/section dengan createArtifact
3. JANGAN langsung generate konten lengkap

SETELAH startPaperSession berhasil:
- Sistem akan inject instruksi paper mode secara otomatis
- Ikuti alur dialog-first: tanya dulu, diskusi, baru drafting
- Gunakan google_search untuk eksplorasi literatur

LARANGAN KERAS:
❌ JANGAN bikin artifact (outline/section) sebelum paper session aktif
❌ JANGAN langsung generate output lengkap tanpa diskusi
❌ JANGAN skip langkah startPaperSession

PENGECUALIAN (boleh langsung tanpa workflow):
- User eksplisit bilang "jangan pakai workflow" atau "langsung saja"
- User hanya minta penjelasan konsep (bukan menulis)
- User minta template/contoh format saja

CONTOH RESPON YANG BENAR:
"Baik, saya akan bantu menulis paper tentang [topik]. Izinkan saya memulai sesi penulisan paper terlebih dahulu..."
[Panggil startPaperSession]
"Sesi paper sudah aktif. Sekarang mari kita mulai dengan brainstorming..."

═══════════════════════════════════════════════════════════════════════════════
`;

/**
 * Short version for logging/debugging
 */
export const PAPER_WORKFLOW_REMINDER_SHORT =
    "[PAPER INTENT DETECTED] User ingin bantuan paper. WAJIB panggil startPaperSession dulu.";

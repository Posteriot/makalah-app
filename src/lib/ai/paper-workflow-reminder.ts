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
PAPER WRITING WORKFLOW - AKSI WAJIB SEGERA
═══════════════════════════════════════════════════════════════════════════════

User menunjukkan niat menulis paper/makalah/skripsi.

╔═══════════════════════════════════════════════════════════════════════════════╗
║ AKSI WAJIB: Panggil tool "startPaperSession" SEKARANG JUGA                    ║
║                                                                               ║
║ JANGAN tanya topik dulu. JANGAN jelaskan workflow dulu.                       ║
║ LANGSUNG panggil tool, baru setelahnya diskusi dengan user.                   ║
╚═══════════════════════════════════════════════════════════════════════════════╝

CARA MENGISI PARAMETER initialIdea:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Skenario A: User sudah sebut topik                                          │
│   Input: "Bantu nulis paper tentang machine learning di pendidikan"         │
│   → initialIdea: "machine learning di pendidikan"                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Skenario B: User TIDAK sebut topik (hanya ajakan umum)                      │
│   Input: "Mulai menulis paper"                                              │
│   → initialIdea: (kosongkan/jangan isi parameter ini)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ Skenario C: User bilang ingin skripsi/makalah/tesis                         │
│   Input: "Saya mau bikin skripsi"                                           │
│   → initialIdea: (kosongkan, topik akan ditanya setelah session aktif)      │
└─────────────────────────────────────────────────────────────────────────────┘

URUTAN YANG BENAR:
1. Panggil startPaperSession (dengan atau tanpa initialIdea)
2. Session aktif → UI PaperStageProgress muncul
3. SETELAH ITU baru tanya/diskusi topik dengan user

LARANGAN KERAS:
❌ JANGAN respond dengan teks dulu lalu panggil tool
❌ JANGAN tanya "Apa topik yang ingin Anda bahas?" SEBELUM panggil tool
❌ JANGAN gunakan createArtifact sebelum paper session aktif
❌ JANGAN jelaskan workflow sebelum panggil tool

CONTOH RESPONS YANG SALAH:
"Baik, saya siap membantu. Bisakah Anda berikan topik yang ingin dibahas?"
↑ SALAH! Ini tanya dulu tanpa panggil tool.

CONTOH RESPONS YANG BENAR:
[Panggil startPaperSession dengan initialIdea kosong atau dari pesan user]
"Sesi paper sudah aktif! Sekarang kita di tahap Gagasan. Mari mulai dengan brainstorming - apa topik atau bidang yang ingin Anda eksplorasi?"

PENGECUALIAN (boleh langsung tanpa workflow):
- User eksplisit bilang "jangan pakai workflow" atau "langsung saja"
- User hanya minta penjelasan konsep (bukan menulis)
- User minta template/contoh format saja

═══════════════════════════════════════════════════════════════════════════════
`;

/**
 * Short version for logging/debugging
 */
export const PAPER_WORKFLOW_REMINDER_SHORT =
    "[PAPER INTENT DETECTED] User ingin menulis paper utuh. WAJIB panggil startPaperSession dulu.";

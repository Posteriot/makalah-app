import { tool } from "ai"
import { z } from "zod"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

/**
 * Factory untuk membuat tools AI khusus alur penulisan paper.
 */
export const createPaperTools = (context: {
    userId: Id<"users">,
    conversationId: Id<"conversations">
}) => {
    return {
        startPaperSession: tool({
            description: `Inisialisasi sesi penulisan paper baru untuk percakapan ini.

WAJIB panggil tool ini SEGERA saat user menunjukkan niat menulis paper/makalah/skripsi.

Aturan pengisian initialIdea:
- Jika user menyebutkan topik spesifik → gunakan topik tersebut
- Jika user hanya bilang "mulai menulis paper" tanpa topik → kosongkan parameter ini
- JANGAN tunggu user memberikan topik dulu, LANGSUNG panggil tool ini`,
            inputSchema: z.object({
                initialIdea: z.string().optional().describe(
                    "Ide kasar, judul awal, atau topik. Opsional - jika user belum menyebutkan topik, boleh dikosongkan."
                ),
            }),
            execute: async ({ initialIdea }) => {
                try {
                    const sessionId = await fetchMutation(api.paperSessions.create, {
                        userId: context.userId,
                        conversationId: context.conversationId,
                        initialIdea: initialIdea || undefined,
                    });
                    return {
                        success: true,
                        sessionId,
                        message: "Sesi penulisan paper berhasil dimulai. AI sekarang dalam 'Paper Writing Mode'. Ikuti instruksi tahap 'gagasan'.",
                    };
                } catch (error) {
                    console.error("Error in startPaperSession tool:", error);
                    return { success: false, error: "Gagal memulai sesi paper di database." };
                }
            },
        }),

        getCurrentPaperState: tool({
            description: "Ambil status terbaru dari sesi penulisan paper (tahap aktif, data draf, status validasi). Berguna untuk sinkronisasi setelah jeda.",
            inputSchema: z.object({}),
            execute: async () => {
                try {
                    const session = await fetchQuery(api.paperSessions.getByConversation, {
                        conversationId: context.conversationId
                    });
                    return session
                        ? { success: true, session }
                        : { success: false, error: "Tidak ada sesi paper aktif untuk percakapan ini." };
                } catch (error) {
                    console.error("Error in getCurrentPaperState tool:", error);
                    return { success: false, error: "Gagal mengambil status sesi paper." };
                }
            }
        }),

        updateStageData: tool({
            description: `Simpan progres draf data untuk tahap penulisan saat ini ke database.

═══════════════════════════════════════════════════════════════════════════════
LINEAR FLOW CONSTRAINT:
═══════════════════════════════════════════════════════════════════════════════
- Lo HANYA bisa update tahap yang SEDANG AKTIF (currentStage)
- JANGAN coba update tahap yang belum aktif - akan ERROR
- Untuk lanjut ke tahap berikutnya, user HARUS klik "Approve & Lanjut" di UI

═══════════════════════════════════════════════════════════════════════════════
FORMAT DATA:
═══════════════════════════════════════════════════════════════════════════════
- Field 'referensiAwal' atau 'referensiPendukung' harus berupa ARRAY OF OBJECTS, BUKAN string!
  Format: [{title: "Judul Paper", authors: "Nama Penulis", url: "https://...", year: 2024}, ...]
  - title (wajib): Judul referensi/paper
  - authors (opsional): Nama penulis
  - url (opsional): URL sumber
  - year (opsional): Tahun publikasi (angka)

Contoh data untuk tahap 'gagasan':
{
  ideKasar: "Ide dari user...",
  analisis: "Analisis kelayakan...",
  angle: "Sudut pandang unik...",
  novelty: "Kebaruan...",
  referensiAwal: [
    {title: "Self-determination theory and...", authors: "Ryan, R.M. & Deci, E.L.", year: 2000},
    {title: "Project-based learning effects...", url: "https://example.com", year: 2019}
  ]
}`,
            inputSchema: z.object({
                stage: z.string().describe("ID tahap saat ini (misal: 'gagasan', 'topik', 'abstrak')"),
                ringkasan: z.string().max(280).describe(
                    "WAJIB! Keputusan utama yang DISEPAKATI dengan user untuk tahap ini. Max 280 karakter. " +
                    "Contoh: 'Disepakati angle: dampak AI terhadap pendidikan tinggi Indonesia, gap: belum ada studi di kampus swasta'"
                ),
                data: z.record(z.string(), z.any()).optional().describe(
                    "Objek data draf lainnya (selain ringkasan). PENTING: referensiAwal/referensiPendukung harus ARRAY OF OBJECTS!"
                ),
            }),
            execute: async ({ stage, ringkasan, data }) => {
                try {
                    const session = await fetchQuery(api.paperSessions.getByConversation, {
                        conversationId: context.conversationId
                    });
                    if (!session) return { success: false, error: "Sesi paper tidak ditemukan." };

                    // Merge ringkasan (required by schema) into data object
                    const mergedData = { ...(data || {}), ringkasan };

                    const result = await fetchMutation(api.paperSessions.updateStageData, {
                        sessionId: session._id,
                        stage,
                        data: mergedData,
                    });

                    // Safety net: Parse warning from backend if ringkasan somehow missing
                    // (Should never happen now since ringkasan is required by Zod schema)
                    if (result && typeof result === 'object' && 'warning' in result && result.warning) {
                        return {
                            success: true,
                            message: `Berhasil menyimpan progres untuk tahap ${stage}.`,
                            warning: result.warning,
                        };
                    }

                    return { success: true, message: `Berhasil menyimpan progres untuk tahap ${stage}. Ringkasan tersimpan.` };
                } catch (error) {
                    console.error("Error in updateStageData tool:", error);
                    // Forward specific error message from backend to AI
                    const errorMessage = error instanceof Error
                        ? error.message
                        : "Gagal menyimpan progres data stage.";
                    return { success: false, error: errorMessage };
                }
            },
        }),

        submitStageForValidation: tool({
            description: "Kirim draf tahap saat ini ke user untuk divalidasi. Ini akan memunculkan panel persetujuan di UI user. AI akan berhenti ngetik setelah ini.",
            inputSchema: z.object({}),
            execute: async () => {
                try {
                    const session = await fetchQuery(api.paperSessions.getByConversation, {
                        conversationId: context.conversationId
                    });
                    if (!session) return { success: false, error: "Sesi paper tidak ditemukan." };

                    await fetchMutation(api.paperSessions.submitForValidation, {
                        sessionId: session._id,
                    });
                    return {
                        success: true,
                        message: "Draf telah dikirim ke user. Menunggu validasi (Approve/Revise) dari user sebelum bisa lanjut ke tahap berikutnya."
                    };
                } catch (error) {
                    console.error("Error in submitStageForValidation tool:", error);
                    // Forward specific error message from backend to AI
                    const errorMessage = error instanceof Error
                        ? error.message
                        : "Gagal mengirim sinyal validasi.";
                    return { success: false, error: errorMessage };
                }
            },
        }),
    }
}

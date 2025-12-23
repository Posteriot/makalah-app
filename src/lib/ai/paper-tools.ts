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
            description: "Inisialisasi sesi penulisan paper baru untuk percakapan ini. Panggil ini saat user berniat menulis makalah/paper.",
            inputSchema: z.object({
                initialIdea: z.string().describe("Ide kasar, judul awal, atau topik yang ingin dibahas oleh user"),
            }),
            execute: async ({ initialIdea }) => {
                try {
                    const sessionId = await fetchMutation(api.paperSessions.create, {
                        userId: context.userId,
                        conversationId: context.conversationId,
                        initialIdea,
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
            description: "Simpan progres draf data untuk tahap penulisan saat ini ke database secara atomik. Panggil ini setiap kali menghasilkan draf bab baru.",
            inputSchema: z.object({
                stage: z.string().describe("ID tahap saat ini (misal: 'gagasan', 'topik', 'abstrak')"),
                data: z.any().describe("Objek data draf yang ingin disimpan (sesuai skema tiap tahap)"),
            }),
            execute: async ({ stage, data }) => {
                try {
                    const session = await fetchQuery(api.paperSessions.getByConversation, {
                        conversationId: context.conversationId
                    });
                    if (!session) return { success: false, error: "Sesi paper tidak ditemukan." };

                    await fetchMutation(api.paperSessions.updateStageData, {
                        sessionId: session._id,
                        stage,
                        data,
                    });
                    return { success: true, message: `Berhasil menyimpan progres untuk tahap ${stage}.` };
                } catch (error) {
                    console.error("Error in updateStageData tool:", error);
                    return { success: false, error: "Gagal menyimpan progres data stage." };
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
                    return { success: false, error: "Gagal mengirim sinyal validasi." };
                }
            },
        }),
    }
}

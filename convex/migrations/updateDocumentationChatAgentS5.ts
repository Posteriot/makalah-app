import { internalMutation } from "../_generated/server"

type DocumentationBlock = {
  type: "infoCard" | "ctaCards" | "section"
  title?: string
  description?: string
  items?: Array<
    | string
    | {
        title?: string
        description?: string
        ctaText?: string
        text?: string
        subItems?: string[]
      }
  >
  paragraphs?: string[]
  list?: {
    variant: "bullet" | "numbered"
    items: Array<{ text: string; subItems?: string[] }>
  }
}

const CHAT_AGENT_SECTION = {
  title: "Chat dengan AI",
  group: "Fitur Utama",
  order: 5,
  icon: "Users",
  summary:
    "Halaman ini menjelaskan cara memakai chat sebagai ruang kerja utama untuk menjalankan workflow 13 tahapan penyusunan paper. Fokusnya bukan sekadar tanya-jawab, tetapi kolaborasi terarah: mulai sesi paper, diskusi per tahap, validasi tahap, lalu lanjut sampai naskah utuh.",
  blocks: [
    {
      type: "section" as const,
      title: "Chat adalah Ruang Kerja Utama Workflow 13 Tahap",
      paragraphs: ["Di Makalah AI, menu Chat adalah tempat seluruh proses penyusunan paper dijalankan."],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Anda bisa memulai dari chat kosong atau melanjutkan percakapan lama." },
          {
            text: "Saat mode paper aktif, chat terhubung dengan sesi paper, artifak, dan linimasa progres.",
          },
          {
            text: "Setiap keputusan tahap tetap dikunci oleh aksi validasi user, bukan dipindahkan otomatis.",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Cara Memulai Chat agar Workflow 13 Tahap Aktif",
      paragraphs: ["Agar sistem langsung masuk ke mode penyusunan paper:"],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Klik menu Chat di header." },
          { text: "Klik Percakapan Baru." },
          {
            text: "Gunakan template Ayo kolaborasi menyusun paper akademik! atau tulis niat yang jelas untuk menyusun paper.",
          },
          {
            text: "Setelah intent terdeteksi, sistem memaksa AI memulai sesi paper lebih dulu, baru diskusi lanjut per tahap.",
          },
          {
            text: 'Catatan: jika pesan Anda hanya berupa penjelasan konsep umum (misalnya "apa itu", "pengertian", "contoh"), sistem bisa membaca itu sebagai mode diskusi biasa.',
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Pola Interaksi yang Efektif per Tahap",
      paragraphs: ["Supaya progres tidak berputar-putar, gunakan pola dialog sederhana ini di setiap tahap."],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Jelaskan target tahap yang ingin Anda capai sekarang." },
          { text: "Minta AI merangkum keputusan yang sudah disepakati." },
          { text: "Minta AI menuliskan output kerja tahap tersebut di artifak." },
          { text: "Periksa hasilnya dulu, lalu putuskan Revisi atau Approve & Lanjut." },
          { text: "AI diarahkan diskusi dulu sebelum drafting penuh." },
          { text: "AI menyimpan progres ke tahap aktif (auto-stage), bukan bebas lompat tahap." },
          { text: "AI hanya boleh submit validasi ketika user sudah menyatakan setuju." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Kapan Pakai Revisi dan Kapan Approve",
      paragraphs: ["Di akhir tahap, panel validasi muncul sebagai gerbang keputusan user."],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Pilih Revisi jika isi tahap belum sesuai, lalu kirim feedback spesifik." },
          { text: "Pilih Approve & Lanjut jika isi tahap sudah sesuai." },
          { text: "Setelah approve, tahap bergeser ke tahap berikutnya." },
          {
            text: "Selama status masih pending_validation, update data tahap diblokir sampai ada keputusan revisi/approve.",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Aturan Edit Pesan dan Rewind",
      paragraphs: ["Dalam mode paper, fitur edit pesan sengaja dibatasi agar konteks tahap tidak rusak."],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Hanya pesan user yang bisa diedit." },
          { text: "Edit dibatasi untuk dua pesan user terakhir di tahap aktif." },
          { text: "Pesan pada tahap yang sudah disetujui tidak bisa diedit langsung." },
          { text: "Untuk revisi tahap yang sudah disetujui, gunakan mekanisme Rewind." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Fitur Chat Pendukung saat Menyusun Paper",
      paragraphs: ["Selain kirim pesan biasa, chat menyediakan alat bantu yang relevan untuk workflow."],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Stop untuk menghentikan respons AI yang sedang berjalan." },
          { text: "Regenerate untuk meminta versi alternatif jawaban." },
          {
            text: "Lampiran file (PDF, DOC/DOCX, XLSX, TXT, gambar) dengan batas ukuran 10MB per file.",
          },
          { text: "Panel Sesi paper dan Linimasa progres untuk melihat posisi kerja dan hasil per tahap." },
        ],
      },
    },
  ],
}

const buildSearchText = (section: {
  title: string
  summary?: string
  blocks: DocumentationBlock[]
}) => {
  const chunks: string[] = [section.title, section.summary ?? ""]

  for (const block of section.blocks) {
    if (block.type === "infoCard") {
      chunks.push(block.title ?? "", block.description ?? "")
      for (const item of block.items ?? []) {
        if (typeof item === "string") chunks.push(item)
      }
      continue
    }

    if (block.type === "ctaCards") {
      for (const item of block.items ?? []) {
        if (typeof item !== "string") {
          chunks.push(item.title ?? "", item.description ?? "", item.ctaText ?? "")
        }
      }
      continue
    }

    chunks.push(block.title ?? "", block.description ?? "")
    if (block.paragraphs) chunks.push(...block.paragraphs)
    if (block.list) {
      for (const item of block.list.items) {
        chunks.push(item.text)
        if (item.subItems) chunks.push(...item.subItems)
      }
    }
  }

  return chunks.join(" ").replace(/\s+/g, " ").trim()
}

export const updateDocumentationChatAgentS5 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("documentationSections")
      .withIndex("by_slug", (q) => q.eq("slug", "chat-agent"))
      .first()

    if (!existing) {
      return {
        success: false,
        message: "Section dengan slug 'chat-agent' tidak ditemukan.",
      }
    }

    const searchText = buildSearchText({
      title: CHAT_AGENT_SECTION.title,
      summary: CHAT_AGENT_SECTION.summary,
      blocks: CHAT_AGENT_SECTION.blocks,
    })

    await ctx.db.patch(existing._id, {
      title: CHAT_AGENT_SECTION.title,
      group: CHAT_AGENT_SECTION.group,
      order: CHAT_AGENT_SECTION.order,
      icon: CHAT_AGENT_SECTION.icon,
      summary: CHAT_AGENT_SECTION.summary,
      blocks: CHAT_AGENT_SECTION.blocks,
      searchText,
      isPublished: true,
      updatedAt: now,
    })

    return {
      success: true,
      message: "Section 'chat-agent' berhasil diupdate sesuai S5 draft terbaru.",
      sectionId: existing._id,
      slug: "chat-agent",
      title: CHAT_AGENT_SECTION.title,
      updatedAt: now,
    }
  },
})

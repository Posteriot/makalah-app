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

const CONCEPTS_SECTION = {
  title: "Konsep Dasar",
  group: "Mulai",
  order: 4,
  icon: "FileText",
  summary:
    "Halaman ini menjelaskan fondasi cara kerja Makalah AI dalam bahasa sederhana untuk user awam. Intinya ada tiga: posisi manifesto (AI dipakai secara transparan dan akuntabel), keutamaan workflow 13 tahapan sebagai pagar alur, dan peran AI sebagai kolaborator teknis yang tetap menempatkan user sebagai pengarah utama.",
  blocks: [
    {
      type: "section" as const,
      title: "1) Landasan Manifesto Makalah AI",
      paragraphs: [
        "Di halaman About, Makalah AI menegaskan posisi bahwa teknologi tidak menggantikan manusia, tetapi melengkapi.",
      ],
      list: {
        variant: "numbered" as const,
        items: [
          {
            text: "Penggunaan AI harus transparan, bisa dipertanggungjawabkan, dan punya jejak kerja yang jelas.",
          },
          {
            text: 'Fokusnya bukan sekadar menilai "AI atau bukan", tetapi memastikan proses penyusunan bisa diaudit.',
          },
          {
            text: "Ini penting untuk membedakan dua hal: paper yang dibuatkan AI secara penuh, dan paper yang disusun bersama AI secara kolaboratif.",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "2) Keutamaan Workflow 13 Tahapan",
      paragraphs: ["Keunggulan utama Makalah AI ada pada workflow 13 tahapan penyusunan paper."],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Alur kerja dibagi dari tahap Gagasan Paper sampai Pemilihan Judul." },
          {
            text: "Sistem memaksa proses tetap mengikuti tahap aktif, jadi diskusi tidak mudah lompat ke tahap yang belum waktunya.",
          },
          {
            text: "User bisa melihat posisi kerja secara nyata di Linimasa progres (misalnya Stage 6/13).",
          },
          {
            text: "Dengan pola ini, user tidak perlu merancang prompt yang rumit dari nol; cukup berdiskusi, lalu sistem menjaga ritme prosesnya.",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "3) Prinsip AI sebagai Kolaborator",
      paragraphs: [
        "Di Makalah AI, AI bukan mesin yang menggantikan user, tetapi mitra kerja yang menjalankan sisi teknis.",
      ],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "AI membantu menyusun output tahap menjadi naskah kerja yang rapi." },
          { text: "AI ikut membantu diskusi, pengolahan referensi, dan penajaman argumen." },
          { text: "AI bekerja dalam mode dialog kolaboratif, bukan sekali jawab langsung selesai." },
          {
            text: 'Hasil akhirnya adalah kolaborasi manusia + AI, bukan "paper jadi otomatis" tanpa keterlibatan user.',
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "3A) Refrasa sebagai Lapisan Kontrol Mutu Bahasa",
      paragraphs: [
        "Di Makalah AI, Refrasa berfungsi sebagai lapisan kontrol mutu untuk gaya penulisan pada output artifak.",
        "Maknanya:",
      ],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Fokus Refrasa ada pada perbaikan naturalness dan keterbacaan bahasa." },
          { text: "User tetap meninjau hasil perbandingan sebelum menerapkan perubahan." },
          {
            text: "Refrasa tidak mengubah prinsip utama sistem: AI sebagai mitra teknis, user sebagai pengarah keputusan.",
          },
          {
            text: 'Posisinya adalah alat bantu kualitas penyajian, bukan klaim "jaminan lolos" penilaian tertentu.',
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "4) Kontrol Akhir Tetap di Tangan User",
      paragraphs: ["Walaupun AI aktif membantu, keputusan akhir tetap milik user."],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Tahap hanya bisa lanjut setelah user menyetujui hasil melalui Approve & Lanjut." },
          { text: "Jika belum sesuai, user bisa pilih Revisi dan memberi arahan perbaikan." },
          {
            text: "Backend juga menjaga supaya data tahap tidak bisa diubah sembarangan saat status belum sesuai.",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "5) Kenapa Konsep Ini Penting untuk User Awam",
      paragraphs: ["Konsep dasar ini dirancang supaya user baru tetap merasa terarah."],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Anda cukup mulai dari chat dan jelaskan tujuan paper." },
          { text: "Sistem mengarahkan proses ke jalur 13 tahap secara bertahap." },
          {
            text: "Anda tetap memegang kendali mutu akademik, sementara AI membantu mempercepat kerja teknis.",
          },
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

export const updateDocumentationConceptsS4 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()

    const existing = await ctx.db
      .query("documentationSections")
      .withIndex("by_slug", (q) => q.eq("slug", "concepts"))
      .first()

    if (!existing) {
      return {
        success: false,
        message: "Section dengan slug 'concepts' tidak ditemukan.",
      }
    }

    const searchText = buildSearchText({
      title: CONCEPTS_SECTION.title,
      summary: CONCEPTS_SECTION.summary,
      blocks: CONCEPTS_SECTION.blocks as DocumentationBlock[],
    })

    await ctx.db.patch(existing._id, {
      title: CONCEPTS_SECTION.title,
      group: CONCEPTS_SECTION.group,
      order: CONCEPTS_SECTION.order,
      icon: CONCEPTS_SECTION.icon,
      summary: CONCEPTS_SECTION.summary,
      blocks: CONCEPTS_SECTION.blocks,
      searchText,
      isPublished: true,
      updatedAt: now,
    })

    return {
      success: true,
      message: "Section 'concepts' berhasil diupdate sesuai S4 draft terbaru.",
      sectionId: existing._id,
      slug: "concepts",
      title: CONCEPTS_SECTION.title,
      updatedAt: now,
    }
  },
})

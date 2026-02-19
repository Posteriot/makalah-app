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

const upsertSectionBlock = (
  blocks: DocumentationBlock[],
  title: string,
  newBlock: DocumentationBlock,
  insertAfterTitle?: string
) => {
  const exactIndex = blocks.findIndex((block) => block.type === "section" && block.title === title)
  if (exactIndex >= 0) {
    blocks[exactIndex] = newBlock
    return
  }

  if (insertAfterTitle) {
    const anchorIndex = blocks.findIndex(
      (block) => block.type === "section" && block.title === insertAfterTitle
    )
    if (anchorIndex >= 0) {
      blocks.splice(anchorIndex + 1, 0, newBlock)
      return
    }
  }

  blocks.push(newBlock)
}

const WELCOME_REFRASA_BLOCK: DocumentationBlock = {
  type: "section",
  title: "Refrasa: Membantu Tulisan Lebih Natural, Tetap di Kendali User",
  paragraphs: [
    "Saat artifak muncul, Anda bisa memakai tombol Refrasa untuk membantu merapikan gaya bahasa agar lebih natural dan lebih mudah dipahami manusia.",
    "Peran fitur ini bukan menggantikan pemikiran Anda, tetapi membantu menyempurnakan kualitas penyajian tulisan. Setelah Refrasa dijalankan, sistem menampilkan perbandingan teks asli dan hasil perbaikan. Keputusan akhir tetap di tangan user: Terapkan atau Batal.",
    "Catatan penting:",
  ],
  list: {
    variant: "numbered",
    items: [
      {
        text: 'Refrasa adalah upaya perbaikan gaya bahasa, bukan jaminan "pasti lolos" alat deteksi tertentu.',
      },
      {
        text: "Struktur penulisan penting (termasuk format markdown dan citation keys) dijaga agar kualitas akademik tetap konsisten.",
      },
    ],
  },
}

const INSTALLATION_REFRASA_BLOCK: DocumentationBlock = {
  type: "section",
  title: "Kenali Fitur Refrasa Setelah Login",
  paragraphs: [
    "Setelah login, Anda bisa langsung mencoba Refrasa saat sudah ada artifak di ruang kerja paper.",
    "Langkah singkat:",
  ],
  list: {
    variant: "numbered",
    items: [
      { text: "Klik menu Chat di header." },
      { text: "Buka percakapan paper sampai artifak muncul." },
      { text: "Buka artifak dalam mode panel atau fullscreen." },
      { text: "Klik tombol Refrasa." },
      { text: "Tinjau perbandingan teks asli dan hasil perbaikan." },
      { text: "Klik Terapkan jika sesuai, atau Batal jika belum sesuai." },
      {
        text: "Catatan: Tombol Refrasa aktif jika konten artifak minimal 50 karakter dan tipe artifak bukan chart.",
      },
      {
        text: "Catatan: Pada kondisi maintenance, tombol Refrasa bisa sementara tidak ditampilkan.",
      },
    ],
  },
}

const QUICKSTART_REFRASA_BLOCK: DocumentationBlock = {
  type: "section",
  title: "3) Rapikan Gaya Tulisan dengan Refrasa Saat Artifak Muncul",
  paragraphs: [
    "Setelah artifak tahap muncul, Anda bisa pakai Refrasa untuk membantu membuat gaya bahasa lebih natural dan lebih mudah dibaca.",
    "Cara pakai cepat:",
  ],
  list: {
    variant: "numbered",
    items: [
      { text: "Buka artifak yang ingin dirapikan." },
      { text: "Klik Refrasa (tersedia di mode panel dan fullscreen)." },
      { text: "Tinjau daftar catatan perbaikan, lalu bandingkan teks asli dan hasil perbaikan." },
      { text: "Klik Terapkan jika hasilnya sudah sesuai arah penulisan Anda." },
      {
        text: "Hasil Refrasa disimpan sebagai versi artifak berikutnya, jadi riwayat perubahan tetap rapi.",
      },
      {
        text: "Refrasa membantu kualitas penyajian bahasa, bukan memindahkan keputusan akademik dari user ke sistem.",
      },
      {
        text: "Refrasa adalah upaya peningkatan naturalness tulisan, bukan jaminan mutlak atas penilaian alat deteksi tertentu.",
      },
    ],
  },
}

export const updateDocumentationRefrasaS1S2S3 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const results: Array<{ slug: string; updated: boolean }> = []

    // S1 - welcome
    const welcome = await ctx.db
      .query("documentationSections")
      .withIndex("by_slug", (q) => q.eq("slug", "welcome"))
      .first()

    if (welcome) {
      const blocks = [...welcome.blocks] as typeof welcome.blocks
      upsertSectionBlock(
        blocks as DocumentationBlock[],
        WELCOME_REFRASA_BLOCK.title ?? "",
        WELCOME_REFRASA_BLOCK,
        "Workflow 13 Tahapan sebagai Pagar Alur"
      )

      const summary =
        "Makalah AI dirancang untuk membantu Anda mengolah gagasan menjadi paper secara bertahap lewat chat. Berdasarkan implementasi saat ini, alur utamanya menggabungkan percakapan, workflow 13 tahapan penyusunan, Refrasa pada artifak, dan kontrol user di setiap keputusan penting."

      await ctx.db.patch(welcome._id, {
        summary,
        blocks,
        searchText: buildSearchText({
          title: welcome.title,
          summary,
          blocks: blocks as DocumentationBlock[],
        }),
        updatedAt: now,
      })
      results.push({ slug: "welcome", updated: true })
    } else {
      results.push({ slug: "welcome", updated: false })
    }

    // S2 - installation
    const installation = await ctx.db
      .query("documentationSections")
      .withIndex("by_slug", (q) => q.eq("slug", "installation"))
      .first()

    if (installation) {
      const blocks = [...installation.blocks] as typeof installation.blocks
      upsertSectionBlock(
        blocks as DocumentationBlock[],
        INSTALLATION_REFRASA_BLOCK.title ?? "",
        INSTALLATION_REFRASA_BLOCK,
        "Setelah Berhasil Masuk"
      )

      await ctx.db.patch(installation._id, {
        blocks,
        searchText: buildSearchText({
          title: installation.title,
          summary: installation.summary,
          blocks: blocks as DocumentationBlock[],
        }),
        updatedAt: now,
      })
      results.push({ slug: "installation", updated: true })
    } else {
      results.push({ slug: "installation", updated: false })
    }

    // S3 - quickstart
    const quickstart = await ctx.db
      .query("documentationSections")
      .withIndex("by_slug", (q) => q.eq("slug", "quickstart"))
      .first()

    if (quickstart) {
      const blocks = [...quickstart.blocks] as typeof quickstart.blocks

      const urutanIndex = (blocks as DocumentationBlock[]).findIndex(
        (block) => block.type === "section" && block.title === "Urutan Cepat yang Direkomendasikan"
      )

      if (urutanIndex >= 0 && (blocks as DocumentationBlock[])[urutanIndex].type === "section") {
        ;(blocks as DocumentationBlock[])[urutanIndex] = {
          ...(blocks as DocumentationBlock[])[urutanIndex],
          list: {
            variant: "numbered",
            items: [
              { text: "Mulai dari template di halaman chat." },
              { text: "Pantau Sesi paper untuk melihat artifak yang sudah dibuat." },
              { text: "Rapikan gaya bahasa artifak dengan Refrasa jika diperlukan." },
              { text: "Pantau Linimasa progres untuk tahu Anda sedang ada di tahap berapa." },
            ],
          },
        }
      }

      // Rename linimasa block numbering from 3) to 4)
      const linimasaIndex = (blocks as DocumentationBlock[]).findIndex(
        (block) =>
          block.type === "section" &&
          typeof block.title === "string" &&
          block.title.startsWith("3) Pantau Linimasa progres")
      )
      if (linimasaIndex >= 0 && (blocks as DocumentationBlock[])[linimasaIndex].type === "section") {
        ;(blocks as DocumentationBlock[])[linimasaIndex] = {
          ...(blocks as DocumentationBlock[])[linimasaIndex],
          title: '4) Pantau Linimasa progres untuk Jawaban "Saya Lagi di Tahap Apa?"',
        }
      }

      upsertSectionBlock(
        blocks as DocumentationBlock[],
        QUICKSTART_REFRASA_BLOCK.title ?? "",
        QUICKSTART_REFRASA_BLOCK,
        "Definisi Artifak di Makalah AI"
      )

      await ctx.db.patch(quickstart._id, {
        blocks,
        searchText: buildSearchText({
          title: quickstart.title,
          summary: quickstart.summary,
          blocks: blocks as DocumentationBlock[],
        }),
        updatedAt: now,
      })
      results.push({ slug: "quickstart", updated: true })
    } else {
      results.push({ slug: "quickstart", updated: false })
    }

    return {
      success: true,
      updatedAt: now,
      results,
      message: "Patch Refrasa untuk section S1/S2/S3 berhasil dijalankan.",
    }
  },
})

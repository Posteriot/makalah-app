import { internalMutation } from "../_generated/server"

const REFRASE_SECTION = {
  slug: "refrasa",
  title: "Refrasa",
  group: "Fitur Utama",
  order: 7,
  icon: "Zap",
  summary:
    "Refrasa membantu merapikan gaya bahasa artifak agar lebih natural dan mudah dibaca, dengan keputusan akhir tetap di tangan user.",
  blocks: [
    {
      type: "section" as const,
      title: "Apa Itu Refrasa",
      paragraphs: [
        "Refrasa adalah fitur untuk memperbaiki gaya penulisan pada artifak, supaya teks lebih natural tanpa mengubah makna inti tulisan.",
      ],
      list: {
        variant: "bullet" as const,
        items: [
          { text: "Bekerja pada konten artifak, bukan sekadar balasan chat." },
          { text: "Membantu keterbacaan dan naturalness bahasa akademik." },
          { text: "Keputusan akhir tetap di user melalui dialog konfirmasi." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Syarat Tombol Refrasa Aktif",
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Konten artifak minimal 50 karakter." },
          { text: "Tipe artifak bukan chart." },
          { text: "Status tool Refrasa sedang aktif (tidak dimatikan admin)." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Cara Pakai Singkat",
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Buka artifak di panel atau fullscreen." },
          { text: "Klik tombol **Refrasa**." },
          { text: "Tinjau perbandingan teks asli dan hasil perbaikan." },
          { text: "Pilih **Terapkan** atau **Batal**." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Yang Terjadi Setelah Terapkan",
      list: {
        variant: "bullet" as const,
        items: [
          { text: "Hasil Refrasa disimpan sebagai versi artifak baru." },
          { text: "Riwayat versi tetap tersimpan rapi untuk audit perubahan." },
          { text: "User bisa lanjut revisi dari versi terbaru." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Batas Klaim",
      list: {
        variant: "bullet" as const,
        items: [
          { text: "Refrasa adalah upaya peningkatan naturalness, bukan jaminan mutlak pada alat deteksi tertentu." },
          { text: "Refrasa meningkatkan kualitas bahasa, bukan menggantikan keputusan akademik user." },
        ],
      },
    },
  ],
  searchText:
    "refrasa perbaikan gaya bahasa natural humanize artifak tombol refrasa minimal 50 karakter terapiapkan batalkan terapkan konfirmasi versi baru",
}

export const upsertDocumentationRefrasaS9 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("documentationSections")
      .withIndex("by_slug", (q) => q.eq("slug", REFRASE_SECTION.slug))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: REFRASE_SECTION.title,
        group: REFRASE_SECTION.group,
        order: REFRASE_SECTION.order,
        icon: REFRASE_SECTION.icon,
        summary: REFRASE_SECTION.summary,
        blocks: REFRASE_SECTION.blocks,
        searchText: REFRASE_SECTION.searchText,
        isPublished: true,
        updatedAt: now,
      })

      return {
        success: true,
        action: "updated",
        slug: REFRASE_SECTION.slug,
        sectionId: existing._id,
        updatedAt: now,
      }
    }

    const sectionId = await ctx.db.insert("documentationSections", {
      slug: REFRASE_SECTION.slug,
      title: REFRASE_SECTION.title,
      group: REFRASE_SECTION.group,
      order: REFRASE_SECTION.order,
      icon: REFRASE_SECTION.icon,
      summary: REFRASE_SECTION.summary,
      blocks: REFRASE_SECTION.blocks,
      searchText: REFRASE_SECTION.searchText,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    })

    return {
      success: true,
      action: "inserted",
      slug: REFRASE_SECTION.slug,
      sectionId,
      updatedAt: now,
    }
  },
})

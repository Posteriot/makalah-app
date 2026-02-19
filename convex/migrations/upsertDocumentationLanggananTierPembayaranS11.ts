import { internalMutation } from "../_generated/server"

type DocSection = {
  slug: string
  title: string
  group: string
  order: number
  icon: string
  summary: string
  blocks: Array<{
    type: "section"
    title: string
    description?: string
    paragraphs?: string[]
    list?: {
      variant: "bullet" | "numbered"
      items: Array<{ text: string; subItems?: string[] }>
    }
  }>
}

const LEGACY_COMBINED_SLUG = "langganan-tier-pembayaran"

const SUBSCRIPTION_SECTIONS: DocSection[] = [
  {
    slug: "langganan",
    title: "Langganan",
    group: "Subskripsi",
    order: 8,
    icon: "Settings",
    summary:
      "Panduan ringkas mengenai alur berlangganan, status langganan, dan perubahan akses saat periode langganan berubah.",
    blocks: [
      {
        type: "section",
        title: "Apa yang Dimaksud Langganan",
        paragraphs: [
          "Langganan adalah akses berbayar yang memberi kapasitas pemakaian lebih besar dibanding akun gratis.",
        ],
        list: {
          variant: "numbered",
          items: [
            { text: "User bisa mulai langganan dari area **Langganan** di dashboard." },
            { text: "Proses pembayaran dilakukan lewat checkout di aplikasi." },
            { text: "Setelah pembayaran terkonfirmasi berhasil, status langganan user diperbarui otomatis." },
          ],
        },
      },
      {
        type: "section",
        title: "Cara Mulai Langganan",
        list: {
          variant: "numbered",
          items: [
            { text: "Buka dashboard, lalu masuk ke menu **Langganan**." },
            { text: "Pilih paket berlangganan yang tersedia." },
            { text: "Lanjutkan ke halaman checkout." },
            { text: "Selesaikan pembayaran sampai status dinyatakan berhasil." },
          ],
        },
      },
      {
        type: "section",
        title: "Status Langganan yang Perlu Dipahami",
        list: {
          variant: "numbered",
          items: [
            { text: "Langganan aktif: akses paket berjalan normal." },
            { text: "Menunggu pembayaran: transaksi dibuat tetapi belum terkonfirmasi." },
            { text: "Langganan selesai/berakhir: akses kembali mengikuti status akun saat itu." },
          ],
        },
      },
      {
        type: "section",
        title: "Info Harga",
        paragraphs: [
          "Nominal paket bisa berubah mengikuti kebijakan produk. Untuk angka terbaru, selalu cek halaman **Harga** yang aktif di aplikasi.",
        ],
      },
    ],
  },
  {
    slug: "tier",
    title: "Tier",
    group: "Subskripsi",
    order: 9,
    icon: "Users",
    summary:
      "Penjelasan perbedaan tier user reguler agar pemakaian bisa disesuaikan dengan kebutuhan.",
    blocks: [
      {
        type: "section",
        title: "Tier User Reguler",
        paragraphs: [
          "Saat ini ada tiga tier yang dipakai user reguler: Gratis, BPP (Bayar Per Paper), dan Pro.",
        ],
        list: {
          variant: "numbered",
          items: [
            { text: "**Gratis**: cocok untuk mulai mencoba dengan batas pemakaian tertentu." },
            { text: "**BPP**: pemakaian berbasis kredit, lebih fleksibel saat butuh." },
            { text: "**Pro**: kuota bulanan besar untuk pemakaian lebih intens." },
          ],
        },
      },
      {
        type: "section",
        title: "Cara Kerja Tier Secara Sederhana",
        list: {
          variant: "numbered",
          items: [
            { text: "Sistem membaca status akun user untuk menentukan tier aktif." },
            { text: "Setiap tier punya aturan kapasitas yang berbeda." },
            { text: "Saat kapasitas tidak cukup, sistem akan memberi arahan **Upgrade** atau **Top Up**." },
          ],
        },
      },
      {
        type: "section",
        title: "Saat Perlu Upgrade",
        list: {
          variant: "numbered",
          items: [
            { text: "Pemakaian rutin sudah sering mentok batas." },
            { text: "Lo butuh proses penyusunan paper yang lebih panjang." },
            { text: "Lo pengin alur kerja lebih leluasa tanpa sering berhenti karena limit." },
          ],
        },
      },
    ],
  },
  {
    slug: "pembayaran",
    title: "Pembayaran",
    group: "Subskripsi",
    order: 10,
    icon: "ShieldCheck",
    summary:
      "Panduan metode pembayaran, arti status transaksi, dan syarat unduh kwitansi.",
    blocks: [
      {
        type: "section",
        title: "Metode Pembayaran yang Tersedia",
        paragraphs: [
          "Pembayaran di Makalah AI diproses lewat mitra pembayaran resmi.",
        ],
        list: {
          variant: "numbered",
          items: [
            { text: "QRIS" },
            { text: "Virtual Account" },
            { text: "E-Wallet" },
          ],
        },
      },
      {
        type: "section",
        title: "Alur Pembayaran Singkat",
        list: {
          variant: "numbered",
          items: [
            { text: "User pilih paket atau top up." },
            { text: "Sistem membuat transaksi pembayaran." },
            { text: "User selesaikan pembayaran sesuai metode yang dipilih." },
            { text: "Status transaksi diperbarui otomatis setelah webhook diterima." },
          ],
        },
      },
      {
        type: "section",
        title: "Arti Status Transaksi",
        list: {
          variant: "numbered",
          items: [
            { text: "**Menunggu**: transaksi sudah dibuat, belum terkonfirmasi." },
            { text: "**Berhasil**: pembayaran masuk dan manfaat paket diterapkan." },
            { text: "**Gagal**: transaksi gagal diproses." },
            { text: "**Kedaluwarsa**: batas waktu pembayaran habis." },
          ],
        },
      },
      {
        type: "section",
        title: "Kwitansi",
        paragraphs: [
          "Kwitansi hanya tersedia untuk transaksi dengan status **Berhasil**.",
        ],
      },
    ],
  },
]

function buildSearchText(section: DocSection): string {
  const chunks: string[] = [section.title, section.summary]

  for (const block of section.blocks) {
    chunks.push(block.title, block.description ?? "")
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

export const upsertDocumentationLanggananTierPembayaranS11 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()

    const legacy = await ctx.db
      .query("documentationSections")
      .withIndex("by_slug", (q) => q.eq("slug", LEGACY_COMBINED_SLUG))
      .first()

    if (legacy) {
      await ctx.db.delete(legacy._id)
    }

    const results: Array<{ slug: string; action: "inserted" | "updated"; sectionId: string }> = []

    for (const section of SUBSCRIPTION_SECTIONS) {
      const searchText = buildSearchText(section)
      const existing = await ctx.db
        .query("documentationSections")
        .withIndex("by_slug", (q) => q.eq("slug", section.slug))
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, {
          title: section.title,
          group: section.group,
          order: section.order,
          icon: section.icon,
          summary: section.summary,
          blocks: section.blocks,
          searchText,
          isPublished: true,
          updatedAt: now,
        })
        results.push({ slug: section.slug, action: "updated", sectionId: existing._id })
      } else {
        const sectionId = await ctx.db.insert("documentationSections", {
          slug: section.slug,
          title: section.title,
          group: section.group,
          order: section.order,
          icon: section.icon,
          summary: section.summary,
          blocks: section.blocks,
          searchText,
          isPublished: true,
          createdAt: now,
          updatedAt: now,
        })
        results.push({ slug: section.slug, action: "inserted", sectionId })
      }
    }

    return {
      success: true,
      removedLegacySlug: Boolean(legacy),
      results,
      updatedAt: now,
    }
  },
})

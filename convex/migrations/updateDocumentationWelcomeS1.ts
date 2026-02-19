import { internalMutation } from "../_generated/server"

const WELCOME_SECTION = {
  title: "Selamat Datang",
  group: "Mulai",
  order: 1,
  icon: "BookOpen",
  headerIcon: "Lightbulb",
  summary:
    "Makalah AI dirancang untuk membantu Anda mengolah gagasan menjadi paper secara bertahap lewat chat. Berdasarkan implementasi saat ini, alur utamanya menggabungkan percakapan, workflow 13 tahapan penyusunan, dan kontrol user di setiap keputusan penting.",
  blocks: [
    {
      type: "section" as const,
      title: "Apa itu Makalah AI?",
      paragraphs: [
        "Makalah AI adalah aplikasi penyusunan paper berbasis percakapan. Anda tidak perlu alur prompt yang rumit karena gagasan diproses runtut oleh Agent Makalah sampai menjadi paper utuh.",
      ],
    },
    {
      type: "section" as const,
      title: "Prinsip Kolaborasi: User Tetap Pengarah Utama",
      paragraphs: [
        "Makalah AI diposisikan sebagai kolaborator, bukan pengganti peran Anda sebagai penulis. Dalam praktiknya, proses disusun agar user tetap aktif: memberi konteks, memilih arah, menilai kualitas naskah per tahap, lalu memutuskan apakah tahap dilanjutkan atau direvisi.",
        "Dengan pola ini, paper disusun sampai utuh melalui kolaborasi manusia + AI. AI menjalankan pekerjaan teknis penulisan dan pengawalan alur, sementara keputusan akademik tetap berada di tangan user.",
      ],
      list: {
        variant: "numbered" as const,
        items: [
          {
            text: "Bertindak sebagai juru tulis teknis yang menuliskan konten paper di setiap tahap aktif, berdasarkan konteks yang sudah disepakati bersama user.",
          },
          {
            text: "Mengubah hasil diskusi menjadi output kerja yang bisa langsung ditinjau dan disempurnakan pada tahap berikutnya, bukan sekadar balasan chat.",
          },
          {
            text: "Mengawal kesinambungan penyusunan dari tahap awal sampai tahap akhir agar proses bergerak menuju paper utuh.",
          },
          {
            text: "Membantu merangkum temuan, menata struktur argumen, dan merapikan alur tulisan agar kualitas akademiknya meningkat.",
          },
          {
            text: "Menjalankan proses per tahap secara disiplin dan menunggu keputusan user (Revisi atau Approve & Lanjut) sebelum berpindah.",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Workflow 13 Tahapan sebagai Pagar Alur",
      paragraphs: [
        "Fitur istimewa Makalah AI ada di mekanisme alur 13 tahapan yang berfungsi sebagai pagar alur penyusunan. Secara desain, pagar ini menjaga proses tetap berada di jalur paper dan mencegah alur kerja melompat-lompat tahap.",
        "Artinya, user tidak perlu ruwet soal prompt teknis. Anda bisa ngobrol secara lumrah, berdiskusi seperti biasa, lalu sistem menjaga ritme kerja tahap demi tahap sampai paper utuh selesai.",
        "Cara kerja pagarnya:",
      ],
      list: {
        variant: "numbered" as const,
        items: [
          {
            text: "Prompt mode paper mengarahkan AI untuk fokus ke tahap aktif dan tidak loncat tahap.",
          },
          {
            text: "Tool penyimpanan data tahap mengunci update ke tahap yang sedang aktif.",
          },
          {
            text: "Backend menolak update jika tahap tidak cocok atau statusnya belum memungkinkan.",
          },
          {
            text: "Perpindahan tahap tetap menunggu keputusan user lewat validasi.",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Apa yang Bisa Anda Lakukan Saat Ini",
      paragraphs: ["Berdasarkan implementasi saat ini, Anda bisa:"],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Klik menu Chat di header atas untuk masuk ke ruang kerja penulisan." },
          {
            text: "Di halaman chat, mulai percakapan baru untuk memulai penyusunan paper.",
          },
          {
            text: "Jika ingin lanjut pekerjaan lama, pilih percakapan sebelumnya dari daftar riwayat.",
          },
          {
            text: "Ikuti alur kerja yang dipandu sistem dari tahap awal sampai paper utuh selesai.",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Cara Mulai dari Beranda",
      paragraphs: ["Langkah mulai dari sudut pandang user:"],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Di beranda, klik tombol AYO MULAI." },
          {
            text: "Jika belum punya akun atau belum login, lanjut ke proses masuk/daftar.",
          },
          {
            text: "Jika sudah login tetapi onboarding belum selesai, ikuti onboarding singkat terlebih dulu.",
          },
          {
            text: "Setelah onboarding selesai, klik menu Chat di header untuk mulai diskusi penyusunan paper.",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Cara Pakai Halaman Dokumentasi",
      paragraphs: [
        "Halaman dokumentasi memuat konten section dari database dan menampilkan section yang sudah dipublish.",
      ],
      list: {
        variant: "bullet" as const,
        items: [
          { text: "Navigasi dibagi per grup menu." },
          {
            text: "Ada pencarian Cari dokumentasi... untuk memudahkan temuan topik.",
          },
          {
            text: "Saat mengetik kata kunci, sistem menampilkan hasil teratas (maksimal 6 hasil).",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Akses Halaman Publik dan Navigasi",
      list: {
        variant: "bullet" as const,
        items: [
          { text: "Menu Dokumentasi tersedia di navigasi header situs." },
          { text: "Halaman dokumentasi bisa dibuka tanpa login." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Ke Mana Setelah Ini",
      list: {
        variant: "numbered" as const,
        items: [
          {
            text: "Klik menu Dokumentasi di header, lalu buka bagian Memulai untuk memahami alur masuk/daftar sampai bisa memakai chat.",
          },
          {
            text: "Dari bagian yang sama, lanjut klik Panduan Cepat untuk langkah praktis dari ide sampai naskah awal.",
          },
          {
            text: "Setelah itu, klik Workflow 13 Tahapan Penyusunan agar paham ritme kerja lengkap sampai paper utuh.",
          },
        ],
      },
    },
  ],
}

const buildSearchText = (section: {
  title: string
  summary?: string
  blocks: Array<{
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
  }>
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

export const updateDocumentationWelcomeS1 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("documentationSections")
      .withIndex("by_slug", (q) => q.eq("slug", "welcome"))
      .first()

    if (!existing) {
      return {
        success: false,
        message: "Section dengan slug 'welcome' tidak ditemukan.",
      }
    }

    const searchText = buildSearchText({
      title: WELCOME_SECTION.title,
      summary: WELCOME_SECTION.summary,
      blocks: WELCOME_SECTION.blocks,
    })

    await ctx.db.patch(existing._id, {
      title: WELCOME_SECTION.title,
      group: WELCOME_SECTION.group,
      order: WELCOME_SECTION.order,
      icon: WELCOME_SECTION.icon,
      headerIcon: WELCOME_SECTION.headerIcon,
      summary: WELCOME_SECTION.summary,
      blocks: WELCOME_SECTION.blocks,
      searchText,
      isPublished: true,
      updatedAt: now,
    })

    return {
      success: true,
      message: "Section 'welcome' berhasil diupdate sesuai S1 final.",
      sectionId: existing._id,
      slug: "welcome",
      title: WELCOME_SECTION.title,
      updatedAt: now,
    }
  },
})

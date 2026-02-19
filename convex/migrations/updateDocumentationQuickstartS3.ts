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

const QUICKSTART_SECTION = {
  title: "Panduan Cepat",
  group: "Mulai",
  order: 3,
  icon: "Zap",
  headerIcon: "Zap",
  summary:
    "Panduan ini membantu Anda mulai menyusun paper dengan cepat lewat alur yang sederhana: mulai dari template chat, pantau sesi paper dan artifak, lalu validasi tahap sampai naskah makin utuh.",
  blocks: [
    {
      type: "section" as const,
      title: "Urutan Cepat yang Direkomendasikan",
      paragraphs: [
        "Ikuti urutan ini agar alur langsung nyambung ke fitur utama Makalah AI.",
      ],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Mulai dari template di halaman chat." },
          { text: "Pantau Sesi paper untuk melihat artifak yang sudah dibuat." },
          { text: "Pantau Linimasa progres untuk tahu Anda sedang ada di tahap berapa." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "1) Mulai dari Template di Halaman Chat",
      paragraphs: [
        "Template memulai muncul saat Anda pertama kali membuka Chat dan saat masuk ke percakapan baru yang masih kosong setelah klik Percakapan Baru.",
      ],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Template yang tersedia: Kita diskusi dulu!" },
          { text: "Template yang tersedia: Ayo kolaborasi menyusun paper akademik!" },
          {
            text: "Untuk memicu alur paper, pakai template kedua atau kirim pesan dengan niat menulis paper yang jelas.",
          },
          {
            text: "Setelah intent terbaca, sistem menyiapkan sesi paper dulu, lalu diskusi lanjut per tahap.",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "2) Pantau Sesi paper di Activity Bar",
      paragraphs: [
        "Buka menu Sesi paper (ikon dokumen) untuk melihat folder kerja paper.",
      ],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Lihat Paper working title." },
          { text: "Lihat posisi tahap saat ini, misalnya Stage 6/13 - Tinjauan Literatur." },
          { text: "Lihat jumlah artifak yang sudah tersedia." },
          {
            text: "Lihat daftar artifak terbaru beserta label versi (v1, v2, dan seterusnya) dan status (FINAL atau REVISI).",
          },
          {
            text: "Edit Paper working title langsung dari panel ini lewat ikon pensil di sisi kanan nama paper.",
          },
          {
            text: "Catatan: Paper working title hanya bisa diedit sebelum judul final paper ditetapkan.",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Definisi Artifak di Makalah AI",
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Dalam alur normal 13 tahap, artifak dipakai sebagai output kerja tiap tahap." },
          {
            text: "Artifak adalah output kerja non-chat yang ditulis AI dan disimpan terpisah dari balasan percakapan.",
          },
          {
            text: "Artifak menyimpan hasil teknis tahap yang sedang dikerjakan. Contoh: saat Anda di tahap Pendahuluan, naskah pendahuluan yang sudah disusun ada di artifak.",
          },
          {
            text: "Jika Anda ingin lanjut manual dengan gaya sendiri, konten artifak bisa langsung disalin, ditempel, lalu direvisi sendiri.",
          },
          { text: "Artifak terikat ke percakapan dan pemilik akun." },
          { text: "Artifak bisa berupa outline, section naskah, tabel, sitasi, formula, code, atau chart." },
          { text: "Artifak punya versi, jadi perubahan tidak menimpa versi lama." },
          {
            text: "Sistem memasukkan ringkasan artifak tahap yang sudah tervalidasi ke konteks kerja AI tahap berikutnya supaya agen tetap konsisten dengan keputusan sebelumnya.",
          },
          {
            text: "Daftar di Sesi paper menampilkan versi terbaru per item kerja agar panel tetap ringkas.",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "3) Pantau Linimasa progres",
      paragraphs: [
        "Buka menu Linimasa progres (ikon jalur) untuk melihat pemandu tahap 1 sampai 13.",
      ],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Lihat Paper working title." },
          { text: "Lihat persentase progres total dan posisi stage (misalnya 46% - Stage 6/13)." },
          { text: "Lihat tahap yang sudah selesai." },
          { text: "Lihat tahap yang sedang berjalan sekarang." },
          { text: "Lihat tahap berikutnya yang belum dikerjakan." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Cara Pakai Tombol Validasi Tahap",
      paragraphs: [
        "Di akhir satu tahap, gunakan panel validasi untuk menentukan lanjut atau revisi.",
      ],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Klik Revisi jika masih ada bagian yang perlu diperbaiki." },
          { text: "Tulis feedback spesifik, lalu klik Kirim Feedback." },
          { text: "Klik Approve & Lanjut jika isi tahap sudah sesuai." },
          { text: "Ulangi pola ini sampai semua tahap selesai." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Lanjutkan Pekerjaan Lama Tanpa Mulai Ulang",
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Buka daftar percakapan di sidebar." },
          { text: "Klik judul percakapan yang ingin dilanjutkan." },
          { text: "Sistem membuka percakapan yang sama beserta progres papernya." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Gunakan Upload File Jika Punya Bahan Awal",
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Klik tombol lampiran di area input chat." },
          { text: "Pilih file yang didukung, misalnya PDF, DOC/DOCX, XLSX, TXT, atau gambar." },
          { text: "Pastikan ukuran file tidak lebih dari 10MB." },
          { text: "Lanjutkan diskusi berdasarkan file yang sudah terpasang." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Jika Respons Agen Terasa Melenceng",
      paragraphs: [
        "Gunakan langkah praktis ini agar alur cepat balik ke tujuan paper Anda.",
      ],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Jelaskan koreksi secara tegas di chat (apa yang harus diubah)." },
          { text: "Jika agen sedang menulis terlalu panjang, gunakan tombol Stop." },
          { text: "Di tahap validasi, pilih Revisi lalu tulis arahan yang lebih spesifik." },
          { text: "Lanjutkan setelah respons kembali sesuai tujuan paper Anda." },
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

export const updateDocumentationQuickstartS3 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("documentationSections")
      .withIndex("by_slug", (q) => q.eq("slug", "quickstart"))
      .first()

    if (!existing) {
      return {
        success: false,
        message: "Section dengan slug 'quickstart' tidak ditemukan.",
      }
    }

    const searchText = buildSearchText({
      title: QUICKSTART_SECTION.title,
      summary: QUICKSTART_SECTION.summary,
      blocks: QUICKSTART_SECTION.blocks,
    })

    await ctx.db.patch(existing._id, {
      title: QUICKSTART_SECTION.title,
      group: QUICKSTART_SECTION.group,
      order: QUICKSTART_SECTION.order,
      icon: QUICKSTART_SECTION.icon,
      headerIcon: QUICKSTART_SECTION.headerIcon,
      summary: QUICKSTART_SECTION.summary,
      blocks: QUICKSTART_SECTION.blocks,
      searchText,
      isPublished: true,
      updatedAt: now,
    })

    return {
      success: true,
      message: "Section 'quickstart' berhasil diupdate sesuai S3 final.",
      sectionId: existing._id,
      slug: "quickstart",
      title: QUICKSTART_SECTION.title,
      updatedAt: now,
    }
  },
})

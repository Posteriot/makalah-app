import { internalMutation } from "../_generated/server"

type DocListItem = { text: string; subItems?: string[] }
type DocSectionBlock = {
  type: "section"
  title: string
  description?: string
  paragraphs?: string[]
  list?: {
    variant: "bullet" | "numbered"
    items: DocListItem[]
  }
}

type DocSection = {
  slug: string
  title: string
  group: string
  order: number
  icon: string
  summary: string
  blocks: DocSectionBlock[]
}

const LEGAL_SECTIONS: DocSection[] = [
  {
    slug: "security",
    title: "Keamanan Data",
    group: "Panduan Lanjutan",
    order: 11,
    icon: "ShieldCheck",
    summary:
      "Makalah AI dirancang dengan prinsip bahwa data Anda adalah milik Anda sepenuhnya, dengan pengamanan berlapis untuk akses akun, file, dan transaksi.",
    blocks: [
      {
        type: "section",
        title: "Komitmen Kami terhadap Keamanan Anda",
        paragraphs: [
          "Keamanan bukan sekadar fitur, tapi pondasi dari Makalah AI. Kami memastikan setiap data yang Anda olah di sini tetap privat dan terjaga.",
        ],
      },
      {
        type: "section",
        title: "1. Perlindungan Akses Akun",
        list: {
          variant: "bullet",
          items: [
            { text: "**Autentikasi Ketat**: Hanya Anda yang bisa mengakses area kerja dan riwayat riset Anda." },
            { text: "**Validasi Kepemilikan**: Sistem melakukan pengecekan ganda di backend untuk memastikan data memang milik akun Anda." },
            { text: "**Login Sosial Tepercaya**: Kami menggunakan Google OAuth untuk proses masuk yang aman tanpa menyimpan password di sistem kami." },
          ],
        },
      },
      {
        type: "section",
        title: "2. Keamanan Saat Menyusun Paper",
        list: {
          variant: "bullet",
          items: [
            { text: "**Alur Kerja Terkunci**: Workflow paper dirancang bertahap agar tidak ada akses ilegal ke draf yang sedang dikerjakan." },
            { text: "**Jejak Sumber**: Setiap referensi yang diambil oleh AI dicatat sebagai jejak kerja yang bisa Anda verifikasi." },
          ],
        },
      },
      {
        type: "section",
        title: "3. Keamanan File dan Lampiran",
        list: {
          variant: "bullet",
          items: [
            { text: "**Upload Terproteksi**: File riset disimpan di storage terenkripsi dan hanya dapat di akses melalui izin akun Anda." },
            { text: "**Batas Aman**: Pembatasan ukuran file 10MB untuk menjaga performa dan keamanan ekstraksi." },
          ],
        },
      },
      {
        type: "section",
        title: "4. Standar Pembayaran Global",
        list: {
          variant: "bullet",
          items: [
            { text: "**Mitra Terverifikasi**: Transaksi diproses melalui Xendit. Kami tidak pernah menyimpan data kartu kredit atau PIN Anda." },
            { text: "**Proteksi Webhook**: Setiap transaksi diverifikasi ulang dengan token unik untuk mencegah manipulasi data." },
          ],
        },
      },
      {
        type: "section",
        title: "5. Apa yang Bisa Anda Lakukan?",
        list: {
          variant: "bullet",
          items: [
            { text: "**Gunakan Password Kuat**: Jika tidak menggunakan login sosial." },
            { text: "**Anonimisasi**: Hindari mengunggah data rahasia seperti nomor PIN ke dalam percakapan AI." },
          ],
        },
      },
    ],
  },
  {
    slug: "privacy-policy",
    title: "Kebijakan Privasi",
    group: "Panduan Lanjutan",
    order: 12,
    icon: "Globe",
    summary:
      "Penjelasan data yang dikumpulkan, cara penggunaan data, pemrosesan oleh pihak ketiga, dan hak pengguna dalam layanan Makalah AI.",
    blocks: [
      {
        type: "section",
        title: "1. Data yang Kami Kumpulkan",
        paragraphs: ["Untuk menjalankan fungsi aplikasi, kami mengumpulkan:"],
        list: {
          variant: "bullet",
          items: [
            { text: "**Data Profil**: Nama dan alamat email saat Anda mendaftar (via Google atau formulir langsung)." },
            { text: "**Konten Riset**: Pesan chat, draf paper, dan file lampiran yang Anda unggah untuk diproses oleh AI." },
            { text: "**Data Transaksi**: Informasi transaksi pembayaran (melalui mitra Xendit) untuk pengelolaan langganan." },
            { text: "**Data Teknis**: Log aktivitas dasar untuk memastikan layanan tetap stabil dan aman." },
          ],
        },
      },
      {
        type: "section",
        title: "2. Bagaimana Kami Menggunakan Data Anda",
        paragraphs: ["Tujuan utama penggunaan data Anda adalah untuk:"],
        list: {
          variant: "bullet",
          items: [
            { text: "Memberikan layanan penulisan dan riset akademis berbasis AI." },
            { text: "Memproses pembayaran langganan fitur pro." },
            { text: "Memenuhi kebutuhan keamanan seperti verifikasi login dan pemulihan akun." },
            { text: "Mengirimkan update penting mengenai status layanan atau pemberitahuan akun." },
          ],
        },
      },
      {
        type: "section",
        title: "3. Pemrosesan AI dan Pihak Ketiga",
        paragraphs: ["Untuk memberikan hasil terbaik, data konten Anda diproses menggunakan:"],
        list: {
          variant: "bullet",
          items: [
            { text: "**Penyedia AI**: Konten riset dikirimkan ke model AI (seperti Google Gemini atau OpenAI) untuk diolah menjadi draf paper." },
            { text: "**Penyedia Pembayaran**: Data transaksi diproses secara aman oleh Xendit sesuai standar PCI-DSS." },
            { text: "**Autentikasi**: Kami menggunakan layanan pihak ketiga untuk akses masuk yang aman (OAuth)." },
          ],
        },
      },
      {
        type: "section",
        title: "4. Keamanan dan Penyimpanan",
        paragraphs: [
          "Data Anda disimpan dalam basis data terenkripsi. Kami menerapkan pemeriksaan kepemilikan ketat sehingga hanya akun Anda yang memiliki akses ke data chat dan paper yang Anda buat.",
        ],
      },
      {
        type: "section",
        title: "5. Kontrol dan Hak Anda",
        paragraphs: ["Sebagai pengguna, Anda berhak untuk:"],
        list: {
          variant: "bullet",
          items: [
            { text: "Memperbarui informasi profil Anda secara langsung di aplikasi." },
            { text: "Menghapus riwayat percakapan atau draf paper kapan saja." },
            { text: "Mengajukan penutupan akun melalui kanal dukungan kami." },
          ],
        },
      },
      {
        type: "section",
        title: "6. Kontak Kami",
        paragraphs: [
          "Jika ada pertanyaan mengenai privasi data Anda, silakan hubungi tim kami di:",
        ],
        list: {
          variant: "bullet",
          items: [
            { text: "**Email**: dukungan@makalah.ai" },
            { text: "**Alamat**: Jl. H. Jian, Kebayoran Baru, Jakarta Selatan" },
          ],
        },
      },
    ],
  },
  {
    slug: "terms",
    title: "Ketentuan Layanan",
    group: "Panduan Lanjutan",
    order: 13,
    icon: "FileText",
    summary:
      "Ketentuan penggunaan layanan Makalah AI, termasuk hak, batas tanggung jawab, pembayaran, hukum yang berlaku, dan kontak resmi.",
    blocks: [
      {
        type: "section",
        title: "1. Ketentuan Penggunaan",
        paragraphs: [
          "Layanan ini disediakan untuk membantu Anda dalam proses riset dan penyusunan karya tulis. Anda setuju untuk tidak menggunakan layanan ini untuk tujuan ilegal atau melanggar hak kekayaan intelektual orang lain.",
        ],
      },
      {
        type: "section",
        title: "2. Lisensi dan Hak Kekayaan Intelektual",
        paragraphs: [
          "Seluruh output yang dihasilkan oleh AI melalui akun Anda adalah hak milik Anda. Namun, Makalah AI tetap memiliki hak atas infrastruktur, desain, dan algoritma sistem yang disediakan dalam platform.",
        ],
      },
      {
        type: "section",
        title: "3. Batasan Tanggung Jawab (Disclaimer)",
        paragraphs: [
          "Meskipun AI kami dirancang untuk akurasi tinggi, hasil yang diberikan harus ditinjau kembali oleh pengguna. Makalah AI tidak bertanggung jawab atas kesalahan faktual, kutipan yang tidak akurat, atau konsekuensi akademis yang muncul dari penggunaan output AI tanpa verifikasi manusia.",
        ],
      },
      {
        type: "section",
        title: "4. Pembayaran dan Pembatalan",
        paragraphs: [
          "Beberapa fitur memerlukan akses berbayar melalui mitra kami, Xendit. Pembelian bersifat final kecuali dinyatakan lain dalam kebijakan pengembalian dana kami. Anda bertanggung jawab untuk menjaga keamanan akun dan informasi pembayaran Anda.",
        ],
      },
      {
        type: "section",
        title: "5. Perubahan Layanan",
        paragraphs: [
          "Kami berhak mengubah atau menghentikan bagian apa pun dari layanan kami sewaktu-waktu tanpa pemberitahuan sebelumnya, demi peningkatan kualitas atau pemenuhan kepatuhan regulasi.",
        ],
      },
      {
        type: "section",
        title: "6. Hukum yang Berlaku",
        paragraphs: [
          "Ketentuan ini diatur oleh hukum Republik Indonesia. Setiap perselisihan yang muncul akan diselesaikan melalui musyawarah atau melalui jalur hukum sesuai yurisdiksi yang berlaku.",
        ],
      },
      {
        type: "section",
        title: "7. Kontak",
        paragraphs: [
          "Untuk pertanyaan mengenai Ketentuan Layanan ini, silakan hubungi kami di:",
        ],
        list: {
          variant: "bullet",
          items: [
            { text: "**Email**: dukungan@makalah.ai" },
            { text: "**Alamat**: PT THE MANAGEMENT ASIA, Jl. H. Jian, Kebayoran Baru, Jakarta Selatan" },
          ],
        },
      },
    ],
  },
]

function buildSearchText(section: DocSection) {
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

export const upsertDocumentationLegalS7S8S10 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const results: Array<{ slug: string; action: "inserted" | "updated"; sectionId: string }> = []

    for (const section of LEGAL_SECTIONS) {
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
      updatedAt: now,
      results,
    }
  },
})

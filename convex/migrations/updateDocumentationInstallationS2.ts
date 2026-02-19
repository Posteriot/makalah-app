import { internalMutation } from "../_generated/server"

const INSTALLATION_SECTION = {
  title: "Memulai",
  group: "Mulai",
  order: 2,
  icon: "Settings",
  headerIcon: "Rocket",
  summary:
    "Halaman ini membantu Anda mulai memakai Makalah AI dari nol: masuk atau daftar akun, menyelesaikan verifikasi yang dibutuhkan, lalu lanjut ke ruang kerja penulisan.",
  blocks: [
    {
      type: "section" as const,
      title: "Cara Masuk dari Navigasi Utama",
      paragraphs: [
        "Kalau Anda sedang membuka situs Makalah AI, cara paling mudah adalah lewat menu di header atas.",
      ],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Klik tombol Masuk di header." },
          {
            text: "Di halaman masuk, pilih metode yang paling nyaman.",
            subItems: [
              "Masuk dengan Google",
              "Email + password",
              "Masuk via Magic Link (link masuk lewat email)",
            ],
          },
          { text: "Ikuti instruksi di layar sampai login berhasil." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Cara Daftar Akun Baru",
      paragraphs: [
        "Kalau belum punya akun, Anda bisa daftar dari halaman masuk atau dari tombol utama di beranda.",
      ],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Dari halaman masuk, klik Daftar." },
          { text: "Atau dari beranda, klik tombol AYO MULAI untuk masuk ke alur pendaftaran." },
          {
            text: "Isi form pendaftaran sesuai input yang tersedia.",
            subItems: [
              "Nama depan (wajib)",
              "Nama belakang (kolom tersedia untuk dilengkapi)",
              "Email (wajib)",
              "Password (wajib, minimal 8 karakter)",
            ],
          },
          { text: "Setelah klik Daftar, cek email verifikasi." },
          {
            text: "Jika email belum terlihat di inbox utama, cek juga folder/tab Spam, Junk, Updates, dan Promosi.",
          },
          { text: "Setelah akun aktif, lanjut masuk dan mulai gunakan aplikasi." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Khusus Daftar dengan Google: Buat Password di Atur Akun",
      paragraphs: [
        "Kalau Anda daftar/masuk memakai Google, tetap disarankan langsung membuat password akun agar metode login Anda lebih fleksibel.",
      ],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Klik menu user di kanan atas header." },
          { text: "Klik Atur Akun." },
          { text: "Buka tab Keamanan." },
          {
            text: "Pada bagian password, isi Password baru dan Konfirmasi password, lalu klik Buat Password.",
          },
          { text: "Setelah itu, akun Google Anda juga bisa dipakai masuk lewat email + password." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Jika Diminta Verifikasi Tambahan (2 Langkah)",
      paragraphs: [
        "Pada kondisi tertentu, sistem akan meminta verifikasi tambahan setelah Anda memasukkan email dan password.",
      ],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Sistem mengarahkan Anda ke halaman verifikasi 2 langkah." },
          { text: "Masukkan kode OTP 6 digit yang dikirim ke email." },
          { text: "Jika perlu, Anda bisa kirim ulang OTP atau pakai backup code." },
          { text: "Setelah verifikasi benar, Anda otomatis lanjut ke halaman tujuan." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Jika Lupa Password",
      paragraphs: ["Makalah AI menyediakan pemulihan akses langsung dari halaman masuk."],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Klik Lupa password?." },
          { text: "Masukkan email akun Anda." },
          { text: "Buka link reset password yang dikirim ke email." },
          {
            text: "Jika email belum terlihat di inbox utama, cek juga folder/tab Spam, Junk, Updates, dan Promosi.",
          },
          { text: "Buat password baru, lalu masuk kembali." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Catatan untuk Semua Email Otomatis",
      paragraphs: [
        "Saat Makalah AI mengirim email (misalnya verifikasi pendaftaran, magic link, dan reset password), biasakan cek folder selain inbox utama.",
      ],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Cek inbox utama terlebih dahulu." },
          { text: "Jika belum ada, cek Spam, Junk, Updates, dan Promosi." },
          { text: "Tunggu beberapa menit lalu refresh inbox lagi sebelum meminta kirim ulang." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Setelah Berhasil Masuk",
      paragraphs: ["Sesudah login, sistem akan mengarahkan Anda sesuai konteks akses."],
      list: {
        variant: "numbered" as const,
        items: [
          {
            text: "Kalau Anda datang dari halaman tertentu, sistem mencoba membawa Anda kembali ke halaman tujuan itu.",
          },
          { text: "Kalau tidak ada tujuan khusus, Anda dibawa ke beranda." },
          { text: "Untuk mulai menyusun paper, buka menu Chat di header." },
          {
            text: "Jika onboarding akun free belum selesai, sistem akan mengarahkan Anda dulu ke halaman Get Started sebelum lanjut ke alur normal.",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Ringkasan Alur Paling Aman untuk User Baru",
      paragraphs: ["Supaya tidak bingung, ikuti pola ini:"],
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Klik AYO MULAI." },
          { text: "Selesaikan daftar/masuk." },
          { text: "Ikuti verifikasi jika diminta." },
          { text: "Selesaikan langkah awal di Get Started (kalau muncul)." },
          { text: "Klik menu Chat untuk mulai penyusunan paper." },
        ],
      },
    },
  ],
}

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

export const updateDocumentationInstallationS2 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("documentationSections")
      .withIndex("by_slug", (q) => q.eq("slug", "installation"))
      .first()

    if (!existing) {
      return {
        success: false,
        message: "Section dengan slug 'installation' tidak ditemukan.",
      }
    }

    const searchText = buildSearchText({
      title: INSTALLATION_SECTION.title,
      summary: INSTALLATION_SECTION.summary,
      blocks: INSTALLATION_SECTION.blocks,
    })

    await ctx.db.patch(existing._id, {
      title: INSTALLATION_SECTION.title,
      group: INSTALLATION_SECTION.group,
      order: INSTALLATION_SECTION.order,
      icon: INSTALLATION_SECTION.icon,
      headerIcon: INSTALLATION_SECTION.headerIcon,
      summary: INSTALLATION_SECTION.summary,
      blocks: INSTALLATION_SECTION.blocks,
      searchText,
      isPublished: true,
      updatedAt: now,
    })

    return {
      success: true,
      message: "Section 'installation' berhasil diupdate sesuai S2 final.",
      sectionId: existing._id,
      slug: "installation",
      title: INSTALLATION_SECTION.title,
      updatedAt: now,
    }
  },
})

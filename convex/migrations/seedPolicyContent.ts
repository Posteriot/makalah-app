import { internalMutationGeneric } from "convex/server"

/**
 * Migration: Seed richTextPages with actual policy content as TipTap JSON
 *
 * Run with: npx convex run migrations/seedPolicyContent:seedPolicyContent
 *
 * Updates existing richTextPages records (created by seedRichTextPages)
 * with the full page content converted to TipTap JSON format.
 * If a record doesn't exist yet, it inserts one (isPublished: false).
 *
 * Idempotent: safe to run multiple times (upsert logic).
 */

// ---------------------------------------------------------------------------
// Privacy page content
// ---------------------------------------------------------------------------
const privacyContent = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Makalah AI (dioperasikan oleh PT THE MANAGEMENT ASIA) sangat menghargai privasi Anda. Sebagai aplikasi ",
        },
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "AI Academic Writing Assistant",
        },
        {
          type: "text",
          text: ", kami berkomitmen untuk transparan dalam mengelola data yang Anda berikan agar layanan kami dapat membantu Anda menyusun karya tulis ilmiah dengan maksimal.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "1. Data yang Kami Kumpulkan" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Untuk menjalankan fungsi aplikasi, kami mengumpulkan:",
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Data Profil",
                },
                {
                  type: "text",
                  text: ": Nama dan alamat email saat Anda mendaftar (via Google atau formulir langsung).",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Konten Riset",
                },
                {
                  type: "text",
                  text: ": Pesan chat, draf paper, dan file lampiran yang Anda unggah untuk diproses oleh AI.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Data Transaksi",
                },
                {
                  type: "text",
                  text: ": Informasi transaksi pembayaran (melalui mitra Xendit) untuk pengelolaan langganan.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Data Teknis",
                },
                {
                  type: "text",
                  text: ": Log aktivitas dasar untuk memastikan layanan tetap stabil dan aman.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "2. Bagaimana Kami Menggunakan Data Anda" },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Tujuan utama penggunaan data Anda adalah untuk:",
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Memberikan layanan penulisan dan riset akademis berbasis AI.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Memproses pembayaran langganan fitur pro.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Memenuhi kebutuhan keamanan seperti verifikasi login dan pemulihan akun.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Mengirimkan update penting mengenai status layanan atau pemberitahuan akun.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "3. Pemrosesan AI dan Pihak Ketiga" },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Untuk memberikan hasil terbaik, data konten Anda diproses menggunakan:",
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Penyedia AI",
                },
                {
                  type: "text",
                  text: ": Konten riset dikirimkan ke model AI (seperti Google Gemini atau OpenAI) untuk diolah menjadi draf paper.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Penyedia Pembayaran",
                },
                {
                  type: "text",
                  text: ": Data transaksi diproses secara aman oleh Xendit sesuai standar PCI-DSS.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Autentikasi",
                },
                {
                  type: "text",
                  text: ": Kami menggunakan layanan pihak ketiga untuk akses masuk yang aman (OAuth).",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "4. Keamanan dan Penyimpanan" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Data Anda disimpan dalam basis data terenkripsi. Kami menerapkan pemeriksaan kepemilikan ketat sehingga hanya akun Anda yang memiliki akses ke data chat dan paper yang Anda buat.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "5. Kontrol dan Hak Anda" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Sebagai pengguna, Anda berhak untuk:",
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Memperbarui informasi profil Anda secara langsung di aplikasi.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Menghapus riwayat percakapan atau draf paper kapan saja.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Mengajukan penutupan akun melalui kanal dukungan kami.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "6. Kontak Kami" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Jika ada pertanyaan mengenai privasi data Anda, silakan hubungi tim kami di:",
        },
        { type: "hardBreak" },
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Email",
        },
        { type: "text", text: ": dukungan@makalah.ai" },
        { type: "hardBreak" },
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Alamat",
        },
        {
          type: "text",
          text: ": Jl. H. Jian, Kebayoran Baru, Jakarta Selatan",
        },
      ],
    },
  ],
})

// ---------------------------------------------------------------------------
// Security page content
// ---------------------------------------------------------------------------
const securityContent = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Makalah AI dirancang dengan prinsip bahwa data Anda adalah milik Anda sepenuhnya. Kami membangun sistem keamanan berlapis untuk memastikan akses hanya terbatas pada pemilik akun, setiap transaksi terlindungi, dan seluruh alur kerja AI kami berjalan dalam koridor yang aman dan transparan.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "Komitmen Kami terhadap Keamanan Anda" },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Keamanan bukan sekadar fitur, tapi pondasi dari Makalah AI. Kami memastikan setiap data yang Anda olah di sini tetap privat dan terjaga.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "1. Perlindungan Akses Akun" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Autentikasi Ketat",
                },
                {
                  type: "text",
                  text: ": Hanya Anda yang bisa mengakses area kerja dan riwayat riset Anda.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Validasi Kepemilikan",
                },
                {
                  type: "text",
                  text: ": Sistem melakukan pengecekan ganda di backend untuk memastikan data memang milik akun Anda.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Login Sosial Tepercaya",
                },
                {
                  type: "text",
                  text: ": Kami menggunakan Google OAuth untuk proses masuk yang aman tanpa menyimpan password di sistem kami.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "2. Keamanan Saat Menyusun Paper" },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Alur Kerja Terkunci",
                },
                {
                  type: "text",
                  text: ": Workflow paper dirancang bertahap agar tidak ada akses ilegal ke draf yang sedang dikerjakan.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Jejak Sumber",
                },
                {
                  type: "text",
                  text: ": Setiap referensi yang diambil oleh AI dicatat sebagai jejak kerja yang bisa Anda verifikasi.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "3. Keamanan File dan Lampiran" },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Upload Terproteksi",
                },
                {
                  type: "text",
                  text: ": File riset disimpan di storage terenkripsi dan hanya dapat di akses melalui izin akun Anda.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Batas Aman",
                },
                {
                  type: "text",
                  text: ": Pembatasan ukuran file 10MB untuk menjaga performa dan keamanan ekstraksi.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "4. Standar Pembayaran Global" },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Mitra Terverifikasi",
                },
                {
                  type: "text",
                  text: ": Transaksi diproses melalui Xendit. Kami tidak pernah menyimpan data kartu kredit atau PIN Anda.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Proteksi Webhook",
                },
                {
                  type: "text",
                  text: ": Setiap transaksi diverifikasi ulang dengan token unik untuk mencegah manipulasi data.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "5. Apa yang Bisa Anda Lakukan?" },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Gunakan Password Kuat",
                },
                {
                  type: "text",
                  text: ": Jika tidak menggunakan login sosial.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Anonimisasi",
                },
                {
                  type: "text",
                  text: ": Hindari mengunggah data rahasia seperti nomor PIN ke dalam percakapan AI.",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

// ---------------------------------------------------------------------------
// Terms page content
// ---------------------------------------------------------------------------
const termsContent = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Selamat datang di Makalah AI. Dengan mengakses atau menggunakan layanan kami, Anda setuju untuk terikat oleh Ketentuan Layanan ini. Makalah AI adalah platform asisten penulisan akademis berbasis AI yang dikelola oleh ",
        },
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "PT THE MANAGEMENT ASIA",
        },
        { type: "text", text: "." },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "1. Ketentuan Penggunaan" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Layanan ini disediakan untuk membantu Anda dalam proses riset dan penyusunan karya tulis. Anda setuju untuk tidak menggunakan layanan ini untuk tujuan ilegal atau melanggar hak kekayaan intelektual orang lain.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "2. Lisensi dan Hak Kekayaan Intelektual",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Seluruh output yang dihasilkan oleh AI melalui akun Anda adalah hak milik Anda. Namun, Makalah AI tetap memiliki hak atas infrastruktur, desain, dan algoritma sistem yang disediakan dalam platform.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "3. Batasan Tanggung Jawab (Disclaimer)",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Meskipun AI kami dirancang untuk akurasi tinggi, hasil yang diberikan harus ditinjau kembali oleh pengguna. Makalah AI tidak bertanggung jawab atas kesalahan faktual, kutipan yang tidak akurat, atau konsekuensi akademis yang muncul dari penggunaan output AI tanpa verifikasi manusia.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "4. Pembayaran dan Pembatalan" },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Beberapa fitur memerlukan akses berbayar melalui mitra kami, Xendit. Pembelian bersifat final kecuali dinyatakan lain dalam kebijakan pengembalian dana kami. Anda bertanggung jawab untuk menjaga keamanan akun dan informasi pembayaran Anda.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "5. Perubahan Layanan" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Kami berhak mengubah atau menghentikan bagian apa pun dari layanan kami sewaktu-waktu tanpa pemberitahuan sebelumnya, demi peningkatan kualitas atau pemenuhan kepatuhan regulasi.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "6. Hukum yang Berlaku" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Ketentuan ini diatur oleh hukum Republik Indonesia. Setiap perselisihan yang muncul akan diselesaikan melalui musyawarah atau melalui jalur hukum sesuai yurisdiksi yang berlaku.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "7. Kontak" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Untuk pertanyaan mengenai Ketentuan Layanan ini, silakan hubungi kami di:",
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Email",
                },
                { type: "text", text: ": dukungan@makalah.ai" },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Alamat",
                },
                {
                  type: "text",
                  text: ": PT THE MANAGEMENT ASIA, Jl. H. Jian, Kebayoran Baru, Jakarta Selatan",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------
export const seedPolicyContent = internalMutationGeneric({
  args: {},
  handler: async ({ db }) => {
    console.log("[Migration] Starting seedPolicyContent...")

    const now = Date.now()
    const results: { slug: string; status: string }[] = []

    const pages = [
      {
        slug: "privacy",
        title: "Kebijakan Privasi Makalah AI",
        content: privacyContent,
        lastUpdatedLabel: "TERAKHIR DIPERBARUI: 21 FEBRUARI 2026",
      },
      {
        slug: "security",
        title: "Keamanan Data di Makalah AI",
        content: securityContent,
        lastUpdatedLabel: "TERAKHIR DIPERBARUI: 21 FEBRUARI 2026",
      },
      {
        slug: "terms",
        title: "Ketentuan Layanan Makalah AI",
        content: termsContent,
        lastUpdatedLabel: "TERAKHIR DIPERBARUI: 21 FEBRUARI 2026",
      },
    ]

    for (const page of pages) {
      const existing = await db
        .query("richTextPages")
        .withIndex("by_slug", (q: any) => q.eq("slug", page.slug))
        .first()

      if (existing) {
        await db.patch(existing._id, {
          title: page.title,
          content: page.content,
          lastUpdatedLabel: page.lastUpdatedLabel,
          updatedAt: now,
        })
        console.log(`[Migration] Updated "${page.slug}"`)
        results.push({ slug: page.slug, status: "updated" })
      } else {
        await db.insert("richTextPages", {
          ...page,
          isPublished: false,
          updatedAt: now,
        })
        console.log(`[Migration] Inserted "${page.slug}"`)
        results.push({ slug: page.slug, status: "inserted" })
      }
    }

    console.log(
      "[Migration] seedPolicyContent complete:",
      JSON.stringify(results)
    )

    return { success: true, results }
  },
})

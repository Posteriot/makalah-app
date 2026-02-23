import { internalMutationGeneric } from "convex/server"

/**
 * Migration: Upsert privacy policy content for Google OAuth verification
 *
 * Run with:
 * npx convex run migrations/upsertPrivacyPolicyGoogleOAuth:upsertPrivacyPolicyGoogleOAuth
 *
 * Behavior:
 * - If `privacy` page exists: update title/content/lastUpdatedLabel/updatedAt
 * - If `privacy` page does not exist: insert draft page (isPublished: false)
 * - Does NOT force publish/unpublish existing page
 */

const privacyPolicyGoogleOAuthContent = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Makalah AI (dioperasikan oleh PT THE MANAGEMENT ASIA) menghormati privasi pengguna. Dokumen ini menjelaskan data apa yang kami akses saat pengguna memakai fitur Masuk dengan Google, bagaimana data dipakai, disimpan, dibagikan, serta bagaimana pengguna dapat meminta penghapusan data.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "1. Data Google yang Diakses" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Saat pengguna memilih Masuk dengan Google atau Daftar dengan Google, aplikasi kami hanya mengakses data identitas dasar akun Google untuk autentikasi.",
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
              content: [{ type: "text", text: "Nama akun Google (profile name)." }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Alamat email akun Google." }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Identifier akun Google untuk login aman (ID unik provider)." }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Informasi profil dasar lain yang disediakan Google pada login standar, bila tersedia." }],
            },
          ],
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Kami tidak meminta akses ke data Gmail, Google Drive, Google Calendar, Google Photos, atau konten pribadi Google lainnya untuk alur login ini.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "2. Penggunaan Data Google" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Data Google yang diakses hanya digunakan untuk:" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Membuat atau menemukan akun pengguna yang sesuai di sistem Makalah AI." }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Memverifikasi identitas pengguna saat proses login atau pendaftaran." }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Menjaga keamanan akun, termasuk validasi sesi dan pencegahan penyalahgunaan." }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Menjalankan fitur manajemen akun, termasuk account linking lintas metode login." }],
            },
          ],
        },
      ],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Data Google tidak digunakan untuk dijual kepada pihak lain." }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "3. Berbagi Data" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Kami tidak menjual data Google pengguna kepada pihak ketiga." }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Data hanya dapat diproses oleh penyedia layanan yang kami gunakan untuk operasional aplikasi, dengan tujuan terbatas sebagai berikut:" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Infrastruktur autentikasi dan database aplikasi." }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Keamanan layanan dan pencegahan penyalahgunaan." }],
            },
          ],
        },
      ],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Untuk fitur terpisah seperti AI processing atau pembayaran, data diproses sesuai fungsi masing-masing layanan dan tidak memperluas scope akses Google OAuth login di luar identitas dasar di atas." }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "4. Penyimpanan dan Perlindungan Data" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Kami menerapkan kontrol keamanan berlapis untuk melindungi data pengguna." }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Penyimpanan data backend dengan kontrol akses berbasis kepemilikan akun." }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Validasi autentikasi di sisi server sebelum akses data sensitif." }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Transport data melalui koneksi aman (HTTPS)." }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Pembatasan akses administratif sesuai peran." }],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "5. Retensi dan Penghapusan Data" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Kebijakan retensi data:" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Data akun disimpan selama akun pengguna aktif atau selama diperlukan untuk menjalankan layanan secara sah." }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Data dapat dipertahankan lebih lama bila diwajibkan hukum atau untuk penanganan sengketa dan penyalahgunaan." }],
            },
          ],
        },
      ],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Hak penghapusan data pengguna:" }],
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
                { type: "text", text: "Pengguna dapat meminta penghapusan akun dan data terkait melalui email ke " },
                {
                  type: "text",
                  marks: [{ type: "link", attrs: { href: "mailto:dukungan@makalah.ai" } }],
                  text: "dukungan@makalah.ai",
                },
                { type: "text", text: "." },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Subjek email: Permintaan Hapus Data." }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Cantumkan email akun terdaftar untuk proses verifikasi." }],
            },
          ],
        },
      ],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Setelah permintaan terverifikasi, kami memproses penghapusan data sesuai kebijakan internal dan kewajiban hukum yang berlaku." }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "6. Pembaruan Kebijakan" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Kebijakan ini dapat diperbarui untuk menyesuaikan perubahan produk, keamanan, atau regulasi. Tanggal pembaruan terbaru selalu ditampilkan di halaman ini." }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "7. Kontak" }],
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
                { type: "text", marks: [{ type: "bold" }], text: "Email" },
                { type: "text", text: ": " },
                {
                  type: "text",
                  marks: [{ type: "link", attrs: { href: "mailto:dukungan@makalah.ai" } }],
                  text: "dukungan@makalah.ai",
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
                { type: "text", marks: [{ type: "bold" }], text: "Entitas" },
                { type: "text", text: ": PT THE MANAGEMENT ASIA" },
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
                { type: "text", marks: [{ type: "bold" }], text: "Alamat" },
                { type: "text", text: ": Jl. H. Jian, Kebayoran Baru, Jakarta Selatan" },
              ],
            },
          ],
        },
      ],
    },
  ],
})

export const upsertPrivacyPolicyGoogleOAuth = internalMutationGeneric({
  args: {},
  handler: async ({ db }) => {
    console.log("[Migration] Starting upsertPrivacyPolicyGoogleOAuth...")

    const now = Date.now()
    const payload = {
      slug: "privacy",
      title: "Kebijakan Privasi Makalah AI",
      content: privacyPolicyGoogleOAuthContent,
      lastUpdatedLabel: "TERAKHIR DIPERBARUI: 23 FEBRUARI 2026",
    } as const

    const existing = await db
      .query("richTextPages")
      .withIndex("by_slug", (q) => q.eq("slug", payload.slug))
      .first()

    if (existing) {
      await db.patch(existing._id, {
        title: payload.title,
        content: payload.content,
        lastUpdatedLabel: payload.lastUpdatedLabel,
        updatedAt: now,
      })

      console.log(`[Migration] Updated "${payload.slug}" page: ${existing._id}`)
      return {
        success: true,
        action: "updated",
        slug: payload.slug,
        pageId: String(existing._id),
      }
    }

    const insertedId = await db.insert("richTextPages", {
      ...payload,
      isPublished: false,
      updatedAt: now,
    })

    console.log(`[Migration] Inserted "${payload.slug}" page: ${insertedId}`)
    return {
      success: true,
      action: "inserted",
      slug: payload.slug,
      pageId: String(insertedId),
    }
  },
})

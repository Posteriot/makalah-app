import { internalMutation } from "../_generated/server"

const WORKFLOW_SECTION = {
  title: "Workflow 13 Tahapan Penyusunan",
  group: "Fitur Utama",
  order: 6,
  icon: "Settings",
  summary:
    "Workflow 13 tahapan menjaga obrolan tetap fokus jadi paper dari ide awal sampai judul final. User tetap pegang kontrol lewat approve/revisi di tiap tahap.",
  blocks: [
    {
      type: "section" as const,
      title: "Apa Itu Workflow 13 Tahapan",
      paragraphs: [
        "Workflow ini adalah alur resmi mode paper di Makalah AI. Proses berjalan berurutan dari tahap 1 sampai tahap 13 dan sesi baru dianggap selesai setelah tahap akhir disetujui.",
      ],
    },
    {
      type: "section" as const,
      title: "Kenapa Obrolan Tetap Fokus Jadi Paper",
      list: {
        variant: "numbered" as const,
        items: [
          {
            text: "Saat mode paper aktif, agen diarahkan untuk bekerja pada tahap aktif, bukan keluar konteks.",
          },
          {
            text: "Tool penyimpanan progres otomatis mengikuti tahap aktif dari session.",
          },
          {
            text: "Backend menolak update jika tidak sesuai tahap aktif atau status belum tepat.",
          },
          {
            text: "User tetap menentukan kelanjutan lewat aksi **Approve & Lanjut** atau **Revisi**.",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Prinsip Kolaborasi Human-in-the-Loop",
      paragraphs: [
        "Tujuan workflow ini adalah membantu user menghasilkan paper berkualitas lewat kolaborasi aktif dengan AI.",
      ],
      list: {
        variant: "bullet" as const,
        items: [
          {
            text: "Agen Makalah berperan sebagai **juru tulis** yang membantu merapikan hasil diskusi ke format akademik.",
          },
          {
            text: "Agen Makalah adalah **mitra cari dan olah data** untuk membantu menemukan, merangkum, dan menyusun referensi.",
          },
          {
            text: "Agen Makalah menjadi **kawan diskusi** untuk klarifikasi, mempertajam ide, dan menguji argumen.",
          },
          {
            text: "Agen Makalah juga **penimbang** untuk memberi pertimbangan plus-minus sebelum user ambil keputusan.",
          },
          {
            text: "Paper akhir adalah hasil kolaborasi user + AI, bukan paper yang sepenuhnya dibuatkan AI tanpa keterlibatan user.",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Urutan 13 Tahapan",
      list: {
        variant: "numbered" as const,
        items: [
          { text: "Gagasan Paper" },
          { text: "Penentuan Topik" },
          { text: "Menyusun Outline" },
          { text: "Penyusunan Abstrak" },
          { text: "Pendahuluan" },
          { text: "Tinjauan Literatur" },
          { text: "Metodologi" },
          { text: "Hasil Penelitian" },
          { text: "Diskusi" },
          { text: "Kesimpulan" },
          { text: "Daftar Pustaka" },
          { text: "Lampiran" },
          { text: "Pemilihan Judul" },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Cara Kerja Singkat di Tiap Tahap",
      list: {
        variant: "numbered" as const,
        items: [
          { text: "User berdiskusi dengan AI pada tahap yang sedang aktif." },
          { text: "AI menyimpan progres tahap dan mengajukan validasi tahap." },
          { text: "User memilih **Approve & Lanjut** atau **Revisi**." },
          { text: "Jika approve, sistem pindah ke tahap berikutnya." },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Kontrol Alur",
      list: {
        variant: "bullet" as const,
        items: [
          { text: "Rewind maksimal 2 tahap ke belakang." },
          { text: "Edit pesan di mode paper dibatasi agar konteks tahap tetap aman." },
          {
            text: "Web search dikelola per tahap, dan referensi yang dipakai bisa dipersist ke data tahap aktif.",
          },
        ],
      },
    },
    {
      type: "section" as const,
      title: "Kapan Sesi Selesai dan Bisa Diekspor",
      list: {
        variant: "bullet" as const,
        items: [
          { text: "Sesi dianggap selesai setelah tahap 13 (judul) disetujui." },
          { text: "Export Word/PDF tersedia saat sesi sudah berstatus **completed**." },
        ],
      },
    },
  ],
  searchText:
    "workflow 13 tahapan penyusunan paper gagasan topik outline abstrak pendahuluan tinjauan literatur metodologi hasil diskusi kesimpulan daftar pustaka lampiran judul approve revisi rewind kolaborasi human in the loop",
}

export const updateWorkflow13Tahapan = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("documentationSections")
      .withIndex("by_slug", (q) => q.eq("slug", "workflow"))
      .first()

    if (!existing) {
      return {
        success: false,
        message: "Section dengan slug 'workflow' tidak ditemukan.",
      }
    }

    await ctx.db.patch(existing._id, {
      title: WORKFLOW_SECTION.title,
      group: WORKFLOW_SECTION.group,
      order: WORKFLOW_SECTION.order,
      icon: WORKFLOW_SECTION.icon,
      summary: WORKFLOW_SECTION.summary,
      blocks: WORKFLOW_SECTION.blocks,
      searchText: WORKFLOW_SECTION.searchText,
      isPublished: true,
      updatedAt: now,
    })

    return {
      success: true,
      message: "Section 'workflow' berhasil diupdate ke Workflow 13 Tahapan Penyusunan.",
      sectionId: existing._id,
      slug: "workflow",
      title: WORKFLOW_SECTION.title,
      updatedAt: now,
    }
  },
})

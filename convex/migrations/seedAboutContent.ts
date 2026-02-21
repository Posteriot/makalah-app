import { internalMutation } from "../_generated/server"

/**
 * Migration: Seed about page content into pageContent table
 *
 * Run with: npx convex run migrations/seedAboutContent:seedAboutContent
 *
 * Seeds 4 records for about page sections (manifesto, problems, agents, career-contact).
 * All records created with isPublished: false — static fallback stays active
 * until admin publishes via CMS panel.
 *
 * Idempotent: skips if any pageContent records for "about" already exist.
 */

export const seedAboutContent = internalMutation({
  handler: async ({ db }) => {
    console.log("[Migration] Starting seedAboutContent...")

    const existing = await db
      .query("pageContent")
      .withIndex("by_page", (q) => q.eq("pageSlug", "about"))
      .first()

    if (existing) {
      console.log("[Migration] About page content already exists, skipping")
      return { success: false, message: "About content sudah ada." }
    }

    const now = Date.now()
    const insertedIds: string[] = []

    // 1. Manifesto
    const manifestoId = await db.insert("pageContent", {
      pageSlug: "about",
      sectionSlug: "manifesto",
      sectionType: "manifesto",
      badgeText: "Tentang Kami",
      headingLines: ["Kolaborasi", "Penumbuh", "Pikiran"],
      subheading:
        "Teknologi tidak menggantikan manusia, melainkan melengkapi agar kian berdaya",
      paragraphs: [
        "Platform ini disiapkan untuk merespons disrupsi teknologi dalam aktivitas akademik dan riset. Laju pemakaian AI/Large Language Model nggak bisa dihindari. Pelarangan penggunaannya di lingkungan akademik hanya memicu ketidakjujuran: ngomongnya nggak pakai, padahal diam-diam menggunakan.",
        "Bagaimana dengan detektor AI\u2014apakah absah? Problematik. Detektor AI rawan false positive dan hanya mengeluarkan persentase probabilitas tanpa argumen jelas. Selama tulisan mengikuti struktur subjek\u2013predikat\u2013objek\u2013keterangan, kalimat apa pun bisa terdeteksi \"buatan AI\".",
        "Yang diperlukan sekarang: mengatur penggunaan AI agar transparan, bisa dipertanggungjawabkan, dan punya riwayat pemakaian yang akuntabel. Siapa pun bisa dilacak: apakah paper dibuatkan AI, atau dibuat bersama AI? Bukankah itu dua hal yang berbeda?",
        "Makalah berdiri di posisi: Penggunaan AI harus transparan, terjejak, dan terdidik.",
      ],
      isPublished: false,
      sortOrder: 1,
      updatedAt: now,
    })
    insertedIds.push(String(manifestoId))
    console.log("[Migration] Inserted manifesto (sortOrder: 1)")

    // 2. Problems
    const problemsId = await db.insert("pageContent", {
      pageSlug: "about",
      sectionSlug: "problems",
      sectionType: "problems",
      badgeText: "Persoalan",
      title: "Apa saja persoalan yang dijawab?",
      items: [
        {
          title: "Ai Mematikan Rasa Ingin Tahu?",
          description:
            "Konon AI kerap bikin malas berpikir. Baiklah, Makalah sebaliknya, justru memantik diskusi dan menyangga teknis penulisan, supaya pengguna fokus menajamkan dan elaborasi gagasan.",
        },
        {
          title: "Prompting Yang Ribet",
          description:
            "Makalah hadir untuk membantah asumsi: berinteraksi dengan Ai memerlukan prompting yang sakti mandraguna. Tidak! Yang diperlukan Makalah adalah percakapan iteratif, informatif, dalam bahasa sehari-hari. Singkatnya: ngobrol!",
        },
        {
          title: "Sitasi & Provenance",
          description:
            "Makalah memastikan setiap sumber tersitasi dengan format standar dan menyimpan asal-usul ide (provenance) agar kutipan mudah dilacak dan diaudit.",
        },
        {
          title: "Plagiarisme? Dipagari Etis",
          description:
            "LLM dipagari etis untuk tidak menulis persis teks berhak cipta lebih dari 10 kata. Batasan ini sekaligus menutup celah plagiarisme dan menjaga orisinalitas gagasan pengguna.",
        },
        {
          title: "Transparansi proses penyusunan",
          description:
            "Riwayat interaksi terekam rapi\u2014menjamin akuntabilitas dan membedakan kolaborasi dengan generasi otomatis.",
        },
        {
          title: "Deteksi AI Problematik",
          description:
            '"AI atau bukan" tidak dapat dipertanggungjawabkan. Makalah mendorong transparansi penggunaan, bukan sekadar deteksi.',
        },
      ],
      isPublished: false,
      sortOrder: 2,
      updatedAt: now,
    })
    insertedIds.push(String(problemsId))
    console.log("[Migration] Inserted problems (sortOrder: 2)")

    // 3. Agents
    const agentsId = await db.insert("pageContent", {
      pageSlug: "about",
      sectionSlug: "agents",
      sectionType: "agents",
      badgeText: "AI Agents",
      title: "Fitur & Pengembangan",
      items: [
        {
          title: "Sparring Partner",
          description:
            "Pendamping riset. Berperan sebagai juru tulis pengguna, sekaligus mitra diskusi.",
          icon: "available",
        },
        {
          title: "Dosen Pembimbing",
          description:
            "Layaknya Dosen Pembimbing, yang memberikan arahan struktur, kritik metodologi, dan petunjuk milestone.",
          icon: "in-progress",
        },
        {
          title: "Peer Reviewer",
          description:
            "Agen Ai berperan layaknya kawan debat, yang memberikan review kritis pada paper pengguna, lengkap dengan catatan argumen & referensi.",
          icon: "in-progress",
        },
        {
          title: "Gap Thinker",
          description:
            "Agen Ai menyorot celah riset dari berbagai paper referensi awal, menemukan potensi topik baru yang lebih segar.",
          icon: "in-progress",
        },
        {
          title: "Novelty Finder",
          description:
            "Agen Ai yang mampu memetakan kebaruan dan posisi kontribusi penyusun paper, dalam topik yang telah banyak diulas.",
          icon: "in-progress",
        },
        {
          title: "Graph Elaborator",
          description:
            "Pengguna mengirimkan konsep tertentu, kemudian agen Ai memetakan konsep itu dalam grafik, mengaitkannya dengan referensi, serta konsep-konsep sejenis yang pernah ada sebelumnya.",
          icon: "in-progress",
        },
      ],
      isPublished: false,
      sortOrder: 3,
      updatedAt: now,
    })
    insertedIds.push(String(agentsId))
    console.log("[Migration] Inserted agents (sortOrder: 3)")

    // 4. Career & Contact
    const careerContactId = await db.insert("pageContent", {
      pageSlug: "about",
      sectionSlug: "career-contact",
      sectionType: "career-contact",
      badgeText: "Karier & Kontak",
      title: "Bergabung atau Hubungi Kami",
      items: [
        {
          title: "Karier",
          description:
            "Update posisi akan kami tampilkan di halaman ini.",
        },
      ],
      contactInfo: {
        company: "PT The Management Asia",
        address: ["Jl. H. Jian, Kebayoran Baru, Jakarta Selatan"],
        email: "dukungan@makalah.ai",
      },
      isPublished: false,
      sortOrder: 4,
      updatedAt: now,
    })
    insertedIds.push(String(careerContactId))
    console.log("[Migration] Inserted career-contact (sortOrder: 4)")

    console.log(
      `[Migration] Success! Inserted ${insertedIds.length} about page sections`
    )
    return { success: true, insertedCount: insertedIds.length }
  },
})

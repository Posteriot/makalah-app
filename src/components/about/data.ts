/**
 * About Page Data Constants
 *
 * Content extracted from: .development/ui-mockup/html-css/about-mockup.html
 * Pattern reference: src/components/marketing/BenefitsSection.tsx
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ManifestoContent {
  summary: string
  extended: string[]
}

export interface ProblemItem {
  id: string
  title: string
  description: string
}

export type AgentStatus = "available" | "in-progress"

export interface AgentItem {
  id: string
  title: string
  description: string
  status: AgentStatus
}

export interface ContactContent {
  company: string
  address: string[]
  email: string
}

export interface CareerContactItem {
  id: string
  anchorId: string
  iconName: "Briefcase" | "Mail"
  title: string
  content: string | ContactContent
}

// =============================================================================
// HERO SECTION
// =============================================================================

export const HERO_CONTENT = {
  heading: "AI Yang Menumbuhkan Pikiran",
  subheading:
    "Teknologi tidak menggantikan manusia, melainkan melengkapi agar kian berdaya",
  ctaText: "Hubungi Kami",
  ctaHref:
    "https://mail.google.com/mail/?view=cm&fs=1&to=dukungan@makalah.ai&su=Pertanyaan%20tentang%20Makalah%20AI&body=Halo%20Tim%20Makalah%2C%0A%0ASaya%20ingin%20bertanya%20tentang%20...%0A%0ATerima%20kasih.",
} as const

// =============================================================================
// MANIFESTO SECTION
// =============================================================================

export const MANIFESTO_CONTENT: ManifestoContent = {
  summary:
    "Platform ini disiapkan untuk merespons disrupsi teknologi dalam aktivitas akademik dan riset. Laju pemakaian AI/Large Language Model nggak bisa dihindari. Pelarangan penggunaannya di lingkungan akademik hanya memicu ketidakjujuran: ngomongnya nggak pakai, padahal diam-diam menggunakan.",
  extended: [
    "Bagaimana dengan detektor AI\u2014apakah absah? Problematik. Detektor AI rawan false positive dan hanya mengeluarkan persentase probabilitas tanpa argumen jelas. Selama tulisan mengikuti struktur subjek\u2013predikat\u2013objek\u2013keterangan, kalimat apa pun bisa terdeteksi \"buatan AI\".",
    "Yang diperlukan sekarang: mengatur penggunaan AI agar transparan, bisa dipertanggungjawabkan, dan punya riwayat pemakaian yang akuntabel. Siapa pun bisa dilacak: apakah paper dibuatkan AI, atau dibuat bersama AI? Bukankah itu dua hal yang berbeda?",
    "Makalah berdiri di posisi: Penggunaan AI harus transparan, terjejak, dan terdidik.",
  ],
}

// =============================================================================
// PROBLEMS SECTION
// =============================================================================

export const PROBLEMS_ITEMS: ProblemItem[] = [
  {
    id: "curiosity",
    title: "Ai Mematikan Rasa Ingin Tahu?",
    description:
      "Konon AI kerap bikin malas berpikir. Baiklah, Makalah sebaliknya, justru memantik diskusi dan menyangga teknis penulisan, supaya pengguna fokus menajamkan dan elaborasi gagasan.",
  },
  {
    id: "prompting",
    title: "Prompting Yang Ribet",
    description:
      "Makalah hadir untuk membantah asumsi: berinteraksi dengan Ai memerlukan prompting yang sakti mandraguna. Tidak! Yang diperlukan Makalah adalah percakapan iteratif, informatif, dalam bahasa sehari-hari. Singkatnya: ngobrol!",
  },
  {
    id: "citation",
    title: "Sitasi & Provenance",
    description:
      "Makalah memastikan setiap sumber tersitasi dengan format standar dan menyimpan asal-usul ide (provenance) agar kutipan mudah dilacak dan diaudit.",
  },
  {
    id: "plagiarism",
    title: "Plagiarisme? Dipagari Etis",
    description:
      "LLM dipagari etis untuk tidak menulis persis teks berhak cipta lebih dari 10 kata. Batasan ini sekaligus menutup celah plagiarisme dan menjaga orisinalitas gagasan pengguna.",
  },
  {
    id: "transparency",
    title: "Transparansi proses penyusunan",
    description:
      "Riwayat interaksi terekam rapi\u2014menjamin akuntabilitas dan membedakan kolaborasi dengan generasi otomatis.",
  },
  {
    id: "detection",
    title: "Deteksi AI Problematik",
    description:
      "\"AI atau bukan\" tidak dapat dipertanggungjawabkan. Makalah mendorong transparansi penggunaan, bukan sekadar deteksi.",
  },
]

// =============================================================================
// AI AGENTS SECTION
// =============================================================================

export const AGENTS_ITEMS: AgentItem[] = [
  {
    id: "sparring-partner",
    title: "Sparring Partner",
    description:
      "Pendamping riset. Berperan sebagai juru tulis pengguna, sekaligus mitra diskusi.",
    status: "available",
  },
  {
    id: "dosen-pembimbing",
    title: "Dosen Pembimbing",
    description:
      "Layaknya Dosen Pembimbing, yang memberikan arahan struktur, kritik metodologi, dan petunjuk milestone.",
    status: "in-progress",
  },
  {
    id: "peer-reviewer",
    title: "Peer Reviewer",
    description:
      "Agen Ai berperan layaknya kawan debat, yang memberikan review kritis pada paper pengguna, lengkap dengan catatan argumen & referensi.",
    status: "in-progress",
  },
  {
    id: "gap-thinker",
    title: "Gap Thinker",
    description:
      "Agen Ai menyorot celah riset dari berbagai paper referensi awal, menemukan potensi topik baru yang lebih segar.",
    status: "in-progress",
  },
  {
    id: "novelty-finder",
    title: "Novelty Finder",
    description:
      "Agen Ai yang mampu memetakan kebaruan dan posisi kontribusi penyusun paper, dalam topik yang telah banyak diulas.",
    status: "in-progress",
  },
  {
    id: "graph-elaborator",
    title: "Graph Elaborator",
    description:
      "Pengguna mengirimkan konsep tertentu, kemudian agen Ai memetakan konsep itu dalam grafik, mengaitkannya dengan referensi, serta konsep-konsep sejenis yang pernah ada sebelumnya..",
    status: "in-progress",
  },
]

// =============================================================================
// CAREER & CONTACT SECTION
// =============================================================================

export const CAREER_CONTACT_ITEMS: CareerContactItem[] = [
  {
    id: "karier",
    anchorId: "bergabung-dengan-tim",
    iconName: "Briefcase",
    title: "Karier",
    content: "Update posisi akan kami tampilkan di halaman ini.",
  },
  {
    id: "kontak",
    anchorId: "hubungi-kami",
    iconName: "Mail",
    title: "Kontak",
    content: {
      company: "PT The Management Asia",
      address: [
        "Menara Cakrawala 12th floor unit 05A",
        "Jalan MH. Thamrin, Jakarta Pusat",
      ],
      email: "dukungan@makalah.ai",
    },
  },
]

// =============================================================================
// SECTION HEADINGS
// =============================================================================

export const SECTION_HEADINGS = {
  manifesto: "Jadi, begini...",
  problems: "Apa Saja Persoalan Yang Dijawab?",
  agents: "Ai Agents: Fitur & Pengembangan",
  careerContact: "Karier & Kontak",
} as const

// =============================================================================
// BADGE LABELS
// =============================================================================

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  available: "Tersedia",
  "in-progress": "Proses",
}

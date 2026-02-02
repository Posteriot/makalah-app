import { Users, MessageSquare, Edit, CheckCircle, LucideIcon } from "lucide-react"

/**
 * Benefits data structure for reuse across desktop bento and mobile accordion
 */
export type BenefitItem = {
  id: string
  title: string
  icon: LucideIcon
  content: React.ReactNode
}

export const benefits: BenefitItem[] = [
  {
    id: "sparring-partner",
    title: "Sparring Partner",
    icon: Users,
    content:
      "Pendamping penulisan riset sekaligus mitra diskusi, dari tahap ide hingga paper jadi. Alat kolaboratif yang memastikan setiap karya akuntabel dan berkualitas akademik.",
  },
  {
    id: "chat-natural",
    title: "Chat Natural",
    icon: MessageSquare,
    content:
      "Ngobrol saja, layaknya percakapan lazim. Tanggapi setiap respons maupun pertanyaan agent menggunakan Bahasa Indonesia sehari-hari, tanpa prompt yang rumit.",
  },
  {
    id: "bahasa-manusiawi",
    title: "Bahasa Manusiawi",
    icon: Edit,
    content:
      "Gunakan fitur \"Refrasa\" untuk membentuk gaya penulisan bahasa Indonesia manusiawi, bukan khas robot, tanpa mengubah makna—ritme paragraf, variasi kalimat, dan istilah jadi rapi.",
  },
  {
    id: "dipandu-bertahap",
    title: "Dipandu Bertahap",
    icon: CheckCircle,
    content:
      "Workflow ketat dan terstruktur, mengolah ide hingga paper jadi, dengan sitasi kredibel dan format sesuai preferensi.",
  },
]

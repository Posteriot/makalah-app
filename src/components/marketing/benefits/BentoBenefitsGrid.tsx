import { Users, Edit, MessageSquare, CheckCircle } from "lucide-react"

/**
 * BentoBenefitsGrid - Desktop Bento Grid View
 * Layout 2x2:
 * ┌─────────────────────┬───────────────┐
 * │  Sparring Partner   │ Chat Natural  │
 * ├─────────────────────┼───────────────┤
 * │  Bahasa Manusiawi   │ Dipandu       │
 * │                     │ Bertahap      │
 * └─────────────────────┴───────────────┘
 */
export function BentoBenefitsGrid() {
  return (
    <div className="hidden md:grid grid-cols-2 grid-rows-2 gap-4">
      {/* Feature 1: Sparring Partner */}
      <div className="group bento-card p-7">
        <div className="relative flex-1 z-[2] flex flex-col">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-brand/[0.12] border border-brand/25 rounded-xl flex items-center justify-center text-brand">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-[family-name:var(--font-geist-mono)] text-xl font-bold m-0 text-foreground">
              Sparring Partner
            </h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed m-0">
            Pendamping penulisan riset sekaligus mitra diskusi, dari tahap ide hingga paper jadi. Alat kolaboratif yang memastikan setiap karya akuntabel dan berkualitas akademik.
          </p>
        </div>
        <div className="bento-glow" />
      </div>

      {/* Feature 2: Chat Natural */}
      <div className="group bento-card p-7">
        <div className="relative flex-1 z-[2] flex flex-col">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-brand/[0.12] border border-brand/25 rounded-xl flex items-center justify-center text-brand">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-[family-name:var(--font-geist-mono)] text-xl font-bold m-0 text-foreground">
              Chat Natural
            </h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed m-0">
            Ngobrol saja, layaknya percakapan lazim. Tanggapi setiap respons maupun pertanyaan agent menggunakan Bahasa Indonesia sehari-hari, tanpa prompt yang rumit.
          </p>
        </div>
        <div className="bento-glow" />
      </div>

      {/* Feature 3: Refrasa / Bahasa Manusiawi */}
      <div className="group bento-card p-7">
        <div className="relative flex-1 z-[2] flex flex-col">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-brand/[0.12] border border-brand/25 rounded-xl flex items-center justify-center text-brand">
              <Edit className="w-6 h-6" />
            </div>
            <h3 className="font-[family-name:var(--font-geist-mono)] text-xl font-bold m-0 text-foreground">
              Bahasa Manusiawi
            </h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed m-0">
            Gunakan fitur "Refrasa" untuk membentuk gaya penulisan bahasa Indonesia manusiawi, bukan khas robot, tanpa mengubah makna—ritme paragraf, variasi kalimat, dan istilah jadi rapi.
          </p>
        </div>
        <div className="bento-glow" />
      </div>

      {/* Feature 4: Dipandu Bertahap */}
      <div className="group bento-card p-7">
        <div className="relative flex-1 z-[2] flex flex-col">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-brand/[0.12] border border-brand/25 rounded-xl flex items-center justify-center text-brand">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="font-[family-name:var(--font-geist-mono)] text-xl font-bold m-0 text-foreground">
              Dipandu Bertahap
            </h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed m-0">
            Workflow ketat dan terstruktur, mengolah ide hingga paper jadi, dengan sitasi kredibel dan format sesuai preferensi.
          </p>
        </div>
        <div className="bento-glow" />
      </div>
    </div>
  )
}

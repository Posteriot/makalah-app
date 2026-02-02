/**
 * BentoBenefitsGrid - Desktop Bento Grid View
 * Layout 2x2:
 * ┌─────────────────────┬───────────────┐
 * │  Sparring Partner   │ Chat Natural  │
 * ├─────────────────────┼───────────────┤
 * │  Bahasa Manusiawi   │ Dipandu       │
 * │                     │ Bertahap      │
 * └─────────────────────┴───────────────┘
 *
 * Design:
 * - Heading: Geist Sans Light, large (~3rem)
 * - Paragraph: Geist Mono Regular with colored dot
 * - Dot: emerald (light), #EE4036 (dark)
 */
export function BentoBenefitsGrid() {
  return (
    <div className="hidden md:grid grid-cols-2 grid-rows-2 gap-4">
      {/* Feature 1: Sparring Partner */}
      <div className="group relative overflow-hidden flex flex-col rounded-lg bg-white dark:bg-[#2a2a2e] border border-black/10 dark:border-white/[0.08] transition-all duration-300 z-[5] hover:bg-[#fafafa] dark:hover:bg-[#3a3a3e] hover:border-black/15 dark:hover:border-white/15 hover:-translate-y-1 p-8">
        <div className="relative flex-1 z-[2] flex flex-col">
          <h3 className="font-[family-name:var(--font-geist-sans)] font-light text-[2rem] leading-[1.1] m-0 mb-6 text-foreground">
            Sparring
            <br />
            Partner
          </h3>
          <div className="flex items-start gap-3 pl-30">
            <span className="w-2.5 h-2.5 min-w-2.5 rounded-full mt-1.5 bg-emerald-500 dark:bg-[#EE4036]" />
            <p className="font-[family-name:var(--font-geist-mono)] font-normal text-[0.9375rem] leading-relaxed m-0 text-muted-foreground">
              Pendamping penulisan riset sekaligus mitra diskusi, dari tahap ide hingga paper jadi. Alat kolaboratif yang memastikan setiap karya akuntabel dan berkualitas akademik.
            </p>
          </div>
        </div>
      </div>

      {/* Feature 2: Chat Natural */}
      <div className="group relative overflow-hidden flex flex-col rounded-lg bg-white dark:bg-[#2a2a2e] border border-black/10 dark:border-white/[0.08] transition-all duration-300 z-[5] hover:bg-[#fafafa] dark:hover:bg-[#3a3a3e] hover:border-black/15 dark:hover:border-white/15 hover:-translate-y-1 p-8">
        <div className="relative flex-1 z-[2] flex flex-col">
          <h3 className="font-[family-name:var(--font-geist-sans)] font-light text-[2rem] leading-[1.1] m-0 mb-6 text-foreground">
            Chat
            <br />
            Natural
          </h3>
          <div className="flex items-start gap-3 pl-30">
            <span className="w-2.5 h-2.5 min-w-2.5 rounded-full mt-1.5 bg-emerald-500 dark:bg-[#EE4036]" />
            <p className="font-[family-name:var(--font-geist-mono)] font-normal text-[0.9375rem] leading-relaxed m-0 text-muted-foreground">
              Ngobrol saja, layaknya percakapan lazim. Tanggapi setiap respons maupun pertanyaan agent menggunakan Bahasa Indonesia sehari-hari, tanpa prompt rumit.
            </p>
          </div>
        </div>
      </div>

      {/* Feature 3: Refrasa / Bahasa Manusiawi */}
      <div className="group relative overflow-hidden flex flex-col rounded-lg bg-white dark:bg-[#2a2a2e] border border-black/10 dark:border-white/[0.08] transition-all duration-300 z-[5] hover:bg-[#fafafa] dark:hover:bg-[#3a3a3e] hover:border-black/15 dark:hover:border-white/15 hover:-translate-y-1 p-8">
        <div className="relative flex-1 z-[2] flex flex-col">
          <h3 className="font-[family-name:var(--font-geist-sans)] font-light text-[2rem] leading-[1.1] m-0 mb-6 text-foreground">
            Bahasa
            <br />
            Manusiawi
          </h3>
          <div className="flex items-start gap-3 pl-30">
            <span className="w-2.5 h-2.5 min-w-2.5 rounded-full mt-1.5 bg-emerald-500 dark:bg-[#EE4036]" />
            <p className="font-[family-name:var(--font-geist-mono)] font-normal text-[0.9375rem] leading-relaxed m-0 text-muted-foreground">
              Gunakan fitur "Refrasa" untuk membentuk gaya penulisan bahasa Indonesia manusiawi, bukan khas robot, tanpa mengubah makna—ritme paragraf, variasi kalimat, dan istilah jadi rapi.
            </p>
          </div>
        </div>
      </div>

      {/* Feature 4: Dipandu Bertahap */}
      <div className="group relative overflow-hidden flex flex-col rounded-lg bg-white dark:bg-[#2a2a2e] border border-black/10 dark:border-white/[0.08] transition-all duration-300 z-[5] hover:bg-[#fafafa] dark:hover:bg-[#3a3a3e] hover:border-black/15 dark:hover:border-white/15 hover:-translate-y-1 p-8">
        <div className="relative flex-1 z-[2] flex flex-col">
          <h3 className="font-[family-name:var(--font-geist-sans)] font-light text-[2rem] leading-[1.1] m-0 mb-6 text-foreground">
            Dipandu
            <br />
            Bertahap
          </h3>
          <div className="flex items-start gap-3 pl-30">
            <span className="w-2.5 h-2.5 min-w-2.5 rounded-full mt-1.5 bg-emerald-500 dark:bg-[#EE4036]" />
            <p className="font-[family-name:var(--font-geist-mono)] font-normal text-[0.9375rem] leading-relaxed m-0 text-muted-foreground">
              Workflow ketat dan terstruktur, mengolah ide hingga paper jadi, dengan sitasi kredibel dan format sesuai preferensi.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

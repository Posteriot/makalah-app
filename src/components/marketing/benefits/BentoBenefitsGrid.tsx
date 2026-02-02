/**
 * BentoBenefitsGrid - Desktop Bento Grid View
 * Layout 2x2 dengan design tokens dari @theme
 *
 * Tokens used:
 * - Colors: bg-bento, bg-bento-hover, border-bento-border, bg-dot
 * - Typography: text-bento-heading, text-bento-paragraph, leading-bento-heading
 * - Fonts: font-sans (Geist), font-mono (Geist Mono)
 */

const benefits = [
  {
    id: "sparring-partner",
    title: ["Sparring", "Partner"],
    description:
      "Pendamping penulisan riset sekaligus mitra diskusi, dari tahap ide hingga paper jadi. Alat kolaboratif yang memastikan setiap karya akuntabel dan berkualitas akademik.",
  },
  {
    id: "chat-natural",
    title: ["Chat", "Natural"],
    description:
      "Ngobrol saja, layaknya percakapan lazim. Tanggapi setiap respons maupun pertanyaan agent menggunakan Bahasa Indonesia sehari-hari, tanpa prompt rumit.",
  },
  {
    id: "bahasa-manusiawi",
    title: ["Bahasa", "Manusiawi"],
    description:
      'Gunakan fitur "Refrasa" untuk membentuk gaya penulisan bahasa Indonesia manusiawi, bukan khas robot, tanpa mengubah makna—ritme paragraf, variasi kalimat, dan istilah jadi rapi.',
  },
  {
    id: "dipandu-bertahap",
    title: ["Dipandu", "Bertahap"],
    description:
      "Workflow ketat dan terstruktur, mengolah ide hingga paper jadi, dengan sitasi kredibel dan format sesuai preferensi.",
  },
]

export function BentoBenefitsGrid() {
  return (
    <div className="hidden md:grid grid-cols-2 grid-rows-2 gap-4">
      {benefits.map((benefit) => (
        <div
          key={benefit.id}
          className="group relative overflow-hidden flex flex-col p-4 rounded-lg  border-1 border-bento-border-light dark:border-bento-border hover:bg-bento-light-hover dark:hover:bg-bento-hover hover:border-bento-border-light-hover dark:hover:border-bento-border-hover hover:-translate-y-1 transition-all duration-300 z-[5]"
        >
          <div className="relative flex-1 z-[2] flex flex-col">
            <h3 className="font-sans font-light text-bento-heading text-3xl leading-bento-heading m-0 mb-6 text-foreground">
              {benefit.title[0]}
              <br />
              {benefit.title[1]}
            </h3>
            <div className="flex items-start gap-3 pl-30">
              <span className="w-2.5 h-2.5 min-w-2.5 rounded-full mt-1.5 bg-dot-light dark:bg-dot animate-badge-dot shadow-[0_0_8px_var(--color-dot-light)] dark:shadow-[0_0_8px_var(--color-dot)]" />
              <p className="font-mono font-normal text-bento-paragraph text-xs leading-relaxed m-0 text-muted-foreground">
                {benefit.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

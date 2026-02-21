/**
 * BentoBenefitsGrid - Desktop Bento Grid View
 * Layout 16-kolom dengan bento 2x2
 *
 * Tokens used:
 * - Colors: Slate (surface/hover), Amber (dot), Hairline border
 * - Typography: text-narrative (title), text-interface (description)
 *
 * Accepts optional `items` prop from CMS. If provided, uses CMS data;
 * otherwise falls back to hardcoded `benefits` array.
 */

type BenefitItem = {
  title: string
  description: string
  icon?: string
}

type BentoBenefitsGridProps = {
  items?: BenefitItem[]
}

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

export function BentoBenefitsGrid({ items }: BentoBenefitsGridProps) {
  const benefitsData = items
    ? items.map((item, i) => {
        const words = item.title.split(" ")
        return {
          id: `benefit-${i}`,
          title: [words[0], words.slice(1).join(" ")],
          description: item.description,
        }
      })
    : benefits

  return (
    <div className="hidden md:grid grid-cols-16 gap-comfort">
      {benefitsData.map((benefit) => (
        <div
          key={benefit.id}
          className="group relative col-span-8 flex flex-col rounded-shell border-hairline bg-card/85 p-comfort backdrop-blur-[1px] transition-all duration-300 hover:-translate-y-1 hover:bg-slate-200 hover:border-slate-400 dark:bg-slate-900/85 dark:hover:bg-slate-700 dark:hover:border-slate-600"
        >
          <div className="relative flex-1 flex flex-col">
            <h3 className="text-narrative font-light text-3xl leading-[1.1] text-foreground m-0 mb-6">
              {benefit.title[0]}
              <br />
              {benefit.title[1]}
            </h3>
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-2.5 w-2.5 min-w-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px] shadow-amber-500" />
              <p className="text-interface text-xs leading-relaxed text-muted-foreground m-0">
                {benefit.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

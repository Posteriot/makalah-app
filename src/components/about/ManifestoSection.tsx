"use client"

import { useState } from "react"
import { NavArrowDown } from "iconoir-react"
import { SectionBadge } from "@/components/ui/section-badge"
import {
  GridPattern,
  DiagonalStripes,
  DottedPattern,
} from "@/components/marketing/SectionBackground"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { ManifestoTerminalPanel } from "./ManifestoTerminalPanel"

const MANIFESTO_HEADING_LINES = ["Kolaborasi", "Penumbuh", "Pikiran"] as const
const MANIFESTO_SUBHEADING = "Teknologi tidak menggantikan manusia, melainkan melengkapi agar kian berdaya"

const MANIFESTO_PARAGRAPHS = [
  `Platform ini disiapkan untuk merespons disrupsi teknologi dalam aktivitas akademik dan riset. Laju pemakaian AI/Large Language Model nggak bisa dihindari. Pelarangan penggunaannya di lingkungan akademik hanya memicu ketidakjujuran: ngomongnya nggak pakai, padahal diam-diam menggunakan.`,
  `Bagaimana dengan detektor AI—apakah absah? Problematik. Detektor AI rawan false positive dan hanya mengeluarkan persentase probabilitas tanpa argumen jelas. Selama tulisan mengikuti struktur subjek–predikat–objek–keterangan, kalimat apa pun bisa terdeteksi "buatan AI".`,
  `Yang diperlukan sekarang: mengatur penggunaan AI agar transparan, bisa dipertanggungjawabkan, dan punya riwayat pemakaian yang akuntabel. Siapa pun bisa dilacak: apakah paper dibuatkan AI, atau dibuat bersama AI? Bukankah itu dua hal yang berbeda?`,
  `Makalah berdiri di posisi: Penggunaan AI harus transparan, terjejak, dan terdidik.`,
]

const MANIFESTO_MOBILE_HEADING =
  "Platform ini disiapkan untuk merespons disrupsi teknologi dalam aktivitas akademik dan riset."

const MANIFESTO_MOBILE_PARAGRAPHS = [
  MANIFESTO_PARAGRAPHS[0].replace(`${MANIFESTO_MOBILE_HEADING} `, ""),
  ...MANIFESTO_PARAGRAPHS.slice(1),
]

export function ManifestoSection() {
  const [isManifestoOpen, setIsManifestoOpen] = useState(false)

  return (
    <section
      className="relative isolate min-h-[100svh] overflow-hidden bg-background"
      style={{ paddingTop: "var(--header-h)" }}
      id="manifesto"
    >
      {/* Background patterns */}
      <GridPattern className="z-0 opacity-80" />
      <DiagonalStripes className="opacity-75" />
      <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-40" />

      <div className="relative z-[1] mx-auto flex min-h-[100svh] w-full max-w-[var(--container-max-width)] items-center px-4 py-10 md:px-6 md:py-20">
        <div className="grid grid-cols-1 gap-comfort lg:grid-cols-16 lg:gap-16">
          {/* Hero left */}
          <div className="flex flex-col items-start justify-center text-left lg:col-span-7">
            <SectionBadge>Tentang Kami</SectionBadge>
            <h1 className="text-interface mt-6 text-5xl font-medium leading-[0.82] tracking-[-0.06em] text-foreground md:text-5xl lg:text-7xl">
              {MANIFESTO_HEADING_LINES.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>
            <p className="text-narrative text-base md:text-2xl font-normal text-[color:var(--slate-600)] dark:text-[color:var(--slate-200)] max-w-[520px] mt-4 mb-0">
              {MANIFESTO_SUBHEADING}
            </p>

            {/* Content for mobile/tablet */}
            <div className="mt-6 w-full lg:hidden">
              <Collapsible open={isManifestoOpen} onOpenChange={setIsManifestoOpen}>
                <div className="overflow-hidden rounded-shell border-main border-border bg-card/75 backdrop-blur-sm">
                  <div className="px-4 pt-4 pb-3">
                    <p className="text-interface text-base font-medium leading-snug text-foreground">
                      {MANIFESTO_MOBILE_HEADING}
                    </p>
                  </div>

                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="space-y-4 border-t border-hairline px-4 py-4">
                      {MANIFESTO_MOBILE_PARAGRAPHS.map((paragraph, index) => (
                        <p
                          key={index}
                          className="text-narrative text-base leading-relaxed text-[color:var(--slate-50)]"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </CollapsibleContent>

                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "group relative overflow-hidden flex w-full items-center justify-center border border-transparent border-t border-hairline px-4 py-3",
                        "text-signal text-[11px] font-bold",
                        "bg-[color:var(--slate-800)] text-[color:var(--slate-100)]",
                        "hover:text-[color:var(--slate-800)] hover:border-[color:var(--slate-600)]",
                        "dark:bg-[color:var(--slate-100)] dark:text-[color:var(--slate-800)]",
                        "dark:hover:text-[color:var(--slate-100)] dark:hover:border-[color:var(--slate-400)]",
                        "text-left transition-colors focus-ring"
                      )}
                      aria-label={isManifestoOpen ? "Tutup manifesto" : "Baca manifesto lengkap"}
                    >
                      <span
                        className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                        aria-hidden="true"
                      />
                      <span className="relative z-10">
                        {isManifestoOpen ? "TUTUP" : "BACA LENGKAP"}
                      </span>
                      <NavArrowDown
                        className={cn(
                          "pointer-events-none absolute right-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform duration-300",
                          isManifestoOpen && "rotate-180"
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                </div>
              </Collapsible>
            </div>
          </div>

          {/* Hero right: manifesto panel (desktop) */}
          <div className="hidden lg:col-span-9 lg:flex lg:self-stretch lg:min-h-full lg:items-center lg:justify-end lg:-translate-y-8">
            <ManifestoTerminalPanel paragraphs={MANIFESTO_PARAGRAPHS} />
          </div>
        </div>
      </div>
    </section>
  )
}

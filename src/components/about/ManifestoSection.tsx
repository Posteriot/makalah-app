"use client"

import { useState } from "react"
import { NavArrowDown } from "iconoir-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { SectionBadge } from "@/components/ui/section-badge"
import { GridPattern, DottedPattern } from "@/components/marketing/SectionBackground"
import { cn } from "@/lib/utils"

const MANIFESTO_HEADING = "AI Yang Menumbuhkan Pikiran"
const MANIFESTO_SUBHEADING = "Teknologi tidak menggantikan manusia, melainkan melengkapi agar kian berdaya"

const MANIFESTO_SUMMARY = `Platform ini disiapkan untuk merespons disrupsi teknologi dalam aktivitas akademik dan riset. Laju pemakaian AI/Large Language Model nggak bisa dihindari. Pelarangan penggunaannya di lingkungan akademik hanya memicu ketidakjujuran: ngomongnya nggak pakai, padahal diam-diam menggunakan.`

const MANIFESTO_EXTENDED = [
  `Bagaimana dengan detektor AI—apakah absah? Problematik. Detektor AI rawan false positive dan hanya mengeluarkan persentase probabilitas tanpa argumen jelas. Selama tulisan mengikuti struktur subjek–predikat–objek–keterangan, kalimat apa pun bisa terdeteksi "buatan AI".`,
  `Yang diperlukan sekarang: mengatur penggunaan AI agar transparan, bisa dipertanggungjawabkan, dan punya riwayat pemakaian yang akuntabel. Siapa pun bisa dilacak: apakah paper dibuatkan AI, atau dibuat bersama AI? Bukankah itu dua hal yang berbeda?`,
  `Makalah berdiri di posisi: Penggunaan AI harus transparan, terjejak, dan terdidik.`,
]

export function ManifestoSection() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <section
      className="relative min-h-[400px] md:min-h-[500px] flex flex-col justify-center px-4 md:px-6 pb-16 md:pb-24 overflow-hidden bg-muted/30 dark:bg-black"
      style={{ paddingTop: "calc(var(--header-h) + 60px)" }}
      id="manifesto"
    >
      {/* Background patterns */}
      <GridPattern size={48} className="z-0" />
      <DottedPattern spacing={24} withRadialMask={false} className="z-0" />

      <div className="relative z-10 w-full max-w-[var(--container-max-width)] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col items-start gap-3 md:gap-4 mb-8 md:mb-12">
          <SectionBadge>Tentang Kami</SectionBadge>
          <h1 className="font-mono text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight text-foreground leading-tight">
            {MANIFESTO_HEADING}
          </h1>
          <p className="font-mono text-sm md:text-base text-muted-foreground max-w-xl">
            {MANIFESTO_SUBHEADING}
          </p>
        </div>

        {/* Manifesto Content */}
        <div className="max-w-3xl">
          {/* Summary (always visible) */}
          <p className="font-mono text-base leading-relaxed text-foreground mb-4">
            {MANIFESTO_SUMMARY}
          </p>

          {/* Expandable Content */}
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="pt-4 space-y-4">
                {MANIFESTO_EXTENDED.map((paragraph, index) => (
                  <p
                    key={index}
                    className="font-mono text-base leading-relaxed text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </CollapsibleContent>

            {/* Circular Trigger Button */}
            <div className="flex justify-center mt-6">
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "w-9 h-9 rounded-full",
                    "bg-card border border-border",
                    "shadow-sm hover:bg-accent",
                    "flex items-center justify-center",
                    "cursor-pointer transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  )}
                  aria-label={isOpen ? "Tutup manifesto" : "Baca selengkapnya"}
                >
                  <NavArrowDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform duration-300",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
            </div>
          </Collapsible>
        </div>
      </div>
    </section>
  )
}

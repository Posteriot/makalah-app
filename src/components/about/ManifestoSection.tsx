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
      className="relative overflow-hidden bg-background px-4 pb-16 md:px-6 md:pb-24"
      style={{ paddingTop: "calc(var(--header-h) + 60px)" }}
      id="manifesto"
    >
      {/* Background patterns */}
      <GridPattern className="z-0" />
      <DottedPattern spacing={24} withRadialMask={false} className="z-0" />

      <div className="relative z-10 mx-auto w-full max-w-[var(--container-max-width)]">
        <div className="grid grid-cols-1 gap-comfort md:grid-cols-16">
          {/* Section Header */}
          <div className="col-span-1 mb-8 flex flex-col items-start gap-3 md:col-span-12 md:col-start-3 md:mb-12 md:gap-4">
            <SectionBadge>Tentang Kami</SectionBadge>
            <h1 className="text-interface text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">
              {MANIFESTO_HEADING}
            </h1>
            <p className="text-narrative max-w-xl text-sm text-muted-foreground md:text-base">
              {MANIFESTO_SUBHEADING}
            </p>
          </div>

          {/* Manifesto Content */}
          <div className="col-span-1 md:col-span-12 md:col-start-3">
            {/* Summary (always visible) */}
            <p className="text-narrative mb-4 text-base leading-relaxed text-foreground">
              {MANIFESTO_SUMMARY}
            </p>

            {/* Expandable Content */}
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <div className="space-y-4 pt-4">
                  {MANIFESTO_EXTENDED.map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-narrative text-base leading-relaxed text-muted-foreground"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CollapsibleContent>

              {/* Circular Trigger Button */}
              <div className="mt-6 flex justify-center">
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "h-10 w-10 rounded-action",
                      "bg-card border-main border-border",
                      "shadow-sm hover:bg-accent",
                      "flex items-center justify-center",
                      "cursor-pointer transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                    aria-label={isOpen ? "Tutup manifesto" : "Baca selengkapnya"}
                  >
                    <NavArrowDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-300",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
              </div>
            </Collapsible>
          </div>
        </div>
      </div>
    </section>
  )
}

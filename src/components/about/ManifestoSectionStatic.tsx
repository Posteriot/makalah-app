"use client"

import { useEffect, useRef, useState } from "react"
import { SectionBadge } from "@/components/ui/section-badge"
import {
  GridPattern,
  DiagonalStripes,
  DottedPattern,
} from "@/components/marketing/SectionBackground"
import { ManifestoTerminalPanel } from "./ManifestoTerminalPanel"
import { ManifestoMobileAccordion } from "./ManifestoMobileAccordion"

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

export function ManifestoSectionStatic() {
  const [isManifestoOpen, setIsManifestoOpen] = useState(false)
  const sectionRef = useRef<HTMLElement | null>(null)
  const closeScrollTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (closeScrollTimeoutRef.current !== null) {
        window.clearTimeout(closeScrollTimeoutRef.current)
      }
    }
  }, [])

  const handleManifestoOpenChange = (nextOpen: boolean) => {
    setIsManifestoOpen(nextOpen)

    if (nextOpen || typeof window === "undefined") {
      return
    }

    if (!window.matchMedia("(max-width: 1023px)").matches) {
      return
    }

    if (closeScrollTimeoutRef.current !== null) {
      window.clearTimeout(closeScrollTimeoutRef.current)
    }

    closeScrollTimeoutRef.current = window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      closeScrollTimeoutRef.current = null
    }, 220)
  }

  return (
    <section
      ref={sectionRef}
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
              <ManifestoMobileAccordion
                heading={MANIFESTO_MOBILE_HEADING}
                paragraphs={MANIFESTO_MOBILE_PARAGRAPHS}
                isOpen={isManifestoOpen}
                onOpenChange={handleManifestoOpenChange}
              />
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

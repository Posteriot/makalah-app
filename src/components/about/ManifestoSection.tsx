/**
 * ManifestoSection Component for About Page
 *
 * Displays the company manifesto with:
 * - Section heading: "Jadi, begini..."
 * - Summary text (always visible) with prose styling
 * - Expandable content via Radix Collapsible with circular trigger button
 *
 * Uses existing CSS classes:
 * - manifesto-container: Max-width 56rem, centered
 * - section-heading: Section typography
 * - prose / prose-invert: Text styling
 * - manifesto-trigger: Circular button with chevron
 */

"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { SECTION_HEADINGS } from "./data"
import { cn } from "@/lib/utils"

export function ManifestoSection() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <section className="manifesto-section section-full">
      <div className="manifesto-container">
        {/* Section Heading */}
        <h2 className="section-heading">{SECTION_HEADINGS.manifesto}</h2>

        {/* Summary (always visible) */}
        <div className="prose">
          <p>
            Platform ini disiapkan untuk merespons disrupsi teknologi dalam aktivitas akademik dan riset. Laju
            pemakaian AI/<em>Large Language Model</em> nggak bisa dihindari. Pelarangan penggunaannya di lingkungan akademik hanya memicu ketidakjujuran:
            ngomongnya nggak pakai, padahal diam-diam menggunakan.
          </p>
        </div>

        {/* Read More Accordion */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* Expandable Content */}
          <CollapsibleContent className="manifesto-content-radix">
            <div className="manifesto-content-inner prose prose-invert">
              <p>
                Bagaimana dengan detektor AI—apakah absah? Problematik. Detektor AI rawan <em>false positive</em>{" "}
                dan hanya mengeluarkan persentase probabilitas tanpa argumen jelas. Selama tulisan mengikuti
                struktur subjek–predikat–objek–keterangan, kalimat apa pun bisa terdeteksi &quot;buatan AI&quot;.
              </p>
              <p>
                Yang diperlukan sekarang: mengatur penggunaan AI agar transparan, bisa dipertanggungjawabkan, dan
                punya riwayat pemakaian yang akuntabel. Siapa pun bisa dilacak: apakah paper dibuatkan AI, atau
                dibuat bersama AI? Bukankah itu dua hal yang berbeda?
              </p>
              <p>
                Makalah berdiri di posisi: Penggunaan AI harus transparan, terjejak, dan terdidik.
              </p>
            </div>
          </CollapsibleContent>

          {/* Circular Trigger Button - Always at bottom */}
          <div className="manifesto-trigger-wrapper">
            <CollapsibleTrigger asChild>
              <button
                className={cn("manifesto-trigger", isOpen && "open")}
                aria-label={isOpen ? "Tutup manifesto" : "Baca selengkapnya manifesto"}
              >
                <ChevronDown className="icon" />
              </button>
            </CollapsibleTrigger>
          </div>
        </Collapsible>
      </div>
    </section>
  )
}

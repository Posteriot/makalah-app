"use client"

import { useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { WarningTriangle } from "iconoir-react"
import { DottedPattern } from "@/components/marketing/SectionBackground"
import {
  TechnicalReportForm,
  TechnicalReportProgressSection,
} from "@/components/technical-report"
import type { TechnicalReportSource } from "@/lib/hooks/useTechnicalReport"

const allowedSources = new Set<TechnicalReportSource>([
  "chat-inline",
  "footer-link",
  "support-page",
])

export default function TechnicalReportPage() {
  const searchParams = useSearchParams()
  const formSectionRef = useRef<HTMLElement | null>(null)
  const source = useMemo<TechnicalReportSource>(() => {
    const candidate = searchParams.get("source")
    if (!candidate) return "support-page"
    return allowedSources.has(candidate as TechnicalReportSource)
      ? (candidate as TechnicalReportSource)
      : "support-page"
  }, [searchParams])

  const scrollToForm = () => {
    formSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  return (
    <div className="admin-container relative isolate left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden bg-background">
      <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-6 lg:px-8">
        <main className="col-span-1 pt-4 md:col-span-12">
          <div className="mx-auto w-full max-w-4xl rounded-shell border-hairline bg-card/90 px-5 py-6 backdrop-blur-[1px] dark:bg-slate-900 md:px-8">
            <div className="mb-6 space-y-2">
              <h1 className="text-narrative flex items-center gap-2 text-2xl font-medium tracking-tight text-foreground md:text-3xl">
                <WarningTriangle className="h-6 w-6 text-foreground" />
                Lapor Masalah Chat
              </h1>
              <p className="text-narrative text-sm text-muted-foreground">
                Pantau progres laporan teknis dan kirim laporan baru jika diperlukan.
              </p>
            </div>

            <div className="space-y-8">
              <TechnicalReportProgressSection onCreateReportClick={scrollToForm} />

              <section ref={formSectionRef} className="space-y-4 border-t border-border/80 pt-6">
                <div className="space-y-1">
                  <h2 className="text-narrative text-lg font-medium text-foreground">Lapor Masalah</h2>
                  <p className="text-narrative text-sm text-muted-foreground">
                    Isi formulir berikut untuk melaporkan kendala teknis pada chat atau paper session.
                  </p>
                </div>
                <TechnicalReportForm source={source} />
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

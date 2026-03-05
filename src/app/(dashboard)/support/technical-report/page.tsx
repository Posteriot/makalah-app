"use client"

import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  WarningTriangle,
  SidebarExpand,
  SidebarCollapse,
  Clock,
} from "iconoir-react"
import { DottedPattern } from "@/components/marketing/SectionBackground"
import {
  TechnicalReportForm,
  TechnicalReportProgressSection,
} from "@/components/technical-report"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { TechnicalReportSource } from "@/lib/hooks/useTechnicalReport"

const allowedSources = new Set<TechnicalReportSource>([
  "chat-inline",
  "footer-link",
  "support-page",
])

type TechnicalReportSectionId = "progress" | "report"

const TECHNICAL_REPORT_SECTIONS: Array<{
  id: TechnicalReportSectionId
  label: string
  title: string
  description: string
  icon: typeof Clock
}> = [
  {
    id: "progress",
    label: "Progres Laporan",
    title: "Progres Laporan",
    description: "Pantau status terbaru dari laporan yang sudah dikirim.",
    icon: Clock,
  },
  {
    id: "report",
    label: "Lapor Masalah",
    title: "Lapor Masalah",
    description: "Kirim laporan baru saat ada kendala saat chat atau menyusun paper.",
    icon: WarningTriangle,
  },
]

function TechnicalReportPageContent() {
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState<TechnicalReportSectionId>("progress")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const source = useMemo<TechnicalReportSource>(() => {
    const candidate = searchParams.get("source")
    if (!candidate) return "support-page"
    return allowedSources.has(candidate as TechnicalReportSource)
      ? (candidate as TechnicalReportSource)
      : "support-page"
  }, [searchParams])

  const currentSection =
    TECHNICAL_REPORT_SECTIONS.find((section) => section.id === activeSection) ??
    TECHNICAL_REPORT_SECTIONS[0]
  const HeaderIcon = currentSection.icon

  return (
    <div className="admin-container relative isolate left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden bg-background">
      <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-6 lg:px-8">
        <div className="md:hidden flex justify-end py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? "Tutup menu lapor masalah" : "Buka menu lapor masalah"}
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-action p-1 text-foreground transition-colors hover:text-foreground/70"
          >
            {sidebarOpen ? (
              <SidebarCollapse className="h-7 w-7" strokeWidth={1.5} />
            ) : (
              <SidebarExpand className="h-7 w-7" strokeWidth={1.5} />
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-comfort pb-2 md:grid-cols-16">
          <aside className="hidden md:col-span-4 md:block">
            <div className="mt-4 rounded-shell border-hairline bg-card/90 p-comfort backdrop-blur-[1px] dark:bg-slate-900">
              <nav className="space-y-6">
                <div>
                  <h3 className="text-signal text-[10px] font-bold text-muted-foreground">
                    LAPOR MASALAH
                  </h3>
                  <ul className="mt-3 space-y-1">
                    {TECHNICAL_REPORT_SECTIONS.map((section) => {
                      const ItemIcon = section.icon
                      const isActive = activeSection === section.id
                      return (
                        <li key={section.id}>
                          <button
                            type="button"
                            onClick={() => setActiveSection(section.id)}
                            className={cn(
                              "text-interface flex w-full items-center gap-3 rounded-action px-3 py-2 text-sm transition-colors",
                              isActive
                                ? "bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100"
                                : "text-muted-foreground hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-500 dark:hover:text-slate-50"
                            )}
                          >
                            <ItemIcon className="h-4 w-4 shrink-0" />
                            <span className="flex-1 truncate text-left">{section.label}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </nav>
            </div>
          </aside>

          <main className="col-span-1 pt-4 md:col-span-12">
            <div className="mx-auto w-full max-w-4xl rounded-shell border-hairline bg-card/90 px-5 py-6 backdrop-blur-[1px] dark:bg-slate-900 md:px-8">
              <div className="mb-6 space-y-2">
                <h1 className="text-narrative flex items-center gap-2 text-2xl font-medium tracking-tight text-foreground md:text-3xl">
                  <HeaderIcon className="h-6 w-6 text-foreground" />
                  {currentSection.title}
                </h1>
                <p className="text-narrative text-sm text-muted-foreground">
                  {currentSection.description}
                </p>
              </div>

              {activeSection === "progress" ? (
                <TechnicalReportProgressSection
                  onCreateReportClick={() => setActiveSection("report")}
                />
              ) : (
                <TechnicalReportForm source={source} />
              )}
            </div>
          </main>
        </div>
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="right" className="w-72 p-0">
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-interface font-mono text-sm font-medium text-foreground">
              Lapor Masalah
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-5 py-5">
            <nav className="space-y-6">
              <div>
                <h3 className="text-signal text-[10px] font-bold text-muted-foreground">
                  LAPOR MASALAH
                </h3>
                <ul className="mt-3 space-y-1">
                  {TECHNICAL_REPORT_SECTIONS.map((section) => {
                    const ItemIcon = section.icon
                    const isActive = activeSection === section.id
                    return (
                      <li key={`mobile-${section.id}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSection(section.id)
                            setSidebarOpen(false)
                          }}
                          className={cn(
                            "text-interface flex w-full items-center gap-3 rounded-action px-3 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100"
                              : "text-muted-foreground hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-500 dark:hover:text-slate-50"
                          )}
                        >
                          <ItemIcon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate text-left">{section.label}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default function TechnicalReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm font-mono text-muted-foreground">Memuat halaman...</p>
          </div>
        </div>
      }
    >
      <TechnicalReportPageContent />
    </Suspense>
  )
}

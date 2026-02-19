import { SectionBadge } from "@/components/ui/section-badge"
import { GridPattern, DiagonalStripes } from "@/components/marketing/SectionBackground"
import { WorkflowFeatureMock } from "./WorkflowFeatureMock"

export function WorkflowFeatureSection() {
  return (
    <section
      id="fitur-workflow"
      className="relative isolate min-h-[100svh] overflow-hidden bg-background"
    >
      <GridPattern className="z-0 opacity-80" />
      <DiagonalStripes className="opacity-70" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl items-center px-4 py-10 md:px-8 md:py-20">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:items-stretch lg:gap-14">
          <div className="order-2 lg:order-1 lg:col-span-7">
            <WorkflowFeatureMock />
          </div>

          <div className="order-1 lg:order-2 lg:col-span-5 lg:flex lg:h-full lg:flex-col lg:justify-between">
            <div>
              <SectionBadge>Fitur</SectionBadge>
              <p className="mt-4 text-signal text-xs font-bold uppercase tracking-[0.26em] text-[color:var(--amber-500)]">
                Workflow
              </p>
              <h2 className="mt-3 text-narrative text-3xl font-medium tracking-tight text-foreground md:text-5xl">
                Pagar ketat di tiap tahap penyusunan
              </h2>
            </div>

            <p className="mt-7 max-w-[580px] text-narrative text-base leading-relaxed text-slate-700 dark:text-slate-200 md:mt-8 md:text-2xl lg:mt-0">
              Workflow yang tertanam dalam Makalah Ai, akan menjadi pengawal ketat selama penyusunan paper. Konteks
              terjaga, tidak melenceng, percakapan apapun berujung pada output paper.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

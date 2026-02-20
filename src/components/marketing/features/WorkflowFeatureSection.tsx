import Image from "next/image"
import { SectionBadge } from "@/components/ui/section-badge"
import { GridPattern, DiagonalStripes } from "@/components/marketing/SectionBackground"

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
            <div className="relative mx-auto w-[92%] max-w-[480px] rounded-xl shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.18)] dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.22)] sm:w-full sm:max-w-[500px] lg:max-w-[452px]">
              <Image
                src="/images/workflow-feature-mock-light.png"
                alt="Mockup fitur Workflow Makalah AI"
                width={1200}
                height={1344}
                className="h-auto w-full dark:hidden"
              />
              <Image
                src="/images/workflow-feature-mock-dark.png"
                alt="Mockup fitur Workflow Makalah AI"
                width={1200}
                height={1344}
                className="hidden h-auto w-full dark:block"
              />
            </div>
          </div>

          <div className="order-1 lg:order-2 lg:col-span-5 lg:flex lg:h-full lg:flex-col lg:justify-center">
            <div className="space-y-7">
              <div>
                <SectionBadge>Fitur</SectionBadge>
                <p className="mt-4 text-signal text-xs font-bold uppercase tracking-[0.26em] text-[color:var(--amber-500)]">
                  Workflow
                </p>
                <h2 className="mt-3 text-narrative text-3xl leading-tight md:text-4xl font-medium tracking-tight text-foreground">
                  Pagar ketat di tiap tahap penyusunan
                </h2>
              </div>

              <p className="max-w-[580px] text-interface text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                Workflow dalam Makalah Ai, akan menjadi pengawal ketat selama penyusunan paper. Konteks
                terjaga, tidak melenceng, percakapan apapun berujung pada output paper.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

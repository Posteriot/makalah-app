import Image from "next/image"
import { SectionBadge } from "@/components/ui/section-badge"
import { DiagonalStripes, DottedPattern } from "@/components/marketing/SectionBackground"

export function RefrasaFeatureSection() {
  return (
    <section
      id="fitur-refrasa"
      className="relative isolate h-[100svh] min-h-[100svh] overflow-hidden bg-[var(--section-bg-alt)]"
    >
      <DiagonalStripes className="opacity-40" />
      <DottedPattern spacing={24} withRadialMask={true} />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl items-center px-4 py-10 md:px-8 md:py-20">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:items-stretch lg:gap-16">
          <div className="order-1 lg:col-span-6 lg:flex lg:h-full lg:flex-col lg:justify-center">
            <div className="space-y-7 lg:ml-auto lg:max-w-[520px]">
              <div>
                <SectionBadge>Fitur</SectionBadge>
                <p className="mt-4 text-signal text-xs font-bold uppercase tracking-[0.26em] text-[color:var(--amber-500)]">
                  Refrasa
                </p>
                <h2 className="mt-3 text-narrative text-3xl leading-tight md:text-4xl font-medium tracking-tight text-foreground">
                  Konversi pembahasaan menjadi Manusiawi
                </h2>
              </div>

              <p className="max-w-[580px] text-interface text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                Sekali klik fitur refrasa, maka tatanan kalimat dan nuansa yang semula bergaya robot dan seragam ala
                AI, langsung terkonversi menjadi pembahasaan manusiawi.
              </p>
            </div>
          </div>

          <div className="order-2 lg:col-span-6">
            <div className="relative mx-auto w-[92%] max-w-[480px] rounded-xl shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.18)] dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.22)] sm:w-full sm:max-w-[500px] lg:mx-0 lg:ml-0 lg:mr-auto lg:max-w-[452px]">
              <Image
                src="/images/refrasa-feature-mock-light.png"
                alt="Mockup fitur Refrasa Makalah AI"
                width={1200}
                height={1344}
                className="h-auto w-full dark:hidden"
              />
              <Image
                src="/images/refrasa-feature-mock-dark.png"
                alt="Mockup fitur Refrasa Makalah AI"
                width={1200}
                height={1344}
                className="hidden h-auto w-full dark:block"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

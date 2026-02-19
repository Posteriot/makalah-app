import { SectionBadge } from "@/components/ui/section-badge"
import { DiagonalStripes, DottedPattern } from "@/components/marketing/SectionBackground"
import { RefrasaFeatureMock } from "./RefrasaFeatureMock"

export function RefrasaFeatureSection() {
  return (
    <section
      id="fitur-refrasa"
      className="relative isolate h-[100svh] min-h-[100svh] overflow-hidden bg-[var(--section-bg-alt)]"
    >
      <DiagonalStripes className="opacity-40" />
      <DottedPattern spacing={24} withRadialMask={true} />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl items-center px-4 py-10 md:px-8 md:py-20">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:items-stretch lg:gap-14">
          <div className="order-1 lg:col-span-5 lg:flex lg:h-full lg:flex-col lg:justify-between">
            <div>
              <SectionBadge>Fitur</SectionBadge>
              <p className="mt-4 text-signal text-xs font-bold uppercase tracking-[0.26em] text-[color:var(--amber-500)]">
                Refrasa
              </p>
              <h2 className="mt-3 text-narrative text-3xl font-medium tracking-tight text-foreground md:text-5xl">
                Konversi pembahasaan menjadi Manusiawi
              </h2>
            </div>
            <p className="mt-7 max-w-[580px] text-narrative text-base leading-relaxed text-slate-700 dark:text-slate-200 md:mt-8 md:text-2xl lg:mt-0">
              Sekali klik fitur refrasa, maka tatanan kalimat dan nuansa yang semula bergaya robot dan seragam ala
              AI, langsung terkonversi menjadi pembahasaan manusiawi.
            </p>
          </div>

          <div className="order-2 lg:col-span-7">
            <RefrasaFeatureMock />
          </div>
        </div>
      </div>
    </section>
  )
}

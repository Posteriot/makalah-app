import { cn } from "@/lib/utils"

const MOCK_PARAGRAPH_LEFT = [
  "Gagasan Paper: Dampak AI terhadap Pendidikan di Indonesia",
  "Ide Kasar: Penggunaan AI dalam pembelajaran meningkatkan adaptivitas materi.",
  "Analisis: Literasi digital guru dan siswa menjadi faktor penentu implementasi yang efektif.",
  "Angle: Fokus riset diarahkan ke konteks sekolah menengah di wilayah perkotaan.",
  "Novelty: Kajian menggabungkan perspektif pedagogi dan efisiensi administrasi guru.",
  "Catatan: Struktur argumen masih terasa berulang dan ritme paragraf belum stabil.",
]

const MOCK_PARAGRAPH_RIGHT = [
  "Gagasan Paper: Dampak AI terhadap Pendidikan di Indonesia",
  "Ide Pokok: Studi ini menelaah peran AI untuk memperkuat personalisasi pembelajaran di Indonesia.",
  "Analisis: Efektivitas implementasi dipengaruhi kesiapan literasi digital guru dan siswa.",
  "Sudut Pandang: Pembahasan dipusatkan pada penerapan di sekolah menengah kawasan urban.",
  "Kebaruan: Sintesis pedagogi dan efisiensi administrasi dirumuskan sebagai kontribusi utama.",
  "Catatan Refrasa: Pola kalimat dibuat lebih variatif tanpa mengubah makna akademis.",
]

export function RefrasaFeatureMock() {
  return (
    <div className="relative mx-auto w-full max-w-[600px]">
      <div
        className={cn(
          "relative aspect-[1/1.12] overflow-hidden rounded-xl border",
          "border-stone-400/70 bg-stone-200/90 dark:border-stone-600/80 dark:bg-stone-900/95",
          "shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.18)]",
          "dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.22)]"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-11 items-center gap-3 border-b border-stone-500/60 bg-stone-500/90 px-4 dark:border-stone-600 dark:bg-stone-700">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
            <div className="rounded-none border border-stone-500/80 bg-stone-800 px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.24em] text-stone-200">
              makalah.ai/refrasa
            </div>
          </div>

          <div className="border-b border-slate-300/65 bg-slate-100/70 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/70">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
              <span className="rounded-badge border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                Refrasa
              </span>
              <span className="rounded-badge border border-slate-300/85 bg-slate-200/80 px-2 py-0.5 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                2 versi
              </span>
              <span className="rounded-badge border border-slate-300/85 bg-slate-200/80 px-2 py-0.5 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                223 kata
              </span>
              <span className="rounded-badge border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
                Terapkan
              </span>
            </div>
          </div>

          <div className="relative grid min-h-0 flex-1 grid-cols-2">
            <div className="border-r border-slate-300/60 px-4 py-4 dark:border-slate-700/70">
              <span className="mb-3 inline-block rounded-badge border border-slate-300/85 bg-slate-200/80 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Asli
              </span>
              <div className="space-y-2.5">
                {MOCK_PARAGRAPH_LEFT.map((line, index) => (
                  <p
                    key={`${line}-${index}`}
                    className="text-[12px] leading-[1.55] text-slate-800 dark:text-slate-200"
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <div className="px-4 py-4">
              <span className="mb-3 inline-block rounded-badge border border-amber-500/45 bg-amber-500/15 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                Refrasa
              </span>
              <div className="space-y-2.5">
                {MOCK_PARAGRAPH_RIGHT.map((line, index) => (
                  <p
                    key={`${line}-${index}`}
                    className="text-[12px] leading-[1.55] text-slate-900 dark:text-slate-100"
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(120deg,rgba(16,185,129,0.16)_0%,rgba(2,6,23,0.72)_48%,rgba(245,158,11,0.18)_100%)] backdrop-blur-[3.6px]">
              <span className="pointer-events-none absolute inset-0 bg-slate-950/30" />
              <span className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,rgba(16,185,129,0.3)_0%,rgba(245,158,11,0.28)_100%)] blur-3xl" />
              <span className="pointer-events-none absolute left-[22%] top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-emerald-400/28 blur-[56px]" />
              <span className="pointer-events-none absolute right-[22%] top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-amber-400/28 blur-[56px]" />
              <div className="flex flex-col items-center gap-3">
                <div className="relative h-12 w-12">
                  <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(203,213,225,0.08),rgba(226,232,240,0.9),rgba(148,163,184,0.28),rgba(203,213,225,0.08))]" />
                  <span className="absolute inset-[4px] rounded-full bg-slate-900/80 shadow-[inset_0_0_10px_rgba(148,163,184,0.25)]" />
                  <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-100/85 shadow-[0_0_10px_rgba(226,232,240,0.75)]" />
                </div>
                <p className="font-mono text-[18px] tracking-[0.06em] text-slate-50">
                  Memeriksa variasi kosa kata
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

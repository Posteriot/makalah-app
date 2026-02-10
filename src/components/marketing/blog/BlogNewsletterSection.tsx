"use client"

import { Input } from "@/components/ui/input"
import { SectionCTA } from "@/components/ui/section-cta"

export function BlogNewsletterSection() {
  return (
    <div className="mt-8">
      <div className="rounded-shell border-hairline bg-card/90 p-8 text-center backdrop-blur-[1px] transition-colors duration-200 hover:bg-card dark:bg-slate-800/90 dark:hover:bg-slate-800 md:p-10">
        <h2 className="text-narrative mb-3 text-2xl font-medium tracking-tight text-foreground md:text-3xl">
          Tetap Terhubung
        </h2>
        <p className="text-narrative mx-auto mb-8 max-w-xl text-sm text-muted-foreground">
          Dapatkan update terbaru dari Makalah langsung di email Anda.
        </p>
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Alamat email..."
            className="blog-neutral-input text-interface text-xs h-8 rounded-action border-main border-border bg-background"
          />
          <SectionCTA className="px-6">
            Gabung
          </SectionCTA>
        </div>
      </div>
    </div>
  )
}

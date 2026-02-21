"use client"

import Image from "next/image"

interface ManifestoTerminalPanelProps {
  paragraphs: string[]
}

export function ManifestoTerminalPanel({ paragraphs }: ManifestoTerminalPanelProps) {
  return (
    <div className="relative w-full max-w-[720px] overflow-hidden rounded-md bg-transparent shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.3)] dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.2)]">
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src="/images/manifesto-terminal-light.png"
          alt=""
          aria-hidden
          fill
          sizes="(min-width: 1024px) 720px, 100vw"
          className="h-full w-full object-cover dark:hidden"
        />
        <Image
          src="/images/manifesto-terminal-dark.png"
          alt=""
          aria-hidden
          fill
          sizes="(min-width: 1024px) 720px, 100vw"
          className="hidden h-full w-full object-cover dark:block"
        />
      </div>

      <div className="relative z-[1]">
        <div className="px-3 py-3">
          <p className="ml-16 px-3 py-1 font-mono text-[9px] font-medium tracking-widest text-stone-100">
            makalah.ai/about#manifesto
          </p>
        </div>

        <div className="p-6 pt-[25px]">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500">
            MANIFESTO_STREAM
          </p>

          <div className="mt-4 font-mono">
            {paragraphs.map((paragraph, index) => {
              const isLast = index === paragraphs.length - 1

              return (
                <div key={index} className="relative pb-4">
                  <div className="flex gap-3">
                    <span className="pt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="max-w-[620px] text-sm leading-relaxed text-stone-200">
                      {paragraph}
                    </p>
                  </div>
                  {!isLast && <div className="h-[1px]" />}
                </div>
              )
            })}
          </div>

          <div className="mt-3 pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-stone-400">
            MODE: GUIDED_COLLABORATION · SOURCE: HUMAN+AI
          </div>
        </div>
      </div>
    </div>
  )
}

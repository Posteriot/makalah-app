"use client"

interface ManifestoTerminalPanelProps {
  paragraphs: string[]
}

export function ManifestoTerminalPanel({ paragraphs }: ManifestoTerminalPanelProps) {
  return (
    <div className="w-full max-w-[720px] overflow-hidden rounded-md border-[2px] border-stone-500 bg-stone-800 shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.3)] dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.2)]">
      {/* Terminal Header */}
      <div className="flex items-center gap-4 border-b-[0.5px] border-stone-700 bg-stone-600 p-3">
        <div className="flex gap-1.5 px-1">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        </div>
        <div className="rounded-none border-[0.5px] border-stone-600 bg-stone-800 px-3 py-1 font-mono text-[9px] font-medium tracking-widest text-stone-100">
          makalah.ai/about#manifesto
        </div>
      </div>

      {/* Terminal Body */}
      <div className="p-6">
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
                {!isLast && (
                  <div className="absolute right-0 bottom-0 left-0 border-b-[0.5px] border-dashed border-stone-700/30" />
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-3 border-t-[0.5px] border-stone-700/50 pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-stone-400">
          MODE: GUIDED_COLLABORATION · SOURCE: HUMAN+AI
        </div>
      </div>
    </div>
  )
}

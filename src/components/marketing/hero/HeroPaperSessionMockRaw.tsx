import Image from "next/image"
import {
  ChatBubble,
  EditPencil,
  Folder,
  GitBranch,
  NavArrowDown,
  Page,
} from "iconoir-react"
import { cn } from "@/lib/utils"

const ARTIFACT_ITEMS = [
  { title: "Gagasan Paper - Dampak AI Pendidikan", version: 1, type: "paper" as const },
  { title: "Gagasan Paper - Dampak AI Pendidikan", version: 4, type: "refrasa" as const },
  { title: "Topik Definitif - Pemanfaatan AI di PT Indonesia", version: 1, type: "paper" as const },
  { title: "Topik Definitif - Pemanfaatan AI di PT Indonesia", version: 10, type: "refrasa" as const },
  { title: "Outline Paper - Pemanfaatan AI di PT Indonesia", version: 1, type: "paper" as const },
  { title: "Abstrak Makalah", version: 1, type: "paper" as const },
  { title: "Pendahuluan - Pemanfaatan AI di PT Indonesia", version: 1, type: "paper" as const },
  { title: "Pendahuluan - Pemanfaatan AI di PT Indonesia", version: 1, type: "refrasa" as const },
]

/**
 * Raw export source for hero paper-session mock.
 * Source of truth UI: chat activity bar + sidebar paper sessions panel.
 */
export function HeroPaperSessionMockRaw() {
  return (
    <div
      id="hero-paper-session-mock-export"
      role="img"
      aria-label="Mockup sesi paper sidebar Makalah AI"
      className={cn(
        "h-[768px] w-[768px] overflow-hidden rounded-[16px] border border-stone-500 bg-stone-800 text-stone-100"
      )}
    >
      <div className="grid h-full grid-cols-[66px_1fr]">
        <aside className="border-r border-stone-700 bg-stone-900">
          <div className="flex h-14 items-center justify-center border-b border-stone-700">
            <Image
              src="/logo/makalah_logo_light.svg"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7"
            />
          </div>

          <div className="flex flex-col items-center gap-2 py-6">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-action text-stone-400"
              aria-label="Chat history"
            >
              <ChatBubble className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-action border border-stone-600 bg-stone-700 text-stone-100"
              aria-label="Sesi paper"
            >
              <Page className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-action text-stone-400"
              aria-label="Linimasa progres"
            >
              <GitBranch className="h-5 w-5" />
            </button>
          </div>
        </aside>

        <section className="bg-stone-800">
          <div className="flex h-14 items-center justify-end border-b border-stone-700 px-5">
            <span className="font-mono text-lg text-stone-500">«</span>
          </div>

          <div className="px-6 py-6">
            <h3 className="text-[24px] font-semibold leading-none">Sesi Paper</h3>
            <p className="mt-2 text-[20px] font-mono leading-none text-stone-400">Folder Artifak</p>

            <div className="mt-7">
              <div className="flex items-center gap-3 rounded-action border border-transparent px-1 py-1">
                <NavArrowDown className="h-4 w-4 text-stone-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                <Folder className="h-[18px] w-[18px] text-sky-400 [&_path]:fill-current [&_path]:stroke-current" />
                <span className="min-w-0 flex-1 truncate text-[18px] font-mono font-medium">
                  AI_&_Pendidikan_di_Indonesia
                </span>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-action border border-stone-600 text-stone-400"
                  aria-label="Edit folder"
                >
                  <EditPencil className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 pl-8">
                <p className="text-[16px] font-mono text-stone-400">Stage 6/13 - Tinjauan Literatur</p>
                <span className="mt-2 inline-flex rounded-badge border border-stone-700 bg-stone-900 px-2 py-1 text-[13px] font-mono text-stone-400">
                  13 artifak
                </span>
              </div>

              <div className="mt-6 space-y-2.5 pl-8">
                {ARTIFACT_ITEMS.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="flex items-center gap-3 rounded-action border border-transparent px-1 py-1.5"
                  >
                    {item.type === "refrasa" ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-amber-500/25 text-[11px] font-mono font-bold text-amber-300">
                        R
                      </span>
                    ) : (
                      <Page className="h-5 w-5 text-stone-300" />
                    )}

                    <span className="min-w-0 flex-1 truncate text-[17px] leading-tight">{item.title}</span>

                    <span className="shrink-0 rounded-badge border border-sky-500/45 bg-sky-500 px-2 py-0.5 text-[11px] font-mono font-semibold text-slate-100">
                      v{item.version}
                    </span>

                    <span className="shrink-0 rounded-badge border border-emerald-500/40 bg-emerald-500/90 px-2 py-0.5 text-[11px] font-mono font-semibold uppercase tracking-wide text-slate-50">
                      Final
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

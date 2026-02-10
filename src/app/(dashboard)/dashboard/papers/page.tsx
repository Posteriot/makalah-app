import { PaperSessionsContainer } from "@/components/paper/PaperSessionsContainer"

export default function PapersPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-shell border border-hairline bg-slate-900/50 p-4">
        <h1 className="text-interface text-2xl font-bold tracking-tight text-slate-100">Paper Sessions</h1>
        <p className="text-slate-400 mt-1">
          Kelola semua paper yang sedang atau sudah kamu kerjakan.
        </p>
      </div>
      <PaperSessionsContainer />
    </div>
  )
}

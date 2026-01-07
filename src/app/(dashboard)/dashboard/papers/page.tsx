import type { Metadata } from "next"
import { PaperSessionsContainer } from "@/components/paper/PaperSessionsContainer"

export const metadata: Metadata = {
  title: "Makalah Ai",
  description: "Kelola semua paper sessions kamu - lanjutkan yang belum selesai atau export yang sudah completed.",
}

export default function PapersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paper Sessions</h1>
        <p className="text-muted-foreground">
          Kelola semua paper yang sedang atau sudah kamu kerjakan.
        </p>
      </div>
      <PaperSessionsContainer />
    </div>
  )
}

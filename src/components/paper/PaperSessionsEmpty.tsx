"use client"

import React from "react"
import Link from "next/link"
import { Page, PlusCircle } from "iconoir-react"
import { Button } from "@/components/ui/button"
import { STAGE_ORDER } from "../../../convex/paperSessions/constants"

export function PaperSessionsEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 rounded-shell border border-hairline bg-slate-900/50">
      <div className="rounded-full bg-slate-800 p-4 mb-4 border border-hairline">
        <Page className="h-8 w-8 text-slate-500" />
      </div>
      <h3 className="text-interface text-lg font-semibold mb-2 text-slate-100">Belum ada paper yang dibuat</h3>
      <p className="text-slate-400 text-center max-w-md mb-6">
        Mulai percakapan baru dan minta bantuan untuk menulis paper. AI akan menulis dan memandu kamu
        melalui {STAGE_ORDER.length} tahap penulisan paper akademik.
      </p>
      <Button asChild className="text-interface text-xs rounded-action bg-amber-500 text-slate-950 hover:bg-amber-400">
        <Link href="/chat">
          <PlusCircle className="h-4 w-4 mr-2" />
          Mulai Paper Baru
        </Link>
      </Button>
    </div>
  )
}

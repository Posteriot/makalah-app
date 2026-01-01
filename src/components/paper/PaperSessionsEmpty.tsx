"use client"

import React from "react"
import Link from "next/link"
import { FileText, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PaperSessionsEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-muted p-4 mb-4">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Belum ada paper yang dibuat</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Mulai percakapan baru dan minta bantuan untuk menulis paper. AI akan memandu kamu
        melalui 14 tahap penulisan paper akademik.
      </p>
      <Button asChild>
        <Link href="/chat">
          <PlusCircle className="h-4 w-4 mr-2" />
          Mulai Paper Baru
        </Link>
      </Button>
    </div>
  )
}

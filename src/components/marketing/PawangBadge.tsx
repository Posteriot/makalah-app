"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function PawangBadge() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-full bg-card text-sm font-medium cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
        aria-haspopup="dialog"
      >
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-[badge-dot-blink_1.2s_ease-in-out_infinite]" />
        <span>Anda Pawang, Ai Tukang</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manusia adalah pawang, Ai sebatas tukang</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Kredo tersebut jadi pedoman kami dalam membangun Makalah AI. Kami percaya bahwa AI adalah alat bantu, bukan pengganti manusia.
            </p>
            <p>
              Bagaimana dengan penggunaan detektor AI? Kami sadar bahwa detektor AI bukanlah solusi sempurna. Yang lebih penting adalah bagaimana kamu menggunakan AI secara bertanggung jawab.
            </p>
            <p>
              Yang diperlukan saat ini adalah kolaborasi antara manusia dan AI, di mana manusia tetap memegang kendali penuh atas proses kreatif dan pengambilan keputusan.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)} className="btn-brand">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

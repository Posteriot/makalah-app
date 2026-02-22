"use client"

import { useState } from "react"
import { Check } from "iconoir-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type CmsSaveButtonProps = {
  onSave: () => Promise<void>
  className?: string
}

export function CmsSaveButton({ onSave, className }: CmsSaveButtonProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle")

  async function handleClick() {
    if (status === "saving") return
    setStatus("saving")
    try {
      await onSave()
      setStatus("saved")
      toast.success("Perubahan berhasil disimpan")
      setTimeout(() => setStatus("idle"), 2000)
    } catch (error) {
      setStatus("idle")
      toast.error("Gagal menyimpan perubahan")
      throw error
    }
  }

  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "saving"}
        className={cn(
          "inline-flex items-center gap-2 rounded-action px-4 py-2 text-sm font-medium text-white",
          "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50",
          className
        )}
      >
        {status === "saving" && "Menyimpan..."}
        {status === "saved" && (
          <>
            <Check className="h-4 w-4" />
            Tersimpan!
          </>
        )}
        {status === "idle" && "Simpan"}
      </button>
    </div>
  )
}

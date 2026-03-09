"use client"

import { useCallback, useRef } from "react"
import { Plus } from "iconoir-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { EmailSection } from "@/lib/email/template-renderer"

const SECTION_TYPES = [
  { type: "heading", label: "Heading" },
  { type: "paragraph", label: "Paragraf" },
  { type: "button", label: "Tombol CTA" },
  { type: "divider", label: "Garis Pemisah" },
  { type: "info_box", label: "Info Box" },
  { type: "otp_code", label: "Kode OTP" },
  { type: "detail_row", label: "Detail (Label-Value)" },
]

interface AddSectionButtonProps {
  onAdd: (section: EmailSection) => void
}

export function AddSectionButton({ onAdd }: AddSectionButtonProps) {
  const counterRef = useRef(0)
  const handleAdd = useCallback((type: string) => {
    counterRef.current += 1
    const id = `s${counterRef.current}_${Math.random().toString(36).slice(2, 8)}`
    const base: EmailSection = { id, type }

    switch (type) {
      case "heading":
        base.content = "Heading baru"
        break
      case "paragraph":
        base.content = "Teks paragraf baru"
        break
      case "button":
        base.label = "Tombol"
        base.url = "https://"
        break
      case "info_box":
        base.content = "Informasi penting"
        break
      case "otp_code":
        base.content = "{{otpCode}}"
        break
      case "detail_row":
        base.rows = [{ label: "Label", value: "Value" }]
        break
    }

    onAdd(base)
  }, [onAdd])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-action border border-dashed border-border px-3 py-2 text-interface text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors w-full justify-center">
          <Plus className="h-3.5 w-3.5" /> Tambah Section
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {SECTION_TYPES.map((st) => (
          <DropdownMenuItem key={st.type} onClick={() => handleAdd(st.type)}>
            {st.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

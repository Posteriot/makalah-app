"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"

type NavLink = {
  label: string
  href: string
  isVisible: boolean
}

type HeaderConfigEditorProps = {
  userId: Id<"users">
}

export function HeaderConfigEditor({ userId }: HeaderConfigEditorProps) {
  const config = useQuery(api.siteConfig.getConfig, { key: "header" })
  const upsertConfig = useMutation(api.siteConfig.upsertConfig)

  const [navLinks, setNavLinks] = useState<NavLink[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState("Simpan")

  // Sync form state when config data loads
  useEffect(() => {
    if (config) {
      const links = (config.navLinks as NavLink[] | undefined) ?? []
      setNavLinks(
        links.length > 0
          ? links
          : Array.from({ length: 5 }, () => ({
              label: "",
              href: "",
              isVisible: true,
            }))
      )
    } else if (config === null) {
      // No config exists yet — default to 5 empty links
      setNavLinks(
        Array.from({ length: 5 }, () => ({
          label: "",
          href: "",
          isVisible: true,
        }))
      )
    }
  }, [config])

  function updateLink(index: number, field: keyof NavLink, value: string | boolean) {
    setNavLinks((prev) =>
      prev.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      )
    )
  }

  function addLink() {
    setNavLinks((prev) => [...prev, { label: "", href: "", isVisible: true }])
  }

  function removeLink(index: number) {
    setNavLinks((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      await upsertConfig({
        requestorId: userId,
        key: "header",
        navLinks: navLinks,
      })
      setSaveLabel("Tersimpan!")
      setTimeout(() => setSaveLabel("Simpan"), 2000)
    } finally {
      setIsSaving(false)
    }
  }

  // Loading skeleton
  if (config === undefined) {
    return (
      <div className="w-full max-w-2xl space-y-4 p-comfort">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl space-y-6 p-comfort">
      {/* Section header */}
      <div>
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          Header Configuration
        </h3>
        <div className="mt-2 border-t border-border" />
      </div>

      {/* Nav Links */}
      <div className="space-y-4">
        <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
          Nav Links
        </label>

        {/* Add button */}
        <Button
          variant="outline"
          size="sm"
          className="rounded-action"
          onClick={addLink}
        >
          Tambah Link
        </Button>

        {/* Link cards */}
        <div className="space-y-3">
          {navLinks.map((link, index) => (
            <div
              key={index}
              className="rounded-action border border-border p-4 space-y-3"
            >
              {/* Card header */}
              <div className="flex items-center justify-between">
                <span className="text-signal text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Link {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeLink(index)}
                >
                  Hapus
                </Button>
              </div>

              {/* Label */}
              <div>
                <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
                  Label
                </label>
                <Input
                  value={link.label}
                  onChange={(e) => updateLink(index, "label", e.target.value)}
                  placeholder="Nama link"
                />
              </div>

              {/* Href */}
              <div>
                <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
                  Href
                </label>
                <Input
                  value={link.href}
                  onChange={(e) => updateLink(index, "href", e.target.value)}
                  placeholder="/pricing atau URL lain"
                />
              </div>

              {/* Visible toggle */}
              <div className="flex items-center gap-3">
                <label className="text-interface text-xs font-medium text-muted-foreground">
                  Visible
                </label>
                <Switch
                  checked={link.isVisible}
                  onCheckedChange={(checked) =>
                    updateLink(index, "isVisible", checked)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-action"
        >
          {isSaving ? "Menyimpan..." : saveLabel}
        </Button>
      </div>
    </div>
  )
}

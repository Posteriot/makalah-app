"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { CmsSaveButton } from "@/components/admin/cms/CmsSaveButton"
import { CmsImageUpload } from "@/components/admin/cms/CmsImageUpload"
import { Plus, Minus } from "iconoir-react"

// ============================================================================
// Types
// ============================================================================

interface EmailBrandSettingsEditorProps {
  userId: Id<"users">
}

type FooterLink = { label: string; url: string }

type BrandSettingsData = {
  _id: Id<"emailBrandSettings"> | null
  appName: string
  logoStorageId?: Id<"_storage">
  logoUrl?: string
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  contentBackgroundColor: string
  textColor: string
  mutedTextColor: string
  fontFamily: string
  footerText: string
  footerLinks: FooterLink[]
}

// ============================================================================
// Font options
// ============================================================================

const FONT_OPTIONS = [
  { value: "Geist, Arial, sans-serif", label: "Geist, Arial, sans-serif" },
  { value: "Arial, sans-serif", label: "Arial, sans-serif" },
  { value: "Georgia, serif", label: "Georgia, serif" },
  { value: "system-ui, sans-serif", label: "system-ui, sans-serif" },
]

// ============================================================================
// Wrapper (exported) — fetch + skeleton + render form
// ============================================================================

export function EmailBrandSettingsEditor({
  userId,
}: EmailBrandSettingsEditorProps) {
  const settings = useQuery(api.emailBrandSettings.getBrandSettings)

  if (settings === undefined) {
    return (
      <div className="w-full space-y-4 p-comfort">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    )
  }

  return (
    <BrandSettingsForm
      key={settings._id ?? "new"}
      settings={settings as BrandSettingsData}
      userId={userId}
    />
  )
}

// ============================================================================
// Color field component
// ============================================================================

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-interface text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-action border border-border"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="font-mono text-xs"
        />
      </div>
    </div>
  )
}

// ============================================================================
// Form (internal) — local state + save
// ============================================================================

function BrandSettingsForm({
  settings,
  userId,
}: {
  settings: BrandSettingsData
  userId: Id<"users">
}) {
  const upsertBrandSettings = useMutation(
    api.emailBrandSettings.upsertBrandSettings
  )

  // ── Branding ──
  const [appName, setAppName] = useState(settings.appName)
  const [logoStorageId, setLogoStorageId] = useState<Id<"_storage"> | null>(
    settings.logoStorageId ?? null
  )

  // ── Colors ──
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor)
  const [secondaryColor, setSecondaryColor] = useState(
    settings.secondaryColor
  )
  const [backgroundColor, setBackgroundColor] = useState(
    settings.backgroundColor
  )
  const [contentBackgroundColor, setContentBackgroundColor] = useState(
    settings.contentBackgroundColor
  )
  const [textColor, setTextColor] = useState(settings.textColor)
  const [mutedTextColor, setMutedTextColor] = useState(
    settings.mutedTextColor
  )

  // ── Typography ──
  const [fontFamily, setFontFamily] = useState(settings.fontFamily)

  // ── Footer ──
  const [footerText, setFooterText] = useState(settings.footerText)
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>(
    settings.footerLinks
  )

  // ── Footer link helpers ──
  function addFooterLink() {
    setFooterLinks((prev) => [...prev, { label: "", url: "" }])
  }

  function removeFooterLink(index: number) {
    setFooterLinks((prev) => prev.filter((_, i) => i !== index))
  }

  function updateFooterLink(
    index: number,
    field: "label" | "url",
    value: string
  ) {
    setFooterLinks((prev) =>
      prev.map((link, i) => (i === index ? { ...link, [field]: value } : link))
    )
  }

  // ── Save ──
  async function handleSave() {
    await upsertBrandSettings({
      requestorId: userId,
      appName,
      primaryColor,
      secondaryColor,
      backgroundColor,
      contentBackgroundColor,
      textColor,
      mutedTextColor,
      fontFamily,
      footerText,
      footerLinks: footerLinks.filter((l) => l.label.trim() || l.url.trim()),
      ...(logoStorageId ? { logoStorageId } : {}),
    })
  }

  return (
    <div className="w-full space-y-6 p-comfort">
      {/* Section header */}
      <div>
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          Brand Settings
        </h3>
        <div className="mt-2 border-t border-border" />
      </div>

      {/* ── Branding ── */}
      <div className="space-y-4">
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Nama Aplikasi
          </label>
          <Input
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="Makalah AI"
          />
        </div>

        <CmsImageUpload
          currentImageId={logoStorageId}
          onUpload={(storageId) => setLogoStorageId(storageId)}
          userId={userId}
          label="Logo"
          aspectRatio="3/1"
        />
      </div>

      {/* ── Colors ── */}
      <div className="border-t border-border" />
      <div className="space-y-4">
        <span className="text-signal block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Warna
        </span>
        <div className="grid grid-cols-2 gap-4">
          <ColorField
            label="Warna Primer (CTA, Link)"
            value={primaryColor}
            onChange={setPrimaryColor}
          />
          <ColorField
            label="Warna Sekunder"
            value={secondaryColor}
            onChange={setSecondaryColor}
          />
          <ColorField
            label="Background Email"
            value={backgroundColor}
            onChange={setBackgroundColor}
          />
          <ColorField
            label="Background Konten"
            value={contentBackgroundColor}
            onChange={setContentBackgroundColor}
          />
          <ColorField
            label="Warna Teks"
            value={textColor}
            onChange={setTextColor}
          />
          <ColorField
            label="Warna Teks Sekunder"
            value={mutedTextColor}
            onChange={setMutedTextColor}
          />
        </div>
      </div>

      {/* ── Typography ── */}
      <div className="border-t border-border" />
      <div className="space-y-4">
        <span className="text-signal block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Tipografi
        </span>
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Font Family
          </label>
          <Select value={fontFamily} onValueChange={setFontFamily}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih font..." />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="font-mono text-xs">{opt.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-border" />
      <div className="space-y-4">
        <span className="text-signal block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Footer
        </span>

        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Teks Footer
          </label>
          <Textarea
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="© 2026 Makalah AI. All rights reserved."
            rows={2}
          />
        </div>

        <div className="space-y-3">
          <label className="text-interface block text-xs font-medium text-muted-foreground">
            Link Footer
          </label>

          {footerLinks.map((link, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={link.label}
                onChange={(e) =>
                  updateFooterLink(index, "label", e.target.value)
                }
                placeholder="Label"
                className="flex-1 text-xs"
              />
              <Input
                value={link.url}
                onChange={(e) =>
                  updateFooterLink(index, "url", e.target.value)
                }
                placeholder="https://..."
                className="flex-1 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => removeFooterLink(index)}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-action border border-border text-muted-foreground transition-colors duration-50 hover:border-destructive hover:text-destructive"
              >
                <Minus className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addFooterLink}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-action px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-50 hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Tambah Link
          </button>
        </div>
      </div>

      {/* ── Save ── */}
      <CmsSaveButton onSave={handleSave} />
    </div>
  )
}

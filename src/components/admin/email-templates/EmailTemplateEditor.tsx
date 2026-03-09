"use client"

import { useState, useCallback } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { NavArrowUp, NavArrowDown, NavArrowLeft } from "iconoir-react"
import { toast } from "sonner"
import { TEMPLATE_LABELS } from "@convex/emailTemplateConstants"
import { useSession } from "@/lib/auth-client"
import type { EmailSection } from "@/lib/email/template-renderer"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { CmsSaveButton } from "@/components/admin/cms/CmsSaveButton"
import {
  HeadingSectionEditor,
  ParagraphSectionEditor,
  ButtonSectionEditor,
  DividerSectionEditor,
  InfoBoxSectionEditor,
  OtpCodeSectionEditor,
  DetailRowSectionEditor,
} from "./section-editors"
import { EmailPreviewPanel } from "./EmailPreviewPanel"
import { PlaceholderReference } from "./PlaceholderReference"
import { SendTestEmailButton } from "./SendTestEmailButton"
import { AddSectionButton } from "./AddSectionButton"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EmailTemplateEditorProps {
  templateType: string
  userId: Id<"users">
  onBack: () => void
}

// ---------------------------------------------------------------------------
// Loader (handles query + loading skeleton)
// ---------------------------------------------------------------------------

export function EmailTemplateEditor({ templateType, userId, onBack }: EmailTemplateEditorProps) {
  const template = useQuery(api.emailTemplates.getTemplateByType, { templateType })
  const brand = useQuery(api.emailBrandSettings.getBrandSettings)

  // ── Loading state ────────────────────────────────────────────
  if (template === undefined || brand === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-6 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  // Derive brand settings (strip _id for API)
  const brandSettings = {
    appName: brand.appName,
    primaryColor: brand.primaryColor,
    secondaryColor: brand.secondaryColor,
    backgroundColor: brand.backgroundColor,
    contentBackgroundColor: brand.contentBackgroundColor,
    textColor: brand.textColor,
    mutedTextColor: brand.mutedTextColor,
    fontFamily: brand.fontFamily,
    footerText: brand.footerText,
    footerLinks: brand.footerLinks,
    logoUrl: brand.logoUrl,
  }

  return (
    <EmailTemplateEditorForm
      templateType={templateType}
      userId={userId}
      onBack={onBack}
      initialTemplate={template}
      brandSettings={brandSettings}
    />
  )
}

// ---------------------------------------------------------------------------
// Form (receives loaded data, owns local state)
// ---------------------------------------------------------------------------

interface BrandSettings {
  appName: string
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  contentBackgroundColor: string
  textColor: string
  mutedTextColor: string
  fontFamily: string
  footerText: string
  footerLinks: { label: string; url: string }[]
  logoUrl?: string
}

interface EmailTemplateEditorFormProps {
  templateType: string
  userId: Id<"users">
  onBack: () => void
  initialTemplate: {
    _id: Id<"emailTemplates">
    subject: string
    sections: unknown[]
    isActive: boolean
    availablePlaceholders?: unknown[]
  } | null
  brandSettings: BrandSettings
}

function EmailTemplateEditorForm({
  templateType,
  userId,
  onBack,
  initialTemplate,
  brandSettings,
}: EmailTemplateEditorFormProps) {
  const upsertTemplate = useMutation(api.emailTemplates.upsertTemplate)
  const session = useSession()
  const adminEmail = session.data?.user?.email ?? ""

  // ── State (initialized from loaded template) ───────────────
  const [subject, setSubject] = useState(
    initialTemplate?.subject ?? "",
  )
  const [sections, setSections] = useState<EmailSection[]>(
    (initialTemplate?.sections as EmailSection[]) ?? [],
  )
  const [isActive, setIsActive] = useState(
    initialTemplate?.isActive ?? false,
  )
  const [placeholders, setPlaceholders] = useState<
    { key: string; description: string; example: string }[]
  >(
    (initialTemplate?.availablePlaceholders as { key: string; description: string; example: string }[]) ?? [],
  )

  // ── Section CRUD ─────────────────────────────────────────────
  const handleSectionChange = useCallback(
    (index: number, updated: EmailSection) => {
      setSections((prev) => {
        const next = [...prev]
        next[index] = updated
        return next
      })
    },
    [],
  )

  const handleSectionDelete = useCallback((index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleAddSection = useCallback((section: EmailSection) => {
    setSections((prev) => [...prev, section])
  }, [])

  const moveSection = useCallback(
    (index: number, direction: "up" | "down") => {
      setSections((prev) => {
        const next = [...prev]
        const targetIndex = direction === "up" ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= next.length) return prev
        ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
        return next
      })
    },
    [],
  )

  // ── Section editor routing ───────────────────────────────────
  function renderSectionEditor(
    section: EmailSection,
    index: number,
  ) {
    const props = {
      section,
      onChange: (updated: EmailSection) => handleSectionChange(index, updated),
      onDelete: () => handleSectionDelete(index),
    }

    let editor: React.ReactNode = null
    switch (section.type) {
      case "heading":
        editor = <HeadingSectionEditor {...props} />
        break
      case "paragraph":
        editor = <ParagraphSectionEditor {...props} />
        break
      case "button":
        editor = <ButtonSectionEditor {...props} />
        break
      case "divider":
        editor = <DividerSectionEditor {...props} />
        break
      case "info_box":
        editor = <InfoBoxSectionEditor {...props} />
        break
      case "otp_code":
        editor = <OtpCodeSectionEditor {...props} />
        break
      case "detail_row":
        editor = <DetailRowSectionEditor {...props} />
        break
      default:
        return null
    }

    return (
      <div key={section.id} className="flex gap-1 items-start">
        {/* Move buttons */}
        <div className="flex flex-col gap-0.5 pt-2">
          <button
            onClick={() => moveSection(index, "up")}
            disabled={index === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
            title="Pindah ke atas"
          >
            <NavArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => moveSection(index, "down")}
            disabled={index === sections.length - 1}
            className="text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
            title="Pindah ke bawah"
          >
            <NavArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
        {/* Editor */}
        <div className="flex-1 min-w-0">{editor}</div>
      </div>
    )
  }

  // ── Save handler ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!subject.trim()) {
      toast.error("Subject email tidak boleh kosong")
      return
    }

    // 1. Pre-render HTML via API
    const renderRes = await fetch("/api/admin/email-templates/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections, brandSettings, subject }),
    })

    if (!renderRes.ok) {
      const data = await renderRes.json()
      throw new Error(data.error || "Gagal render template")
    }

    const { preRenderedHtml } = await renderRes.json()

    // 2. Upsert to Convex
    await upsertTemplate({
      requestorId: userId,
      id: initialTemplate?._id as Id<"emailTemplates"> | undefined,
      templateType,
      subject,
      sections,
      availablePlaceholders: placeholders,
      preRenderedHtml,
      isActive,
    })
  }

  // ── Render ───────────────────────────────────────────────────
  const templateLabel = TEMPLATE_LABELS[templateType] ?? templateType

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-interface text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <NavArrowLeft className="h-4 w-4" />
        Kembali
      </button>

      {/* Template name heading */}
      <h2 className="text-narrative text-lg font-semibold tracking-tight">
        {templateLabel}
      </h2>

      {/* Split view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel: Form */}
        <div className="space-y-4 overflow-y-auto">
          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              id="template-active"
            />
            <label
              htmlFor="template-active"
              className="text-interface text-sm font-medium cursor-pointer"
            >
              Template Aktif
            </label>
          </div>

          {/* Subject field */}
          <div className="space-y-1.5">
            <label className="text-interface text-xs font-medium text-muted-foreground">
              Subject Email
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject email..."
            />
          </div>

          {/* Sections list */}
          <div className="space-y-1.5">
            <label className="text-interface text-xs font-medium text-muted-foreground">
              Sections
            </label>
            <div className="space-y-2">
              {sections.map((section, index) =>
                renderSectionEditor(section, index),
              )}
            </div>
          </div>

          {/* Add section */}
          <AddSectionButton onAdd={handleAddSection} />

          {/* Placeholder reference */}
          <PlaceholderReference placeholders={placeholders} />

          {/* Action row */}
          <div className="flex items-center gap-3">
            <SendTestEmailButton
              templateType={templateType}
              sections={sections}
              brandSettings={brandSettings}
              subject={subject}
              availablePlaceholders={placeholders}
              adminEmail={adminEmail}
              disabled={!adminEmail}
            />
            <CmsSaveButton onSave={handleSave} />
          </div>
        </div>

        {/* Right panel: Preview */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <EmailPreviewPanel
            sections={sections}
            brandSettings={brandSettings}
            subject={subject}
          />
        </div>
      </div>
    </div>
  )
}

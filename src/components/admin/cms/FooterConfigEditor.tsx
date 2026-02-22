"use client"

import { useRef, useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { CmsImageUpload } from "./CmsImageUpload"
import { X as XIcon, Linkedin, Instagram, Upload, Globe } from "iconoir-react"
import type { ComponentType, SVGProps } from "react"
import { CmsSaveButton } from "./CmsSaveButton"

// Map platform names to iconoir icons (same as frontend Footer)
const PLATFORM_ICON_MAP: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  x: XIcon,
  twitter: XIcon,
  linkedin: Linkedin,
  instagram: Instagram,
}

// Inline social icon preview with upload support
function SocialIconPreview({
  iconId,
  platform,
  userId,
  onUpload,
}: {
  iconId: Id<"_storage"> | null | undefined
  platform: string
  userId: Id<"users">
  onUpload: (storageId: Id<"_storage">) => void
}) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const imageUrl = useQuery(
    api.pageContent.getImageUrl,
    iconId ? { storageId: iconId } : "skip"
  )
  const generateUploadUrl = useMutation(api.pageContent.generateUploadUrl)

  const PlatformIcon = PLATFORM_ICON_MAP[platform.toLowerCase()] ?? Globe

  async function handleUpload(file: File) {
    setIsUploading(true)
    try {
      const uploadUrl = await generateUploadUrl({ requestorId: userId })
      const result = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
      const { storageId } = await result.json()
      onUpload(storageId)
    } finally {
      setIsUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    e.target.value = ""
  }

  const hasCustomIcon = iconId && imageUrl

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-signal text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Ikon
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="group relative flex h-12 w-12 items-center justify-center rounded-action border border-border bg-background transition-colors hover:bg-muted/50 disabled:opacity-50"
        title={hasCustomIcon ? "Ganti ikon custom" : `Default: ${platform || "icon"}`}
      >
        {isUploading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
        ) : hasCustomIcon ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={imageUrl} alt={platform} className="h-6 w-6 object-contain" />
        ) : (
          <PlatformIcon className="h-5 w-5 text-muted-foreground" />
        )}
        <div className="absolute inset-0 flex items-center justify-center rounded-action bg-background/70 opacity-0 transition-opacity group-hover:opacity-100">
          <Upload className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
        </div>
      </button>
      {hasCustomIcon && (
        <span className="text-[9px] text-emerald-600">Custom</span>
      )}
    </div>
  )
}

type FooterLink = {
  label: string
  href: string
}

type FooterSection = {
  title: string
  links: FooterLink[]
}

type SocialLink = {
  platform: string
  url: string
  isVisible: boolean
  iconId?: Id<"_storage"> | null
}

type FooterConfigEditorProps = {
  userId: Id<"users">
}

const DEFAULT_SECTIONS: FooterSection[] = [
  { title: "Sumber Daya", links: [] },
  { title: "Perusahaan", links: [] },
  { title: "Legal", links: [] },
]

const DEFAULT_SOCIALS: SocialLink[] = [
  { platform: "x", url: "", isVisible: true },
  { platform: "linkedin", url: "", isVisible: true },
  { platform: "instagram", url: "", isVisible: true },
]

export function FooterConfigEditor({ userId }: FooterConfigEditorProps) {
  const config = useQuery(api.siteConfig.getConfig, { key: "footer" })
  const upsertConfig = useMutation(api.siteConfig.upsertConfig)

  const [footerSections, setFooterSections] = useState<FooterSection[]>(DEFAULT_SECTIONS)
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(DEFAULT_SOCIALS)
  const [copyrightText, setCopyrightText] = useState("")
  const [companyDescription, setCompanyDescription] = useState("")
  const [logoDarkId, setLogoDarkId] = useState<Id<"_storage"> | null>(null)
  const [logoLightId, setLogoLightId] = useState<Id<"_storage"> | null>(null)
  const [showDiagonalStripes, setShowDiagonalStripes] = useState(true)

  // Sync form state when config data loads
  useEffect(() => {
    if (config) {
      const sections = (config.footerSections as FooterSection[] | undefined) ?? []
      setFooterSections(sections.length > 0 ? sections : DEFAULT_SECTIONS)

      const socials = (config.socialLinks as SocialLink[] | undefined) ?? []
      setSocialLinks(socials.length > 0 ? socials : DEFAULT_SOCIALS)

      setCopyrightText((config.copyrightText as string | undefined) ?? "")
      setCompanyDescription((config.companyDescription as string | undefined) ?? "")
      setLogoDarkId((config.logoDarkId as Id<"_storage"> | undefined) ?? null)
      setLogoLightId((config.logoLightId as Id<"_storage"> | undefined) ?? null)
      setShowDiagonalStripes(config.showDiagonalStripes !== false)
    } else if (config === null) {
      setFooterSections(DEFAULT_SECTIONS)
      setSocialLinks(DEFAULT_SOCIALS)
      setCopyrightText("")
      setCompanyDescription("")
    }
  }, [config])

  // --- Footer Sections helpers ---

  function updateSectionTitle(sectionIndex: number, title: string) {
    setFooterSections((prev) =>
      prev.map((section, i) =>
        i === sectionIndex ? { ...section, title } : section
      )
    )
  }

  function updateSectionLink(
    sectionIndex: number,
    linkIndex: number,
    field: keyof FooterLink,
    value: string
  ) {
    setFooterSections((prev) =>
      prev.map((section, si) =>
        si === sectionIndex
          ? {
              ...section,
              links: section.links.map((link, li) =>
                li === linkIndex ? { ...link, [field]: value } : link
              ),
            }
          : section
      )
    )
  }

  function addLinkToSection(sectionIndex: number) {
    setFooterSections((prev) =>
      prev.map((section, i) =>
        i === sectionIndex
          ? { ...section, links: [...section.links, { label: "", href: "" }] }
          : section
      )
    )
  }

  function removeLinkFromSection(sectionIndex: number, linkIndex: number) {
    setFooterSections((prev) =>
      prev.map((section, si) =>
        si === sectionIndex
          ? { ...section, links: section.links.filter((_, li) => li !== linkIndex) }
          : section
      )
    )
  }

  function addSection() {
    setFooterSections((prev) => [...prev, { title: "", links: [] }])
  }

  function removeSection(sectionIndex: number) {
    setFooterSections((prev) => prev.filter((_, i) => i !== sectionIndex))
  }

  // --- Social Links helpers ---

  function updateSocial(index: number, field: keyof SocialLink, value: string | boolean) {
    setSocialLinks((prev) =>
      prev.map((social, i) =>
        i === index ? { ...social, [field]: value } : social
      )
    )
  }

  function updateSocialIcon(index: number, storageId: Id<"_storage">) {
    setSocialLinks((prev) =>
      prev.map((social, i) =>
        i === index ? { ...social, iconId: storageId } : social
      )
    )
  }

  function addSocial() {
    setSocialLinks((prev) => [...prev, { platform: "", url: "", isVisible: true }])
  }

  function removeSocial(index: number) {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index))
  }

  // --- Save ---

  async function handleSave() {
    await upsertConfig({
      requestorId: userId,
      key: "footer",
      footerSections: footerSections.map((section) => ({
        title: section.title,
        links: section.links.map((link) => ({
          label: link.label,
          href: link.href,
        })),
      })),
      socialLinks: socialLinks.map((s) => ({
        platform: s.platform,
        url: s.url,
        isVisible: s.isVisible,
        iconId: s.iconId ?? undefined,
      })),
      copyrightText,
      companyDescription,
      logoDarkId: logoDarkId ?? undefined,
      logoLightId: logoLightId ?? undefined,
      showDiagonalStripes,
    })
  }

  // Loading skeleton
  if (config === undefined) {
    return (
      <div className="w-full space-y-4 p-comfort">
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
    <div className="w-full space-y-6 p-comfort">
      {/* Section header */}
      <div>
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          Footer Configuration
        </h3>
        <div className="mt-2 border-t border-border" />
      </div>

      {/* Group 1: Footer Sections */}
      <div className="space-y-4">
        <span className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Footer Sections
        </span>

        <Button
          variant="outline"
          size="sm"
          className="rounded-action"
          onClick={addSection}
        >
          Tambah Section
        </Button>

        <div className="space-y-3">
          {footerSections.map((section, sectionIndex) => (
            <div
              key={sectionIndex}
              className="rounded-action border border-border p-4 space-y-3"
            >
              {/* Section header */}
              <div className="flex items-center justify-between">
                <span className="text-signal text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Section {sectionIndex + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeSection(sectionIndex)}
                >
                  Hapus Section
                </Button>
              </div>

              {/* Section title */}
              <div>
                <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
                  Judul Section
                </label>
                <Input
                  value={section.title}
                  onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                  placeholder="Nama section"
                />
              </div>

              {/* Links list */}
              {section.links.length > 0 && (
                <div className="space-y-2 pl-3 border-l border-border">
                  {section.links.map((link, linkIndex) => (
                    <div key={linkIndex} className="flex items-center gap-2">
                      <Input
                        value={link.label}
                        onChange={(e) =>
                          updateSectionLink(sectionIndex, linkIndex, "label", e.target.value)
                        }
                        placeholder="Label"
                        className="flex-1"
                      />
                      <Input
                        value={link.href}
                        onChange={(e) =>
                          updateSectionLink(sectionIndex, linkIndex, "href", e.target.value)
                        }
                        placeholder="/path atau URL"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeLinkFromSection(sectionIndex, linkIndex)}
                      >
                        Hapus
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="rounded-action"
                onClick={() => addLinkToSection(sectionIndex)}
              >
                Tambah Link
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Group 2: Social Links */}
      <div className="space-y-4">
        <span className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Social Links
        </span>

        <Button
          variant="outline"
          size="sm"
          className="rounded-action"
          onClick={addSocial}
        >
          Tambah Social
        </Button>

        <div className="space-y-3">
          {socialLinks.map((social, index) => (
            <div
              key={index}
              className="rounded-action border border-border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-signal text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Social {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeSocial(index)}
                >
                  Hapus
                </Button>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0">
                  <SocialIconPreview
                    iconId={social.iconId ?? null}
                    platform={social.platform}
                    userId={userId}
                    onUpload={(storageId) => updateSocialIcon(index, storageId)}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    value={social.platform}
                    onChange={(e) => updateSocial(index, "platform", e.target.value)}
                    placeholder="Platform (x, linkedin, instagram)"
                  />
                  <Input
                    value={social.url}
                    onChange={(e) => updateSocial(index, "url", e.target.value)}
                    placeholder="https://..."
                  />
                  <div className="flex items-center gap-3">
                    <label className="text-interface text-xs font-medium text-muted-foreground">
                      Visible
                    </label>
                    <Switch
                      className="data-[state=checked]:bg-emerald-600"
                      checked={social.isVisible}
                      onCheckedChange={(checked) => updateSocial(index, "isVisible", checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Group 3: Bottom Bar + Footer Logo — side by side, each 50% */}
      <div className="grid grid-cols-2 items-stretch gap-4">
        {/* Bottom Bar — 50% */}
        <div className="space-y-3">
          <span className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Bottom Bar
          </span>
          <div className="space-y-3 rounded-action border border-border p-4">
            <div className="space-y-1">
              <label className="text-interface text-xs font-medium text-muted-foreground">
                Deskripsi Perusahaan
              </label>
              <Input
                value={companyDescription}
                onChange={(e) => setCompanyDescription(e.target.value)}
                placeholder="Makalah AI adalah produk dari PT THE MANAGEMENT ASIA"
              />
            </div>
            <div className="space-y-1">
              <label className="text-interface text-xs font-medium text-muted-foreground">
                Copyright
              </label>
              <Input
                value={copyrightText}
                onChange={(e) => setCopyrightText(e.target.value)}
                placeholder="© {year} Makalah. All rights reserved."
              />
              <p className="text-interface text-[10px] text-muted-foreground">
                Gunakan {"{year}"} untuk tahun otomatis
              </p>
            </div>
          </div>
        </div>

        {/* Footer Logo — 50% */}
        <div className="flex flex-col space-y-3">
          <span className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Footer Logo
          </span>
          <div className="grid flex-1 grid-cols-2 gap-6 rounded-action border border-border p-4">
            <div className="mx-auto w-24">
              <CmsImageUpload
                currentImageId={logoDarkId}
                onUpload={(storageId) => setLogoDarkId(storageId)}
                userId={userId}
                label="Logo (Dark)"
                aspectRatio="1/1"
                fallbackPreviewUrl="/logo/makalah_logo_light.svg"
              />
            </div>
            <div className="mx-auto w-24">
              <CmsImageUpload
                currentImageId={logoLightId}
                onUpload={(storageId) => setLogoLightId(storageId)}
                userId={userId}
                label="Logo (Light)"
                aspectRatio="1/1"
                fallbackPreviewUrl="/logo/makalah_logo_dark.svg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Background Pattern toggles */}
      <div className="space-y-2">
        <span className="text-signal block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Background Patterns
        </span>
        <div className="flex items-center gap-3">
          <label className="text-interface text-xs font-medium text-muted-foreground">
            Diagonal Stripes
          </label>
          <Switch className="data-[state=checked]:bg-emerald-600" checked={showDiagonalStripes} onCheckedChange={setShowDiagonalStripes} />
        </div>
      </div>
      <CmsSaveButton onSave={handleSave} />
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { CmsImageUpload } from "./CmsImageUpload"

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
  const [isSaving, setIsSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState("Simpan")

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
    setIsSaving(true)
    try {
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
          Footer Configuration
        </h3>
        <div className="mt-2 border-t border-border" />
      </div>

      {/* Logo */}
      <div className="space-y-4">
        <span className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Logo Footer
        </span>

        <div className="grid grid-cols-2 gap-4">
          <CmsImageUpload
            currentImageId={logoDarkId}
            onUpload={(storageId) => setLogoDarkId(storageId)}
            userId={userId}
            label="Logo (Dark Mode)"
            aspectRatio="1/1"
            fallbackPreviewUrl="/logo/makalah_logo_light.svg"
          />
          <CmsImageUpload
            currentImageId={logoLightId}
            onUpload={(storageId) => setLogoLightId(storageId)}
            userId={userId}
            label="Logo (Light Mode)"
            aspectRatio="1/1"
            fallbackPreviewUrl="/logo/makalah_logo_dark.svg"
          />
        </div>

        <p className="text-interface text-xs text-muted-foreground">
          Dark mode = tampil saat tema gelap. Light mode = tampil saat tema terang. Kosongkan untuk pakai default.
        </p>
      </div>

      {/* Company Description */}
      <div className="space-y-2">
        <span className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Deskripsi Perusahaan
        </span>

        <Input
          value={companyDescription}
          onChange={(e) => setCompanyDescription(e.target.value)}
          placeholder="Makalah AI adalah produk dari PT THE MANAGEMENT ASIA"
        />
        <p className="text-interface text-xs text-muted-foreground">
          Teks yang muncul di atas copyright. Kosongkan untuk pakai default.
        </p>
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
                <div className="w-16 shrink-0">
                  <CmsImageUpload
                    currentImageId={social.iconId ?? null}
                    onUpload={(storageId) => updateSocialIcon(index, storageId)}
                    userId={userId}
                    label="Ikon"
                    aspectRatio="1/1"
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

      {/* Group 3: Copyright */}
      <div className="space-y-2">
        <span className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Copyright
        </span>

        <Input
          value={copyrightText}
          onChange={(e) => setCopyrightText(e.target.value)}
          placeholder="© {year} Makalah. All rights reserved."
        />
        <p className="text-interface text-xs text-muted-foreground">
          Gunakan {"{year}"} untuk tahun otomatis
        </p>
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

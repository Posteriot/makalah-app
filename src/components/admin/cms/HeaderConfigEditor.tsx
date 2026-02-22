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
import { CmsSaveButton } from "./CmsSaveButton"

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
  const [logoDarkId, setLogoDarkId] = useState<Id<"_storage"> | null>(null)
  const [logoLightId, setLogoLightId] = useState<Id<"_storage"> | null>(null)
  const [brandTextDarkId, setBrandTextDarkId] = useState<Id<"_storage"> | null>(null)
  const [brandTextLightId, setBrandTextLightId] = useState<Id<"_storage"> | null>(null)

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
      setLogoDarkId((config.logoDarkId as Id<"_storage"> | undefined) ?? null)
      setLogoLightId((config.logoLightId as Id<"_storage"> | undefined) ?? null)
      setBrandTextDarkId((config.brandTextDarkId as Id<"_storage"> | undefined) ?? null)
      setBrandTextLightId((config.brandTextLightId as Id<"_storage"> | undefined) ?? null)
    } else if (config === null) {
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
    await upsertConfig({
      requestorId: userId,
      key: "header",
      navLinks: navLinks,
      logoDarkId: logoDarkId ?? undefined,
      logoLightId: logoLightId ?? undefined,
      brandTextDarkId: brandTextDarkId ?? undefined,
      brandTextLightId: brandTextLightId ?? undefined,
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
          Header Configuration
        </h3>
        <div className="mt-2 border-t border-border" />
      </div>

      {/* ── Cluster 1: Logo & Brand Images ── */}
      <div className="space-y-4">
        <span className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Logo & Brand
        </span>

        <div className="grid grid-cols-4 gap-3">
          <CmsImageUpload
            currentImageId={logoDarkId}
            onUpload={(storageId) => setLogoDarkId(storageId)}
            userId={userId}
            label="Logo Icon (Dark)"
            aspectRatio="1/1"
            fallbackPreviewUrl="/logo/logo-color-darkmode.png"
          />
          <CmsImageUpload
            currentImageId={logoLightId}
            onUpload={(storageId) => setLogoLightId(storageId)}
            userId={userId}
            label="Logo Icon (Light)"
            aspectRatio="1/1"
            fallbackPreviewUrl="/logo/logo-color-lightmode.png"
          />
          <CmsImageUpload
            currentImageId={brandTextDarkId}
            onUpload={(storageId) => setBrandTextDarkId(storageId)}
            userId={userId}
            label="Brand Text (Dark)"
            aspectRatio="4/1"
            fallbackPreviewUrl="/logo-makalah-ai-white.svg"
          />
          <CmsImageUpload
            currentImageId={brandTextLightId}
            onUpload={(storageId) => setBrandTextLightId(storageId)}
            userId={userId}
            label="Brand Text (Light)"
            aspectRatio="4/1"
            fallbackPreviewUrl="/logo-makalah-ai-black.svg"
          />
        </div>

        <p className="text-interface text-xs text-muted-foreground">
          Dark mode = tampil saat tema gelap. Light mode = tampil saat tema terang.
        </p>
        <p className="text-interface text-[10px] text-muted-foreground">
          Logo Icon: optimal 32 × 32 px (1:1). Brand Text: optimal 120 × 30 px (4:1, SVG/PNG).
        </p>
      </div>

      {/* ── Cluster 2: Nav Links ── */}
      <div className="border-t border-border" />
      <div className="space-y-4">
        <span className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Nav Links
        </span>

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
                  className="data-[state=checked]:bg-emerald-600"
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
      <CmsSaveButton onSave={handleSave} />
    </div>
  )
}

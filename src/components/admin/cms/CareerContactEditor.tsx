"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { CmsSaveButton } from "./CmsSaveButton"

type CareerContactEditorProps = {
  userId: Id<"users">
}

export function CareerContactEditor({ userId }: CareerContactEditorProps) {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "about",
    sectionSlug: "career-contact",
  })

  const upsertSection = useMutation(api.pageContent.upsertSection)

  const [badgeText, setBadgeText] = useState("")
  const [title, setTitle] = useState("")
  const [careerText, setCareerText] = useState("")
  const [company, setCompany] = useState("")
  const [address, setAddress] = useState("")
  const [email, setEmail] = useState("")
  const [showDiagonalStripes, setShowDiagonalStripes] = useState(true)
  const [showDottedPattern, setShowDottedPattern] = useState(true)
  const [isPublished, setIsPublished] = useState(false)

  // Sync form state when section data loads
  useEffect(() => {
    if (section) {
      setBadgeText(section.badgeText ?? "")
      setTitle(section.title ?? "")
      // Map items[0].description -> careerText
      const sectionItems = section.items as Array<{ title?: string; description?: string }> | undefined
      setCareerText(sectionItems?.[0]?.description ?? "")
      // Map contactInfo -> company/address/email
      const contact = section.contactInfo as { company?: string; address?: string[]; email?: string } | undefined
      setCompany(contact?.company ?? "")
      setAddress(contact?.address?.[0] ?? "")
      setEmail(contact?.email ?? "")
      setShowDiagonalStripes(section.showDiagonalStripes !== false)
      setShowDottedPattern(section.showDottedPattern !== false)
      setIsPublished(section.isPublished ?? false)
    }
  }, [section])

  async function handleSave() {
    await upsertSection({
      requestorId: userId,
      id: section?._id,
      pageSlug: "about",
      sectionSlug: "career-contact",
      sectionType: "career-contact",
      title,
      badgeText,
      items: [{ title: "Karier", description: careerText }],
      contactInfo: { company, address: [address], email },
      showDiagonalStripes,
      showDottedPattern,
      isPublished,
      sortOrder: 4,
    })
  }

  // Loading skeleton
  if (section === undefined) {
    return (
      <div className="w-full space-y-4 p-comfort">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-comfort">
      {/* Section header */}
      <div>
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          Karier & Kontak Section
        </h3>
        <div className="mt-2 border-t border-border" />
      </div>

      {/* ── Cluster 1: Text Content ── */}
      <div className="space-y-4">
        {/* Badge Text */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Badge Text
          </label>
          <Input
            value={badgeText}
            onChange={(e) => setBadgeText(e.target.value)}
            placeholder="Teks badge section"
          />
        </div>

        {/* Title */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul section"
          />
        </div>
      </div>

      {/* ── Cluster 2: Karier ── */}
      <div className="border-t border-border" />
      <div>
        <h4 className="text-interface mb-3 text-sm font-semibold text-foreground">
          Karier
        </h4>
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Teks Karier
          </label>
          <Textarea
            value={careerText}
            onChange={(e) => setCareerText(e.target.value)}
            placeholder="Teks tentang karier"
            rows={2}
          />
        </div>
      </div>

      {/* ── Cluster 3: Kontak ── */}
      <div className="border-t border-border" />
      <div>
        <h4 className="text-interface mb-3 text-sm font-semibold text-foreground">
          Kontak
        </h4>
        <div className="space-y-3">
          <div>
            <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
              Nama Perusahaan
            </label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Nama perusahaan"
            />
          </div>
          <div>
            <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
              Alamat
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Alamat perusahaan"
            />
          </div>
          <div>
            <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
              Email
            </label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email kontak"
            />
          </div>
        </div>
      </div>

      {/* ── Cluster 4: Background Patterns ── */}
      <div className="border-t border-border" />
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
        <div className="flex items-center gap-3">
          <label className="text-interface text-xs font-medium text-muted-foreground">
            Dotted Pattern
          </label>
          <Switch className="data-[state=checked]:bg-emerald-600" checked={showDottedPattern} onCheckedChange={setShowDottedPattern} />
        </div>
      </div>

      {/* ── Cluster 5: Published ── */}
      <div className="border-t border-border" />
      <div className="flex items-center gap-3">
        <label className="text-interface text-xs font-medium text-muted-foreground">
          Published
        </label>
        <Switch className="data-[state=checked]:bg-emerald-600" checked={isPublished} onCheckedChange={setIsPublished} />
      </div>
      <CmsSaveButton onSave={handleSave} />
    </div>
  )
}

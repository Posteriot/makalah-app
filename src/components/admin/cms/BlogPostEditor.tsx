"use client"

import { useRef, useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { CmsImageUpload } from "./CmsImageUpload"
import { CmsSaveButton } from "./CmsSaveButton"
import {
  NavArrowLeft,
  Bold,
  Italic,
  List,
  NumberedListLeft,
  QuoteMessage,
  Link as LinkIcon,
  MediaImage,
  Undo,
  Redo,
} from "iconoir-react"
import { createPlaceholderImageDataUri } from "@/components/marketing/blog/utils"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS = [
  { value: "Update", label: "Update" },
  { value: "Tutorial", label: "Tutorial" },
  { value: "Opini", label: "Opini" },
  { value: "Event", label: "Event" },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
}

function timestampToDateString(ts: number): string {
  const d = new Date(ts)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function dateStringToTimestamp(dateStr: string): number {
  return new Date(dateStr).getTime()
}

// ---------------------------------------------------------------------------
// Toolbar helpers (same pattern as SectionBlockEditor)
// ---------------------------------------------------------------------------

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-action transition-colors duration-50 ${
        isActive
          ? "bg-emerald-600/10 text-emerald-600"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  )
}

function ToolbarSeparator() {
  return <span className="mx-1 h-5 w-px bg-border" />
}

// ---------------------------------------------------------------------------
// Blocks → TipTap conversion
// ---------------------------------------------------------------------------

type BlockData = {
  type: string
  title?: string
  description?: string
  paragraphs?: string[]
  items?: string[]
  list?: { variant: string; items: Array<{ text: string; subItems?: string[] }> }
}

/**
 * Convert legacy `blocks` array to TipTap JSON so existing content
 * appears in the WYSIWYG editor when `content` field is empty.
 */
function blocksToTipTapJson(blocks: BlockData[]): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodes: any[] = []

  for (const block of blocks) {
    if (block.title) {
      nodes.push({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: block.title }],
      })
    }
    if (block.description) {
      nodes.push({
        type: "paragraph",
        content: [{ type: "text", text: block.description }],
      })
    }
    if (block.paragraphs) {
      for (const p of block.paragraphs) {
        nodes.push({
          type: "paragraph",
          content: [{ type: "text", text: p }],
        })
      }
    }
    if (block.items) {
      for (const item of block.items) {
        nodes.push({
          type: "paragraph",
          content: [{ type: "text", text: item }],
        })
      }
    }
    if (block.list) {
      const listType = block.list.variant === "numbered" ? "orderedList" : "bulletList"
      nodes.push({
        type: listType,
        content: block.list.items.map((li) => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: li.text }],
            },
          ],
        })),
      })
    }
  }

  if (nodes.length === 0) return ""
  return JSON.stringify({ type: "doc", content: nodes })
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BlogPostEditorProps = {
  slug: string | null
  userId: Id<"users">
  onBack: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BlogPostEditor({ slug, userId, onBack }: BlogPostEditorProps) {
  const isCreateMode = slug === null

  const existingPost = useQuery(
    api.blog.getPostBySlugAdmin,
    slug !== null ? { requestorId: userId, slug } : "skip"
  )

  const upsertPost = useMutation(api.blog.upsertPost)
  const generateBlogUploadUrl = useMutation(api.blog.generateBlogUploadUrl)
  const getBlogImageUrlMutation = useMutation(api.blog.getBlogImageUrlMutation)

  // Form state
  const [title, setTitle] = useState("")
  const [slugValue, setSlugValue] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [author, setAuthor] = useState("")
  const [category, setCategory] = useState("Update")
  const [readTime, setReadTime] = useState("")
  const [publishedAt, setPublishedAt] = useState(timestampToDateString(Date.now()))
  const [featured, setFeatured] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [coverImageId, setCoverImageId] = useState<Id<"_storage"> | null>(null)
  const [bodyContent, setBodyContent] = useState("")

  // UI state
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Populate form when existing post loads
  useEffect(() => {
    if (existingPost) {
      setTitle(existingPost.title)
      setSlugValue(existingPost.slug)
      setExcerpt(existingPost.excerpt ?? "")
      setAuthor(existingPost.author ?? "")
      setCategory(existingPost.category ?? "Update")
      setReadTime(existingPost.readTime ?? "")
      setPublishedAt(timestampToDateString(existingPost.publishedAt))
      setFeatured(existingPost.featured ?? false)
      setIsPublished(existingPost.isPublished)
      setCoverImageId(existingPost.coverImageId ?? null)
      if (existingPost.content) {
        setBodyContent(existingPost.content)
      } else if (existingPost.blocks && (existingPost.blocks as BlockData[]).length > 0) {
        setBodyContent(blocksToTipTapJson(existingPost.blocks as BlockData[]))
      } else {
        setBodyContent("")
      }
      setSlugManuallyEdited(true)
    }
  }, [existingPost])

  // Auto-generate slug from title in create mode
  function handleTitleChange(value: string) {
    setTitle(value)
    if (isCreateMode && !slugManuallyEdited) {
      setSlugValue(generateSlug(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlugValue(value)
    setSlugManuallyEdited(true)
  }

  // TipTap editor — prefer `content` (TipTap JSON), fallback to `blocks` conversion
  const initialContent = existingPost?.content
    ? existingPost.content
    : existingPost?.blocks && existingPost.blocks.length > 0
      ? blocksToTipTapJson(existingPost.blocks as BlockData[])
      : undefined

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline",
          },
        }),
        Image.configure({
          inline: false,
          allowBase64: false,
          HTMLAttributes: {
            class: "rounded-action max-w-full my-4",
          },
        }),
      ],
      immediatelyRender: false,
      content: initialContent ? JSON.parse(initialContent) : undefined,
      editable: true,
      onUpdate: ({ editor: ed }) => {
        setBodyContent(JSON.stringify(ed.getJSON()))
      },
    },
    [initialContent]
  )

  // Inline image upload handler
  async function handleInlineImageUpload(file: File) {
    setIsUploading(true)
    try {
      const uploadUrl = await generateBlogUploadUrl({ requestorId: userId })
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
      const { storageId } = await res.json()
      const url = await getBlogImageUrlMutation({ storageId })
      if (url && editor) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    } finally {
      setIsUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      handleInlineImageUpload(file)
    }
    e.target.value = ""
  }

  // Save handler
  async function handleSave() {
    await upsertPost({
      requestorId: userId,
      id: existingPost?._id as Id<"blogSections"> | undefined,
      slug: slugValue,
      title,
      excerpt,
      author,
      category,
      readTime,
      featured,
      isPublished,
      publishedAt: dateStringToTimestamp(publishedAt),
      content: bodyContent || undefined,
      coverImageId: coverImageId ?? undefined,
    })
  }

  // Loading skeleton for edit mode
  if (!isCreateMode && existingPost === undefined) {
    return (
      <div className="w-full space-y-4 p-comfort">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-comfort">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-interface text-xs text-muted-foreground hover:text-foreground"
      >
        <NavArrowLeft width={16} height={16} strokeWidth={1.5} />
        Kembali ke Daftar
      </button>

      {/* Section header */}
      <div>
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          {isCreateMode ? "Post Baru" : "Edit Post"}
        </h3>
        <div className="mt-2 border-t border-border" />
      </div>

      {/* Metadata section - two column grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Title - full width */}
        <div className="md:col-span-2">
          <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Judul artikel"
            className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>

        {/* Slug - full width */}
        <div className="md:col-span-2">
          <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Slug
          </label>
          <input
            type="text"
            value={slugValue}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="url-slug"
            className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>

        {/* Excerpt - full width */}
        <div className="md:col-span-2">
          <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Excerpt
          </label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Ringkasan singkat artikel"
            rows={3}
            className="w-full resize-none rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>

        {/* Author */}
        <div>
          <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Author
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Nama penulis"
            className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Read Time */}
        <div>
          <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Read Time
          </label>
          <input
            type="text"
            value={readTime}
            onChange={(e) => setReadTime(e.target.value)}
            placeholder="8 menit"
            className="w-full rounded-action border border-border bg-background px-3 py-2 text-interface text-sm text-foreground"
          />
        </div>

        {/* Published Date */}
        <div>
          <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Published Date
          </label>
          <input
            type="date"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            className="w-full rounded-action border border-border bg-background px-3 py-2 text-interface text-sm text-foreground"
          />
        </div>

        {/* Featured toggle */}
        <div className="flex items-center gap-3">
          <label className="text-signal text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Featured
          </label>
          <Switch className="data-[state=checked]:bg-emerald-600" checked={featured} onCheckedChange={setFeatured} />
        </div>

        {/* Published toggle */}
        <div className="flex items-center gap-3">
          <label className="text-signal text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Published
          </label>
          <Switch className="data-[state=checked]:bg-emerald-600" checked={isPublished} onCheckedChange={setIsPublished} />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Cover Image */}
      <CmsImageUpload
        currentImageId={coverImageId}
        onUpload={(id) => setCoverImageId(id)}
        userId={userId}
        label="Cover Image"
        aspectRatio="16/9"
        generateUploadUrlFn={api.blog.generateBlogUploadUrl}
        getImageUrlFn={api.blog.getBlogImageUrl}
        fallbackPreviewUrl={createPlaceholderImageDataUri({
          title: title || "Blog Post",
          category,
          width: 1200,
          height: 675,
        })}
      />

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Article Body - TipTap Editor */}
      <div>
        <label className="text-signal mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Artikel
        </label>

        {/* Hidden file input for inline image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="overflow-hidden rounded-action border border-border">
          {/* Toolbar */}
          {editor && (
            <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive("bold")}
                title="Bold"
              >
                <Bold className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive("italic")}
                title="Italic"
              >
                <Italic className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>

              <ToolbarSeparator />

              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                }
                isActive={editor.isActive("heading", { level: 1 })}
                title="Heading 1"
              >
                <span className="text-interface text-[10px] font-bold">H1</span>
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                isActive={editor.isActive("heading", { level: 2 })}
                title="Heading 2"
              >
                <span className="text-interface text-[10px] font-bold">H2</span>
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
                isActive={editor.isActive("heading", { level: 3 })}
                title="Heading 3"
              >
                <span className="text-interface text-[10px] font-bold">H3</span>
              </ToolbarButton>

              <ToolbarSeparator />

              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleBulletList().run()
                }
                isActive={editor.isActive("bulletList")}
                title="Bullet List"
              >
                <List className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleOrderedList().run()
                }
                isActive={editor.isActive("orderedList")}
                title="Ordered List"
              >
                <NumberedListLeft className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleBlockquote().run()
                }
                isActive={editor.isActive("blockquote")}
                title="Blockquote"
              >
                <QuoteMessage className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>

              <ToolbarSeparator />

              <ToolbarButton
                onClick={() => {
                  const url = window.prompt("URL:")
                  if (url) {
                    editor.chain().focus().setLink({ href: url }).run()
                  }
                }}
                isActive={editor.isActive("link")}
                title="Link"
              >
                <LinkIcon className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Sisipkan Gambar"
              >
                {isUploading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
                ) : (
                  <MediaImage className="h-4 w-4" strokeWidth={1.5} />
                )}
              </ToolbarButton>

              <ToolbarSeparator />

              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                title="Undo"
              >
                <Undo className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                title="Redo"
              >
                <Redo className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>
            </div>
          )}

          {/* Editor area */}
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none p-comfort text-interface text-sm leading-relaxed text-foreground [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:outline-none [&_.ProseMirror_h1]:text-narrative [&_.ProseMirror_h1]:text-lg [&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h1]:tracking-tight [&_.ProseMirror_h2]:text-interface [&_.ProseMirror_h2]:text-base [&_.ProseMirror_h2]:font-medium [&_.ProseMirror_h3]:text-interface [&_.ProseMirror_h3]:text-sm [&_.ProseMirror_h3]:font-medium [&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-primary [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_img]:rounded-action [&_.ProseMirror_img]:max-w-full"
          />
        </div>
      </div>
      <CmsSaveButton onSave={handleSave} />
    </div>
  )
}

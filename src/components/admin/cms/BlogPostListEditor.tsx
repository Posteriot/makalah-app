"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Plus, EditPencil, Trash } from "iconoir-react"
import { Skeleton } from "@/components/ui/skeleton"

type BlogPostListEditorProps = {
  userId: Id<"users">
  onSelectPost: (slug: string) => void
  onCreateNew: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  Update: "bg-emerald-500/10 text-emerald-600",
  Tutorial: "bg-blue-500/10 text-blue-600",
  Opini: "bg-amber-500/10 text-amber-600",
  Event: "bg-fuchsia-500/10 text-fuchsia-600",
  Produk: "bg-emerald-500/10 text-emerald-600",
  Penelitian: "bg-blue-500/10 text-blue-600",
  Dinamika: "bg-fuchsia-500/10 text-fuchsia-600",
  Perspektif: "bg-amber-500/10 text-amber-600",
}

const DEFAULT_CATEGORY_COLOR = "bg-slate-500/10 text-slate-600"

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR
}

function formatPublishedDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function BlogPostListEditor({
  userId,
  onSelectPost,
  onCreateNew,
}: BlogPostListEditorProps) {
  const posts = useQuery(api.blog.listAllPosts, { requestorId: userId })
  const deletePost = useMutation(api.blog.deletePost)

  async function handleDelete(id: Id<"blogSections">, title: string) {
    const confirmed = window.confirm(
      `Hapus post '${title}'? Tindakan ini tidak bisa dibatalkan.`
    )
    if (!confirmed) return

    await deletePost({ requestorId: userId, id })
  }

  // Loading skeleton
  if (posts === undefined) {
    return (
      <div className="w-full space-y-4 p-comfort">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full self-start space-y-4 overflow-hidden p-comfort">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          Blog Posts
        </h3>
        <button
          type="button"
          onClick={onCreateNew}
          className="flex shrink-0 items-center gap-1.5 rounded-action border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors duration-50 hover:bg-muted/50"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Buat Post Baru
        </button>
      </div>

      {/* Post list */}
      {posts.length === 0 ? (
        <p className="text-interface text-sm text-muted-foreground">
          Belum ada post.
        </p>
      ) : (
        <div className="flex flex-col gap-dense">
          {posts.map((post) => (
            <div
              key={post._id}
              onClick={() => onSelectPost(post.slug)}
              className="group flex min-w-0 cursor-pointer items-center gap-3 rounded-action border border-border px-3 py-2.5 transition-colors duration-50 hover:bg-muted/30"
            >
              {/* Published status dot */}
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  post.isPublished ? "bg-emerald-500" : "bg-slate-400"
                }`}
                title={post.isPublished ? "Published" : "Draft"}
              />

              {/* Title — truncates to fill available space */}
              <span className="min-w-0 flex-1 truncate text-interface text-sm font-medium text-foreground">
                {post.title}
              </span>

              {/* Badges + date + actions — shrink-0 block */}
              <div className="flex shrink-0 items-center gap-2">
                {/* Category badge */}
                <span
                  className={`text-signal rounded-badge px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${getCategoryColor(post.category)}`}
                >
                  {post.category}
                </span>

                {/* Featured badge */}
                {post.featured && (
                  <span className="text-signal rounded-badge bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                    Featured
                  </span>
                )}

                {/* Published date */}
                <span className="text-interface hidden text-xs text-muted-foreground lg:inline">
                  {formatPublishedDate(post.publishedAt)}
                </span>

                {/* Actions */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectPost(post.slug)
                  }}
                  className="flex items-center gap-1 rounded-action border border-border px-2 py-1 text-xs text-muted-foreground transition-colors duration-50 hover:bg-muted/50 hover:text-foreground"
                >
                  <EditPencil className="h-3 w-3" strokeWidth={1.5} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(post._id, post.title)
                  }}
                  className="rounded-action p-1 text-rose-400 transition-colors duration-50 hover:text-rose-300"
                  title={`Hapus ${post.title}`}
                >
                  <Trash className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

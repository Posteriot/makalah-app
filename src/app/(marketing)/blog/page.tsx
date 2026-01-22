"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { Input } from "@/components/ui/input"
import {
    Search,
    ArrowRight,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"


export default function BlogPage() {
    const [searchQuery, setSearchQuery] = useState("")
    const posts = useQuery(api.blog.getPublishedPosts, {
        category: undefined,
    })
    const featuredPost = useQuery(api.blog.getFeaturedPost)

    // Client-side search filtering (optional, since category is server-side)
    const filteredPosts = posts?.filter((post) => {
        if (!searchQuery) return true
        const searchLower = searchQuery.toLowerCase()
        return (
            post.title.toLowerCase().includes(searchLower) ||
            post.excerpt.toLowerCase().includes(searchLower) ||
            post.author.toLowerCase().includes(searchLower)
        )
    })

    // Exclude featured post from the grid if searching is empty
    const regularPosts =
        !searchQuery
            ? filteredPosts?.filter((post) => post._id !== featuredPost?._id)
            : filteredPosts

    return (
        <div className="bg-background text-foreground">
            {/* Hero Section - Standardized with About/Pricing */}
            <section className="hero-section hero-vivid hero-grid-thin">
                <div className="hero-content">
                    {/* Heading */}
                    <h1 className="hero-heading">
                        Wawasan <span className="text-brand">AI</span> Hari Ini
                    </h1>

                    {/* Subheading */}
                    <p className="hero-subheading">
                        Eksplorasi tren terbaru, tutorial mendalam, dan berita seputar kecerdasan buatan dalam penulisan akademik.
                    </p>

                    {/* Search Bar in Hero */}
                    <div className="mt-12 flex justify-center">
                        <div className="relative w-full max-w-xl group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-brand transition-colors" />
                            <Input
                                placeholder="Cari wawasan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 h-14 bg-card/10 border-border/50 focus:border-brand/40 transition-all rounded-2xl text-base backdrop-blur-md"
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom Fade Gradient (from About Hero) */}
                <div className="absolute bottom-0 left-0 right-0 h-[120px] bg-gradient-to-b from-transparent to-background pointer-events-none" />
            </section>

            <main className="global-main">
                <div className="max-w-[72rem] mx-auto px-4 md:px-6 py-12">
                    {/* Results Indicator */}
                    {searchQuery && (
                        <div className="mb-8 p-4 rounded-xl bg-card/10 border border-border/50 text-sm text-muted-foreground">
                            Menampilkan hasil pencarian untuk: <span className="text-foreground font-semibold">&quot;{searchQuery}&quot;</span>
                        </div>
                    )}

                    {/* Featured Post */}
                    {featuredPost && !searchQuery && (
                        <section className="section-full !pt-0">
                            <div className="group border border-border bg-card/20 backdrop-blur-sm hover:border-brand/20 transition-all duration-300 overflow-hidden rounded-2xl">
                                <div className="flex flex-col lg:flex-row min-h-[400px]">
                                    {featuredPost.coverImage && (
                                        <div className="lg:w-1/2 overflow-hidden relative min-h-[300px] grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500">
                                            <Image
                                                src={featuredPost.coverImage}
                                                alt={featuredPost.title}
                                                fill
                                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                        </div>
                                    )}
                                    <div className={cn("flex-1 p-8 md:p-12 flex flex-col justify-center", !featuredPost.coverImage && "w-full")}>
                                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand mb-4">
                                            {featuredPost.category}
                                        </div>
                                        <h3 className="font-hero text-2xl md:text-3xl font-bold mb-4 leading-tight">
                                            {featuredPost.title}
                                        </h3>
                                        <p className="text-muted-foreground mb-6 line-clamp-3 leading-relaxed">
                                            {featuredPost.excerpt}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-8">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-foreground">{featuredPost.author}</span>
                                            </div>
                                            <div className="w-1 h-1 rounded-full bg-border" />
                                            <div>
                                                {new Date(featuredPost.publishedAt).toLocaleDateString("id-ID", {
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                            </div>
                                            <div className="w-1 h-1 rounded-full bg-border" />
                                            <div>{featuredPost.readTime}</div>
                                        </div>
                                        <Link
                                            href={`/blog/${featuredPost.slug}`}
                                            className="text-brand font-medium flex items-center gap-2 hover:gap-3 transition-all group/link"
                                        >
                                            Baca Selengkapnya
                                            <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Blog Posts Grid */}
                    <section className="section-full">

                        {!filteredPosts ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-80 rounded-2xl bg-card/10 animate-pulse border border-border" />
                                ))}
                            </div>
                        ) : regularPosts?.length === 0 ? (
                            <div className="text-center py-20 px-6 rounded-2xl bg-card/10 border border-dashed border-border/50">
                                <div className="w-16 h-16 rounded-xl bg-muted/20 flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-hero font-bold mb-2">Pencarian Nihil</h3>
                                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                    Gak nemu hasil buat &quot;{searchQuery}&quot;. Coba keyword lain.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {regularPosts?.map((post) => (
                                    <div
                                        key={post._id}
                                        className="group flex flex-col h-full border border-border bg-card/10 backdrop-blur-sm hover:border-brand/20 transition-all duration-300 rounded-2xl overflow-hidden"
                                    >
                                        {post.coverImage && (
                                            <div className="h-48 overflow-hidden relative grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500">
                                                <Image
                                                    src={post.coverImage}
                                                    alt={post.title}
                                                    fill
                                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                                />
                                            </div>
                                        )}
                                        <div className="p-6 flex flex-col flex-1">
                                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand mb-3">
                                                {post.category}
                                            </div>
                                            <h3 className="font-hero text-lg font-bold mb-3 line-clamp-2 transition-colors leading-tight">
                                                {post.title}
                                            </h3>
                                            <p className="text-muted-foreground text-xs mb-6 line-clamp-3 leading-relaxed">
                                                {post.excerpt}
                                            </p>
                                            <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between">
                                                <div className="text-[10px] text-muted-foreground font-medium">
                                                    {new Date(post.publishedAt).toLocaleDateString("id-ID", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </div>
                                                <Link
                                                    href={`/blog/${post.slug}`}
                                                    className="text-[10px] font-bold uppercase tracking-wider text-brand hover:opacity-80 transition-opacity flex items-center gap-1"
                                                >
                                                    Baca
                                                    <ArrowRight className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Newsletter Section - Refined like CareerContactSection approach */}
                    <section className="section-full !pb-32">
                        <div className="max-w-2xl mx-auto px-4">
                            <div className="border border-border bg-card/10 backdrop-blur-md rounded-2xl p-10 md:p-14 text-center">
                                <h2 className="section-heading mb-4 px-0">Tetap Terhubung</h2>
                                <p className="text-muted-foreground text-sm mb-10 max-w-sm mx-auto">
                                    Dapatkan update fitur terbaru dan tips penulisan langsung di email lo.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
                                    <Input
                                        placeholder="Alamat email..."
                                        className="h-11 bg-background/50 border-border/50 focus:border-brand/40 rounded-xl text-sm"
                                    />
                                    <button className="h-11 px-8 bg-brand text-white hover:bg-brand/90 font-bold rounded-xl transition-all active:scale-95 text-sm shadow-lg shadow-brand/10">
                                        Gabung
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    )
}

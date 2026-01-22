"use client"

import React from "react"
import Image from "next/image"
import Link from "next/link"

interface AuthWideCardProps {
    children: React.ReactNode
    title?: string
    subtitle?: string
    customLeftContent?: React.ReactNode
}

export function AuthWideCard({ children, title, subtitle, customLeftContent }: AuthWideCardProps) {
    return (
        <div className="w-full max-w-4xl min-h-[550px] flex flex-col md:flex-row overflow-hidden rounded-2xl border border-border bg-card shadow-2xl relative">
            {/* IDE Traffic Lights Decor */}
            <div className="absolute top-4 left-4 flex gap-1.5 z-20">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56] opacity-80" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] opacity-80" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f] opacity-80" />
            </div>

            {/* Left Column: Branding & Personality */}
            <div className="md:w-5/12 bg-muted/30 p-8 flex flex-col justify-center items-center md:items-start text-center md:text-left relative border-b md:border-b-0 md:border-r border-border">
                {/* Decorative Grid for Left side */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-grid-thin" />

                {customLeftContent ? (
                    <div className="relative z-10 w-full h-full flex flex-col">
                        {customLeftContent}
                    </div>
                ) : (
                    <div className="relative z-10 space-y-6">
                        <Link href="/" className="inline-flex items-center gap-3 group">
                            <Image
                                src="/logo/makalah_logo_500x500.png"
                                alt="Logo"
                                width={40}
                                height={40}
                                className="rounded-lg shadow-sm transition-transform group-hover:scale-105"
                            />
                            <div className="flex flex-col">
                                <span className="font-hero text-xl font-bold leading-tight flex items-center gap-1">
                                    Makalah <span className="text-brand">AI</span>
                                </span>
                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                                    Pawang Paper
                                </span>
                            </div>
                        </Link>

                        <div className="space-y-3">
                            <h1 className="font-hero text-3xl font-bold tracking-tight text-foreground">
                                {title || "Selamat Datang, Pawang!"}
                            </h1>
                            <p className="text-muted-foreground text-sm leading-relaxed max-w-[240px]">
                                {subtitle || "Paper lo nggak bakal jadi sendiri. Yuk lanjutin riset lo biar makin sat-set."}
                            </p>
                        </div>

                        <div className="pt-4 flex items-center gap-2 text-[10px] text-muted-foreground font-mono uppercase tracking-tighter opacity-50">
                            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                            System Online: Ready for research
                        </div>
                    </div>
                )}
            </div>


            {/* Right Column: Interaction (Clerk Form) */}
            <div className="md:w-7/12 p-8 md:p-12 flex items-center justify-center bg-card relative">
                <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
                    {children}
                </div>
            </div>
        </div>
    )
}

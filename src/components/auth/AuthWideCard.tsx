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

export function AuthWideCard({
    children,
    title,
    subtitle,
    customLeftContent,
}: AuthWideCardProps) {
    const resolvedTitle = title || "Silakan masuk!"
    const firstSpaceIndex = resolvedTitle.indexOf(" ")
    const shouldBreakTitle = firstSpaceIndex > 0
    const titleFirstWord = shouldBreakTitle
        ? resolvedTitle.slice(0, firstSpaceIndex)
        : resolvedTitle
    const titleRest = shouldBreakTitle
        ? resolvedTitle.slice(firstSpaceIndex + 1).trimStart()
        : ""

    const resolvedSubtitle = subtitle || "Susun Paper terbaikmu, tanpa ribet, tinggal ngobrol!"
    const firstCommaIndex = resolvedSubtitle.indexOf(",")
    const hasComma = firstCommaIndex >= 0
    const subtitleLead = hasComma
        ? resolvedSubtitle.slice(0, firstCommaIndex + 1)
        : resolvedSubtitle
    const subtitleEmphasis = hasComma
        ? resolvedSubtitle.slice(firstCommaIndex + 1).trimStart()
        : ""

    return (
        <div className="w-full max-w-4xl flex flex-col md:flex-row overflow-hidden rounded-shell border border-border bg-card shadow-none relative">
            {/* Left Column: Branding & Personality */}
            <div className="md:w-5/12 bg-muted/30 p-8 md:p-12 border-b md:border-b-0 md:border-r border-hairline relative flex flex-col">
                {/* Diagonal Stripes - Industrial Texture */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
                    style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 8px)'
                    }}
                    aria-hidden="true"
                />

                {customLeftContent ? (
                    <div className="relative z-10 w-full h-full flex flex-col">
                        {customLeftContent}
                    </div>
                ) : (
                    /* Inner wrapper - height and alignment sync with Clerk card */
                    <div className="relative z-10 w-full flex flex-col justify-between flex-grow">
                        {/* Logo + Brand - Top, aligns with top edge of Clerk card */}
                        <div className="flex flex-col">
                            <Link href="/" className="inline-flex items-center gap-2 group w-fit">
                                {/* Logo Icon */}
                                <Image
                                    src="/logo/makalah_logo_light.svg"
                                    alt=""
                                    width={28}
                                    height={28}
                                    className="transition-transform group-hover:scale-105"
                                />
                                {/* Brand Text - for dark mode */}
                                <Image
                                    src="/logo-makalah-ai-white.svg"
                                    alt="Makalah"
                                    width={80}
                                    height={20}
                                    className="hidden dark:block transition-transform group-hover:scale-105"
                                />
                                {/* Brand Text - for light mode */}
                                <Image
                                    src="/logo-makalah-ai-black.svg"
                                    alt="Makalah"
                                    width={80}
                                    height={20}
                                    className="block dark:hidden transition-transform group-hover:scale-105"
                                />
                            </Link>
                        </div>

                        {/* Heading + Subheading - Bottom, aligns with bottom edge of Clerk card */}
                        <div className="space-y-4 mt-auto">
                            <h1 className="font-mono text-2xl md:text-4xl font-bold tracking-tighter text-foreground leading-[1.1]">
                                {shouldBreakTitle ? (
                                    <>
                                        <span className="block">{titleFirstWord}</span>
                                        <span>{titleRest}</span>
                                    </>
                                ) : (
                                    resolvedTitle
                                )}
                            </h1>
                            <p className="text-sm leading-relaxed max-w-[280px] font-sans">
                                <span className="text-muted-foreground font-normal">
                                    {subtitleLead}
                                </span>{" "}
                                {subtitleEmphasis && (
                                    <span className="text-primary font-semibold">
                                        {subtitleEmphasis}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: Interaction (Clerk Form) */}
            <div className="md:w-7/12 p-8 md:p-12 flex flex-col items-center bg-[color:var(--slate-100)] dark:bg-[color:var(--slate-800)] relative">
                <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
                    {children}
                </div>
            </div>
        </div>
    )
}

"use client"

import React from "react"
import Image from "next/image"
import Link from "next/link"
import { NavArrowLeft, Xmark } from "iconoir-react"

interface AuthWideCardProps {
    children: React.ReactNode
    title?: string
    subtitle?: string
    customLeftContent?: React.ReactNode
    showBackButton?: boolean
    onBackClick?: () => void
    showCloseButton?: boolean
    onCloseClick?: () => void
}

export function AuthWideCard({
    children,
    title,
    subtitle,
    customLeftContent,
    showBackButton = false,
    onBackClick,
    showCloseButton = false,
    onCloseClick,
}: AuthWideCardProps) {
    const resolvedTitle = title || "Silakan masuk!"

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
        <div className="w-full max-w-4xl flex flex-col md:flex-row md:min-h-[520px] overflow-hidden rounded-lg border border-border bg-card shadow-none relative">
            {showCloseButton && (
                <button
                    type="button"
                    onClick={onCloseClick}
                    className="absolute right-6 top-6 z-20 inline-flex h-8 w-8 items-center justify-center rounded-action border border-border/60 bg-[color:var(--slate-900)]/70 text-[color:var(--slate-100)] transition-colors hover:bg-[color:var(--slate-100)] hover:text-[color:var(--slate-900)] dark:bg-[color:var(--slate-100)]/90 dark:text-[color:var(--slate-900)] dark:hover:bg-[color:var(--slate-900)] dark:hover:text-[color:var(--slate-100)] focus-ring md:right-12 md:top-12"
                    aria-label="Tutup"
                >
                    <Xmark className="h-4 w-4" />
                </button>
            )}
            {/* Left Column: Branding & Personality */}
            <div className="md:w-5/12 bg-slate-950 p-6 md:p-12 relative flex flex-col">
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
                    /* Inner wrapper - height and alignment sync with auth form */
                    <div className="relative z-10 w-full flex flex-col justify-between flex-grow">
                        {/* Logo + Brand - Top, aligns with top edge of auth form */}
                        <div className="flex items-center justify-between w-full">
                            <Link href="/" className="inline-flex items-center gap-2 group w-fit">
                                {/* Logo Icon */}
                                <Image
                                    src="/logo/logo-color-darkmode.png"
                                    alt=""
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 shrink-0 transition-transform group-hover:scale-105"
                                />
                            </Link>
                            {showBackButton ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onBackClick) {
                                            onBackClick()
                                            return
                                        }
                                        window.history.back()
                                    }}
                                    className="inline-flex items-center gap-2 text-sm font-normal text-slate-300 transition-colors hover:text-slate-100 hover:underline focus-ring w-fit"
                                >
                                    <NavArrowLeft className="h-4 w-4" />
                                    <span>Kembali</span>
                                </button>
                            ) : null}
                        </div>

                        {/* Heading + Subheading - Bottom, aligns with bottom edge of auth form */}
                        <div className="space-y-3 mt-6 md:space-y-4 md:mt-auto">
                            <h1 className="font-sans text-2xl md:text-3xl font-medium text-foreground dark:text-slate-200 leading-[1.1]">
                                {resolvedTitle}
                            </h1>
                            <p className="text-sm leading-relaxed max-w-[280px] font-mono">
                                <span className="text-muted-foreground font-normal">
                                    {subtitleLead}
                                </span>{" "}
                                {subtitleEmphasis && (
                                    <span className="text-slate-50 font-normal">
                                        {subtitleEmphasis}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: Interaction (Auth Form) */}
            <div className="md:w-7/12 p-8 md:p-12 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 relative min-h-[460px]">
                <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
                    {children}
                </div>
            </div>
        </div>
    )
}

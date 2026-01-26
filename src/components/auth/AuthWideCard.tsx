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
        <div className="w-full max-w-4xl flex flex-col md:flex-row overflow-hidden rounded-2xl border border-border bg-card shadow-2xl relative">
            {/* Left Column: Branding & Personality */}
            <div className="md:w-5/12 bg-muted/30 p-8 md:p-12 border-b md:border-b-0 md:border-r border-border relative flex flex-col">
                {/* Decorative Grid for Left side */}
                <div className="absolute inset-0 opacity-40 pointer-events-none hero-grid-thin" />

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
                                <Image
                                    src="/logo/makalah_logo_500x500.png"
                                    alt="Makalah"
                                    width={28}
                                    height={28}
                                    className="rounded-md shadow-sm transition-transform group-hover:scale-105"
                                />
                                {/* Light text (for dark mode) */}
                                <Image
                                    src="/makalah_brand_text.svg"
                                    alt="Makalah"
                                    width={72}
                                    height={16}
                                    className="logo-brand-light"
                                />
                                {/* Dark text (for light mode) */}
                                <Image
                                    src="/makalah_brand_text_dark.svg"
                                    alt="Makalah"
                                    width={72}
                                    height={16}
                                    className="logo-brand-dark"
                                />
                            </Link>
                        </div>

                        {/* Heading + Subheading - Bottom, aligns with bottom edge of Clerk card */}
                        <div className="space-y-4 mt-auto">
                            <h1 className="font-hero text-3xl md:text-5xl font-bold tracking-tighter text-foreground leading-[1.1]">
                                {title && title.includes("Silakan masuk!") ? (
                                    <>Silakan<br />Masuk!</>
                                ) : (
                                    title || <>Silakan<br />Masuk!</>
                                )}
                            </h1>
                            <p className="text-sm leading-relaxed max-w-[280px]">
                                <span className="text-muted-foreground font-normal">
                                    {subtitle ? subtitle.split(",")[0] + "," : "Susun Paper terbaikmu,"}
                                </span>{" "}
                                <span className="text-brand font-bold">
                                    {subtitle ? subtitle.split(",").slice(1).join(",") : "tanpa ribet, tinggal ngobrol!"}
                                </span>
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: Interaction (Clerk Form) */}
            <div className="md:w-7/12 p-8 md:p-12 flex flex-col items-center bg-card relative">
                <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
                    {children}
                </div>
            </div>
        </div>
    )
}

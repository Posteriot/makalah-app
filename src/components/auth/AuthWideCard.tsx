"use client"

import React from "react"
import Image from "next/image"
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
    showBackButton = true,
    onBackClick,
    showCloseButton = false,
    onCloseClick,
}: AuthWideCardProps) {
    const resolvedTitle = title || "Silakan masuk!"

    const resolvedSubtitle = subtitle || "Susun Paper terbaikmu, tanpa ribet, tinggal ngobrol!"
    const firstCommaIndex = resolvedSubtitle.indexOf(",")
    const hasComma = firstCommaIndex >= 0
    const subtitleLineOne = hasComma
        ? resolvedSubtitle.slice(0, firstCommaIndex + 1).trimEnd()
        : resolvedSubtitle
    const subtitleLineTwo = hasComma
        ? resolvedSubtitle.slice(firstCommaIndex + 1).trimStart()
        : ""

    function handleBackClick() {
        if (onBackClick) {
            onBackClick()
            return
        }

        const params = new URLSearchParams(window.location.search)
        const redirectParam = params.get("redirect_url") ?? params.get("redirect")

        if (redirectParam) {
            if (redirectParam.startsWith("/")) {
                window.location.href = redirectParam
                return
            }

            try {
                const parsed = new URL(redirectParam)
                if (parsed.origin === window.location.origin) {
                    window.location.href = `${parsed.pathname}${parsed.search}${parsed.hash}`
                    return
                }
            } catch {
                // Invalid redirect param, fallback to history.
            }
        }

        if (window.history.length > 1) {
            window.history.back()
            return
        }

        window.location.href = "/"
    }

    function handleCloseClick() {
        if (onCloseClick) {
            onCloseClick()
            return
        }
        window.location.href = "/"
    }

    return (
        <div className="flex min-h-0 w-full flex-1">
            <div className="auth-split flex-1">
                <div className="auth-section-left relative">
                    <div className="auth-left-pattern-overlay" aria-hidden="true" />

                    <div className="relative z-10 flex h-full w-full flex-col">
                        <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3">
                            {showBackButton ? (
                                <button
                                    type="button"
                                    onClick={handleBackClick}
                                    className="auth-back-button auth-focus-ring"
                                >
                                    <NavArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                                    <span>Kembali</span>
                                </button>
                            ) : (
                                <span aria-hidden="true" />
                            )}

                            {showCloseButton ? (
                                <button
                                    type="button"
                                    onClick={handleCloseClick}
                                    className="auth-close-button auth-focus-ring"
                                    aria-label="Tutup"
                                >
                                    <Xmark className="h-4 w-4" />
                                </button>
                            ) : (
                                <span aria-hidden="true" />
                            )}
                        </div>

                        {customLeftContent ? (
                            <div className="flex h-full w-full flex-1 flex-col pt-14 md:pt-16">
                                {customLeftContent}
                            </div>
                        ) : (
                            <div className="relative flex w-full flex-1">
                                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
                                    <div className="flex w-full max-w-xl flex-col gap-8 md:gap-10">
                                        <div className="inline-flex w-fit items-center gap-2">
                                            <Image
                                                src="/logo/logo-color-darkmode.png"
                                                alt="Makalah"
                                                width={56}
                                                height={56}
                                                className="h-12 w-12 shrink-0 md:h-14 md:w-14"
                                            />
                                        </div>

                                        <div className="max-w-[36ch] space-y-1.5 md:space-y-2">
                                            <h1 className="auth-hero-title">
                                                {resolvedTitle}
                                            </h1>
                                            <p className="auth-hero-subtitle">
                                                <span className="auth-hero-subtitle-line">
                                                    {subtitleLineOne}
                                                </span>
                                                {subtitleLineTwo && (
                                                    <span className="auth-hero-subtitle-line">
                                                        {subtitleLineTwo}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="auth-section-right">
                    <div className="auth-form-wrap">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}

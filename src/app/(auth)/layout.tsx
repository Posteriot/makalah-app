import React from "react"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen relative overflow-hidden bg-background text-foreground flex items-center justify-center p-6 hero-vivid">
            {/* Dark Overlay for Aurora - provide "transparency to black" feel */}
            <div className="absolute inset-0 bg-black/60 pointer-events-none z-0" aria-hidden="true" />

            {/* Grid Overlay */}
            <div
                className="hero-grid-thin absolute inset-0 pointer-events-none opacity-20 z-1"
                aria-hidden="true"
            />

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-5xl flex justify-center">
                {children}
            </div>
        </div>
    )
}

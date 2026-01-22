import React from "react"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen relative overflow-hidden bg-background text-foreground flex items-center justify-center p-6 bg-grid-thin">
            {/* Aurora Background (Static Version) */}
            <div
                className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-30"
                style={{
                    background: `
            radial-gradient(780px 600px at 20% 18%, rgba(232, 102, 9, 0.4) 0 32%, transparent 58%),
            radial-gradient(620px 500px at 86% 14%, rgba(115, 185, 4, 0.35) 0 28%, transparent 56%),
            radial-gradient(660px 480px at 80% 78%, rgba(25, 196, 156, 0.32) 0 26%, transparent 54%),
            radial-gradient(580px 440px at 14% 82%, rgba(154, 131, 18, 0.5) 0 22%, transparent 52%)
          `,
                    filter: "blur(80px) saturate(1.2)",
                }}
                aria-hidden="true"
            />

            {/* Grid Overlay */}
            <div
                className="hero-grid-thin absolute inset-0 pointer-events-none opacity-20"
                aria-hidden="true"
            />

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-5xl flex justify-center">
                {children}
            </div>
        </div>
    )
}

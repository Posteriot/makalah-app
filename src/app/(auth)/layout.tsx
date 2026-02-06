import React from "react"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="h-dvh relative overflow-y-auto bg-background text-foreground flex items-center justify-center p-4 md:p-6">
            {/* Industrial Grid Pattern - Mechanical Grace */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] z-[1]"
                style={{
                    backgroundImage: `
                        linear-gradient(var(--border-hairline) 1px, transparent 1px),
                        linear-gradient(90deg, var(--border-hairline) 1px, transparent 1px)
                    `,
                    backgroundSize: '48px 48px'
                }}
                aria-hidden="true"
            />

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-5xl flex justify-center">
                {children}
            </div>
        </div>
    )
}

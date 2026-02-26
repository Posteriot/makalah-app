import React from "react"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div data-auth-scope className="auth-shell relative overflow-hidden">
            {/* Industrial Grid Pattern - Mechanical Grace */}
            <div className="auth-shell-grid-overlay" aria-hidden="true" />

            {/* Fullpage container: no center card, stretch across viewport */}
            <div className="relative z-10 flex min-h-0 w-full flex-1">
                {children}
            </div>
        </div>
    )
}

import type { ReactNode } from "react"

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh relative bg-background text-foreground flex items-start md:items-center justify-center p-0 md:p-6">
      {/* Industrial Grid Pattern — same as auth layout */}
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
      <div className="relative z-10 w-full max-w-none md:max-w-5xl flex md:justify-center">
        {children}
      </div>
    </div>
  )
}

"use client"

import { SectionBadge } from "@/components/ui/section-badge"
import { DottedPattern } from "@/components/marketing/SectionBackground"
import { motion } from "framer-motion"

type SimplePolicyPageProps = {
    badge: string
    title: string
    children: React.ReactNode
}

export function SimplePolicyPage({ badge, title, children }: SimplePolicyPageProps) {
    const lastUpdatedLabel = new Intl.DateTimeFormat("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
    })
        .format(new Date())
        .toUpperCase()

    return (
        <div className="relative isolate min-h-screen overflow-hidden bg-[color:var(--section-bg-alt)] pt-[var(--header-h)] pb-24">
            <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />

            <div className="relative z-10 mx-auto w-full max-w-7xl px-4 lg:px-8">
                <div className="mx-auto mt-4 w-full max-w-4xl rounded-shell bg-card/90 px-5 py-8 backdrop-blur-[1px] dark:bg-slate-900 md:px-9 md:py-10">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-6"
                    >
                        <SectionBadge>{badge}</SectionBadge>
                        <h1 className="max-w-[24ch] text-narrative text-2xl font-medium leading-tight tracking-tight text-foreground md:text-3xl">
                            {title}
                        </h1>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="mt-9 space-y-10"
                    >
                        <article className="space-y-8 text-narrative text-sm leading-relaxed text-muted-foreground [&_h2]:text-interface [&_h2]:text-base [&_h2]:font-medium [&_h2]:text-foreground [&_li]:break-words [&_li]:leading-relaxed [&_p]:break-words [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                            {children}
                        </article>

                        <div className="pt-1">
                            <div className="inline-flex items-center rounded-action bg-[color:var(--slate-100)]/75 px-3 py-2 dark:bg-[color:var(--slate-800)]/75">
                                <p className="text-signal text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                                    Terakhir Diperbarui: {lastUpdatedLabel}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

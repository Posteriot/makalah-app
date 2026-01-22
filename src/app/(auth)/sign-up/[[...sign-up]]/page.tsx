import { SignUp } from "@clerk/nextjs"
import { AuthWideCard } from "@/components/auth/AuthWideCard"
import Image from "next/image"
import Link from "next/link"

export default function SignUpPage() {
  return (
    <AuthWideCard
      customLeftContent={
        <div className="space-y-8 flex flex-col h-full justify-center">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <Image
              src="/logo/makalah_logo_500x500.png"
              alt="Logo"
              width={40}
              height={40}
              className="rounded-lg shadow-sm transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col text-left">
              <span className="font-hero text-xl font-bold leading-tight flex items-center gap-1">
                Makalah <span className="text-brand">AI</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Pawang Paper
              </span>
            </div>
          </Link>

          <div className="space-y-4">
            <h1 className="font-hero text-3xl font-bold tracking-tight text-foreground text-left leading-tight">
              Mulai Riset Lo <br /> Sekarang_
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-[280px] text-left">
              Gabung 10.000+ Pawang Paper lainnya dan bikin riset akademik lo makin sat-set.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              "Riset Paper Sat-Set pake Agen AI",
              "Akses 200jt+ Database Akademik",
              "Refrasa Otomatis Gaya Akademik",
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-foreground/80">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center">
                  <span className="text-brand text-[8px]">✨</span>
                </div>
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          <div className="pt-6 flex items-center gap-2 text-[10px] text-muted-foreground font-mono uppercase tracking-tighter opacity-50">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            Join the elite research club
          </div>
        </div>
      }
    >
      <SignUp
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-none border-none bg-transparent p-0 w-full",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            socialButtonsBlockButton: "rounded-lg border-border hover:bg-muted transition-colors text-sm font-medium",
            formButtonPrimary: "bg-brand hover:opacity-90 transition-opacity text-sm font-bold h-10 shadow-none",
            formFieldInput: "rounded-lg border-border bg-background focus:ring-brand focus:border-brand transition-all",
            footerActionLink: "text-brand hover:text-brand/80 font-bold",
            identityPreviewText: "text-foreground",
            identityPreviewEditButtonIcon: "text-brand",
            formFieldLabel: "text-foreground font-medium",
            dividerText: "text-muted-foreground",
          },
        }}
      />
    </AuthWideCard>
  )
}



import {
  HeroSection,
  ManifestoSection,
  ProblemsSection,
  AgentsSection,
  CareerContactSection,
} from "@/components/about"

export default function AboutPage() {
  return (
    <>
      <HeroSection />
      <main className="global-main">
        <ManifestoSection />
        <ProblemsSection />
        <AgentsSection />
        <CareerContactSection />
      </main>
    </>
  )
}

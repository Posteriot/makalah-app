import {
  ManifestoSection,
  ProblemsSection,
  AgentsSection,
  CareerContactSection,
} from "@/components/about"

export default function AboutPage() {
  return (
    <main className="bg-background">
      <ManifestoSection />
      <ProblemsSection />
      <AgentsSection />
      <CareerContactSection />
    </main>
  )
}

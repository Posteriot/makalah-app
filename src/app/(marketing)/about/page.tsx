import { CmsPageWrapper } from "@/components/marketing/CmsPageWrapper"
import {
  ManifestoSection,
  ProblemsSection,
  AgentsSection,
  CareerContactSection,
} from "@/components/about"

export default function AboutPage() {
  return (
    <CmsPageWrapper slug="about" badge="Tentang" fallbackTitle="Tentang Makalah AI">
      <main className="bg-background">
        <ManifestoSection />
        <ProblemsSection />
        <AgentsSection />
        <CareerContactSection />
      </main>
    </CmsPageWrapper>
  )
}

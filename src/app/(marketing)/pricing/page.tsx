import { PricingSection } from "@/components/marketing/PricingSection"

export default function PricingPage() {
  return (
    <>
      <section className="hero-section hero-vivid hero-grid-thin">
        <div className="hero-content">
          <h1 className="hero-heading">
            Tak Perlu Bayar Mahal Untuk Karya Yang Masuk Akal
          </h1>
          <p className="hero-subheading">
            Pilih paket penggunaan sesuai kebutuhan. Mau ujicoba dulu yang
            gratisan? Boleh! Atau langsung bayar per paper? Aman! Jika perlu,
            langganan bulanan sekalian! Bebas!
          </p>
        </div>
      </section>

      <PricingSection showCta={false} />
    </>
  )
}

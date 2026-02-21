import { CmsPageWrapper } from "@/components/marketing/CmsPageWrapper"
import { SimplePolicyPage } from "@/components/marketing/SimplePolicyPage"

export default function TermsPage() {
    return (
        <CmsPageWrapper slug="terms" badge="Legal">
            <SimplePolicyPage badge="Legal" title="Ketentuan Layanan Makalah AI">
                <p>
                    Selamat datang di Makalah AI. Dengan mengakses atau menggunakan layanan kami, Anda setuju untuk terikat oleh Ketentuan Layanan ini. Makalah AI adalah platform asisten penulisan akademis berbasis AI yang dikelola oleh <strong>PT THE MANAGEMENT ASIA</strong>.
                </p>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">1. Ketentuan Penggunaan</h2>
                    <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
                        Layanan ini disediakan untuk membantu Anda dalam proses riset dan penyusunan karya tulis. Anda setuju untuk tidak menggunakan layanan ini untuk tujuan ilegal atau melanggar hak kekayaan intelektual orang lain.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">2. Lisensi dan Hak Kekayaan Intelektual</h2>
                    <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
                        Seluruh output yang dihasilkan oleh AI melalui akun Anda adalah hak milik Anda. Namun, Makalah AI tetap memiliki hak atas infrastruktur, desain, dan algoritma sistem yang disediakan dalam platform.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">3. Batasan Tanggung Jawab (Disclaimer)</h2>
                    <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
                        Meskipun AI kami dirancang untuk akurasi tinggi, hasil yang diberikan harus ditinjau kembali oleh pengguna. Makalah AI tidak bertanggung jawab atas kesalahan faktual, kutipan yang tidak akurat, atau konsekuensi akademis yang muncul dari penggunaan output AI tanpa verifikasi manusia.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">4. Pembayaran dan Pembatalan</h2>
                    <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
                        Beberapa fitur memerlukan akses berbayar melalui mitra kami, Xendit. Pembelian bersifat final kecuali dinyatakan lain dalam kebijakan pengembalian dana kami. Anda bertanggung jawab untuk menjaga keamanan akun dan informasi pembayaran Anda.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">5. Perubahan Layanan</h2>
                    <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
                        Kami berhak mengubah atau menghentikan bagian apa pun dari layanan kami sewaktu-waktu tanpa pemberitahuan sebelumnya, demi peningkatan kualitas atau pemenuhan kepatuhan regulasi.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">6. Hukum yang Berlaku</h2>
                    <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
                        Ketentuan ini diatur oleh hukum Republik Indonesia. Setiap perselisihan yang muncul akan diselesaikan melalui musyawarah atau melalui jalur hukum sesuai yurisdiksi yang berlaku.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">7. Kontak</h2>
                    <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
                        Untuk pertanyaan mengenai Ketentuan Layanan ini, silakan hubungi kami di:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-narrative text-sm text-muted-foreground">
                        <li><strong>Email</strong>: dukungan@makalah.ai</li>
                        <li><strong>Alamat</strong>: PT THE MANAGEMENT ASIA, Jl. H. Jian, Kebayoran Baru, Jakarta Selatan</li>
                    </ul>
                </section>
            </SimplePolicyPage>
        </CmsPageWrapper>
    )
}

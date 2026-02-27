"use client"

import { CmsPageWrapper } from "@/components/marketing/CmsPageWrapper"
import { SimplePolicyPage } from "@/components/marketing/SimplePolicyPage"
import { openMailClientOrGmail } from "@/lib/utils/emailLink"
import type { MouseEvent } from "react"

export default function PrivacyPage() {
    function handleSupportEmailClick(event: MouseEvent<HTMLAnchorElement>) {
        event.preventDefault()
        event.stopPropagation()
        openMailClientOrGmail("mailto:dukungan@makalah.ai", { openInNewTab: true })
    }

    return (
        <CmsPageWrapper slug="privacy" badge="Legal">
            <SimplePolicyPage badge="Legal" title="Kebijakan Privasi Makalah AI">
                <p>
                    Makalah AI (dioperasikan oleh PT THE MANAGEMENT ASIA) sangat menghargai privasi Anda. Sebagai aplikasi <strong>AI Academic Writing Assistant</strong>, kami berkomitmen untuk transparan dalam mengelola data yang Anda berikan agar layanan kami dapat membantu Anda menyusun karya tulis ilmiah dengan maksimal.
                </p>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">1. Data yang Kami Kumpulkan</h2>
                    <p className="text-narrative text-sm leading-relaxed text-muted-foreground">Untuk menjalankan fungsi aplikasi, kami mengumpulkan:</p>
                    <ul className="list-disc pl-5 space-y-2 text-narrative text-sm text-muted-foreground">
                        <li><strong>Data Profil</strong>: Nama dan alamat email saat Anda mendaftar (via Google atau formulir langsung).</li>
                        <li><strong>Konten Riset</strong>: Pesan chat, draf paper, dan file lampiran yang Anda unggah untuk diproses oleh AI.</li>
                        <li><strong>Data Transaksi</strong>: Informasi transaksi pembayaran (melalui mitra pembayaran resmi) untuk pengelolaan langganan.</li>
                        <li><strong>Data Teknis</strong>: Log aktivitas dasar untuk memastikan layanan tetap stabil dan aman.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">2. Bagaimana Kami Menggunakan Data Anda</h2>
                    <p className="text-narrative text-sm leading-relaxed text-muted-foreground">Tujuan utama penggunaan data Anda adalah untuk:</p>
                    <ul className="list-disc pl-5 space-y-2 text-narrative text-sm text-muted-foreground">
                        <li>Memberikan layanan penulisan dan riset akademis berbasis AI.</li>
                        <li>Memproses pembayaran langganan fitur pro.</li>
                        <li>Memenuhi kebutuhan keamanan seperti verifikasi login dan pemulihan akun.</li>
                        <li>Mengirimkan update penting mengenai status layanan atau pemberitahuan akun.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">3. Pemrosesan AI dan Pihak Ketiga</h2>
                    <p className="text-narrative text-sm leading-relaxed text-muted-foreground">Untuk memberikan hasil terbaik, data konten Anda diproses menggunakan:</p>
                    <ul className="list-disc pl-5 space-y-2 text-narrative text-sm text-muted-foreground">
                        <li><strong>Penyedia AI</strong>: Konten riset dikirimkan ke model AI (seperti Google Gemini atau OpenAI) untuk diolah menjadi draf paper.</li>
                        <li><strong>Penyedia Pembayaran</strong>: Data transaksi diproses secara aman oleh mitra pembayaran resmi sesuai standar PCI-DSS.</li>
                        <li><strong>Autentikasi</strong>: Kami menggunakan layanan pihak ketiga untuk akses masuk yang aman (OAuth).</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">4. Keamanan dan Penyimpanan</h2>
                    <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
                        Data Anda disimpan dalam basis data terenkripsi. Kami menerapkan pemeriksaan kepemilikan ketat sehingga hanya akun Anda yang memiliki akses ke data chat dan paper yang Anda buat.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">5. Kontrol dan Hak Anda</h2>
                    <p className="text-narrative text-sm leading-relaxed text-muted-foreground">Sebagai pengguna, Anda berhak untuk:</p>
                    <ul className="list-disc pl-5 space-y-2 text-narrative text-sm text-muted-foreground">
                        <li>Memperbarui informasi profil Anda secara langsung di aplikasi.</li>
                        <li>Menghapus riwayat percakapan atau draf paper kapan saja.</li>
                        <li>Mengajukan penutupan akun melalui kanal dukungan kami.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">6. Kontak Kami</h2>
                    <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
                        Jika ada pertanyaan mengenai privasi data Anda, silakan hubungi tim kami di:<br />
                        <strong>Email</strong>:{" "}
                        <a
                            href="mailto:dukungan@makalah.ai"
                            onClick={handleSupportEmailClick}
                            className="text-slate-600 underline transition-colors hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
                        >
                            dukungan@makalah.ai
                        </a>
                        <br />
                        <strong>Alamat</strong>: Jl. H. Jian, Kebayoran Baru, Jakarta Selatan
                    </p>
                </section>
            </SimplePolicyPage>
        </CmsPageWrapper>
    )
}

import { CmsPageWrapper } from "@/components/marketing/CmsPageWrapper"
import { SimplePolicyPage } from "@/components/marketing/SimplePolicyPage"

export default function SecurityPage() {
    return (
        <CmsPageWrapper slug="security" badge="Security" fallbackTitle="Keamanan Data di Makalah AI">
            <SimplePolicyPage badge="Security" title="Keamanan Data di Makalah AI">
                <p>
                    Makalah AI dirancang dengan prinsip bahwa data Anda adalah milik Anda sepenuhnya. Kami membangun sistem keamanan berlapis untuk memastikan akses hanya terbatas pada pemilik akun, setiap transaksi terlindungi, dan seluruh alur kerja AI kami berjalan dalam koridor yang aman dan transparan.
                </p>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">Komitmen Kami terhadap Keamanan Anda</h2>
                    <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
                        Keamanan bukan sekadar fitur, tapi pondasi dari Makalah AI. Kami memastikan setiap data yang Anda olah di sini tetap privat dan terjaga.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">1. Perlindungan Akses Akun</h2>
                    <ul className="list-disc pl-5 space-y-2 text-narrative text-sm text-muted-foreground">
                        <li><strong>Autentikasi Ketat</strong>: Hanya Anda yang bisa mengakses area kerja dan riwayat riset Anda.</li>
                        <li><strong>Validasi Kepemilikan</strong>: Sistem melakukan pengecekan ganda di backend untuk memastikan data memang milik akun Anda.</li>
                        <li><strong>Login Sosial Tepercaya</strong>: Kami menggunakan Google OAuth untuk proses masuk yang aman tanpa menyimpan password di sistem kami.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">2. Keamanan Saat Menyusun Paper</h2>
                    <ul className="list-disc pl-5 space-y-2 text-narrative text-sm text-muted-foreground">
                        <li><strong>Alur Kerja Terkunci</strong>: Workflow paper dirancang bertahap agar tidak ada akses ilegal ke draf yang sedang dikerjakan.</li>
                        <li><strong>Jejak Sumber</strong>: Setiap referensi yang diambil oleh AI dicatat sebagai jejak kerja yang bisa Anda verifikasi.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">3. Keamanan File dan Lampiran</h2>
                    <ul className="list-disc pl-5 space-y-2 text-narrative text-sm text-muted-foreground">
                        <li><strong>Upload Terproteksi</strong>: File riset disimpan di storage terenkripsi dan hanya dapat di akses melalui izin akun Anda.</li>
                        <li><strong>Batas Aman</strong>: Pembatasan ukuran file 10MB untuk menjaga performa dan keamanan ekstraksi.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">4. Standar Pembayaran Global</h2>
                    <ul className="list-disc pl-5 space-y-2 text-narrative text-sm text-muted-foreground">
                        <li><strong>Mitra Terverifikasi</strong>: Transaksi diproses melalui Xendit. Kami tidak pernah menyimpan data kartu kredit atau PIN Anda.</li>
                        <li><strong>Proteksi Webhook</strong>: Setiap transaksi diverifikasi ulang dengan token unik untuk mencegah manipulasi data.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-interface text-base font-medium text-foreground">5. Apa yang Bisa Anda Lakukan?</h2>
                    <ul className="list-disc pl-5 space-y-2 text-narrative text-sm text-muted-foreground">
                        <li><strong>Gunakan Password Kuat</strong>: Jika tidak menggunakan login sosial.</li>
                        <li><strong>Anonimisasi</strong>: Hindari mengunggah data rahasia seperti nomor PIN ke dalam percakapan AI.</li>
                    </ul>
                </section>
            </SimplePolicyPage>
        </CmsPageWrapper>
    )
}

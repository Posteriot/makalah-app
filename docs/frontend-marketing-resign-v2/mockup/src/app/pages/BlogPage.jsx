/* Static blog landing page mock */

const BLOG_POSTS = [
  {
    id: "workflow-bertahap-untuk-paper",
    slug: "workflow-bertahap-untuk-paper",
    title: "Menulis paper lebih terarah dengan workflow bertahap",
    excerpt: "Panduan praktis untuk memakai Makalah AI dari pemilihan topik, penyusunan outline, sampai perapihan draft akhir.",
    category: "Tutorial",
    author: "Tim Makalah AI",
    publishedAt: "2026-04-18",
    dateShort: "18/04/2026",
    dateLong: "18 April 2026",
    readTime: "6 menit baca"
  },
  {
    id: "menentukan-topik-riset",
    slug: "menentukan-topik-riset",
    title: "Menentukan topik riset tanpa mulai dari judul final",
    excerpt: "Mulai dari pertanyaan inti, batas pembahasan, dan tujuan akademik sebelum mengunci judul paper.",
    category: "Tutorial",
    author: "Raka Pratama",
    publishedAt: "2026-04-12",
    dateShort: "12/04/2026",
    dateLong: "12 April 2026",
    readTime: "5 menit baca"
  },
  {
    id: "update-refrasa-final",
    slug: "update-refrasa-final",
    title: "Update Refrasa: perapihan kalimat untuk draft akhir",
    excerpt: "Refrasa membantu Kamu merapikan bahasa, menjaga konsistensi istilah, dan membuat paragraf lebih mudah dibaca.",
    category: "Update",
    author: "Tim Produk",
    publishedAt: "2026-04-05",
    dateShort: "05/04/2026",
    dateLong: "5 April 2026",
    readTime: "4 menit baca"
  },
  {
    id: "opini-ai-dalam-penulisan-akademik",
    slug: "opini-ai-dalam-penulisan-akademik",
    title: "AI dalam penulisan akademik: alat bantu, bukan pengganti nalar",
    excerpt: "Pandangan tentang cara memakai AI secara bertanggung jawab saat menyusun argumen dan mengevaluasi sumber.",
    category: "Opini",
    author: "Nadia Salsabila",
    publishedAt: "2026-03-28",
    dateShort: "28/03/2026",
    dateLong: "28 Maret 2026",
    readTime: "7 menit baca"
  },
  {
    id: "webinar-workflow-paper",
    slug: "webinar-workflow-paper",
    title: "Webinar: membangun workflow paper dari ide sampai draft",
    excerpt: "Sesi pengantar untuk memahami alur kerja Makalah AI dan praktik menjaga kualitas output di setiap tahap.",
    category: "Event",
    author: "Tim Komunitas",
    publishedAt: "2026-03-20",
    dateShort: "20/03/2026",
    dateLong: "20 Maret 2026",
    readTime: "3 menit baca"
  },
  {
    id: "review-sumber-lebih-cepat",
    slug: "review-sumber-lebih-cepat",
    title: "Review sumber lebih cepat tanpa kehilangan konteks argumen",
    excerpt: "Cara menandai sumber penting, mencatat posisi kutipan, dan menjaga alur argumen tetap rapi saat bahan bacaan mulai banyak.",
    category: "Tutorial",
    author: "Dian Wicaksono",
    publishedAt: "2026-03-14",
    dateShort: "14/03/2026",
    dateLong: "14 Maret 2026",
    readTime: "6 menit baca"
  },
  {
    id: "catatan-rilis-workspace-akademik",
    slug: "catatan-rilis-workspace-akademik",
    title: "Catatan rilis: workspace akademik yang lebih mudah dipantau",
    excerpt: "Perubahan terbaru di workspace membantu Kamu melihat tahapan aktif, revisi terakhir, dan progres draft dengan lebih cepat.",
    category: "Update",
    author: "Tim Produk",
    publishedAt: "2026-03-08",
    dateShort: "08/03/2026",
    dateLong: "8 Maret 2026",
    readTime: "4 menit baca"
  },
  {
    id: "menyusun-outline-dengan-cepat",
    slug: "menyusun-outline-dengan-cepat",
    title: "Menyusun outline paper lebih cepat tanpa kehilangan arah bahasan",
    excerpt: "Langkah sederhana untuk memecah topik besar menjadi kerangka yang lebih fokus sebelum masuk ke penulisan draft.",
    category: "Tutorial",
    author: "Tia Maharani",
    publishedAt: "2026-03-01",
    dateShort: "01/03/2026",
    dateLong: "1 Maret 2026",
    readTime: "5 menit baca"
  },
  {
    id: "catatan-produk-sitasi",
    slug: "catatan-produk-sitasi",
    title: "Catatan produk: pembacaan sitasi kini lebih mudah dipantau",
    excerpt: "Pembaruan kecil yang membuat jejak referensi, kutipan, dan perpindahan argumen lebih mudah diikuti selama revisi.",
    category: "Update",
    author: "Tim Produk",
    publishedAt: "2026-02-24",
    dateShort: "24/02/2026",
    dateLong: "24 Februari 2026",
    readTime: "4 menit baca"
  },
  {
    id: "menghindari-judul-terlalu-lebar",
    slug: "menghindari-judul-terlalu-lebar",
    title: "Menghindari judul paper yang terlalu lebar sejak awal",
    excerpt: "Cara mengenali ruang lingkup yang terlalu luas, lalu mempersempitnya menjadi fokus riset yang lebih bisa ditulis.",
    category: "Tutorial",
    author: "Alya Febriani",
    publishedAt: "2026-02-17",
    dateShort: "17/02/2026",
    dateLong: "17 Februari 2026",
    readTime: "5 menit baca"
  },
  {
    id: "opini-transparansi-ai-akademik",
    slug: "opini-transparansi-ai-akademik",
    title: "Transparansi penggunaan AI lebih penting daripada sekadar lolos detector",
    excerpt: "Catatan opini tentang pentingnya jejak proses, tanggung jawab penulis, dan keterlacakan ketika AI dipakai dalam kerja akademik.",
    category: "Opini",
    author: "Tim Makalah AI",
    publishedAt: "2026-02-09",
    dateShort: "09/02/2026",
    dateLong: "9 Februari 2026",
    readTime: "6 menit baca"
  },
  {
    id: "membaca-gap-riset-lebih-jernih",
    slug: "membaca-gap-riset-lebih-jernih",
    title: "Membaca gap riset lebih jernih sebelum menulis argumen utama",
    excerpt: "Cara memilah temuan dari beberapa paper awal agar celah riset yang benar-benar penting tidak tertutup oleh detail kecil.",
    category: "Tutorial",
    author: "Rizky Ananda",
    publishedAt: "2026-02-02",
    dateShort: "02/02/2026",
    dateLong: "2 Februari 2026",
    readTime: "5 menit baca"
  },
  {
    id: "update-panel-revisi",
    slug: "update-panel-revisi",
    title: "Update: panel revisi kini menampilkan jejak perubahan lebih jelas",
    excerpt: "Pembenahan kecil di workspace untuk membantu Kamu membandingkan draft, catatan, dan perubahan terbaru dengan lebih cepat.",
    category: "Update",
    author: "Tim Produk",
    publishedAt: "2026-01-26",
    dateShort: "26/01/2026",
    dateLong: "26 Januari 2026",
    readTime: "4 menit baca"
  },
  {
    id: "event-klinik-paper-januari",
    slug: "event-klinik-paper-januari",
    title: "Klinik paper Januari: sesi tanya jawab tentang struktur argumen",
    excerpt: "Ringkasan sesi komunitas yang membahas kesalahan umum saat menyusun kerangka, menata referensi, dan menjaga fokus paper.",
    category: "Event",
    author: "Tim Komunitas",
    publishedAt: "2026-01-18",
    dateShort: "18/01/2026",
    dateLong: "18 Januari 2026",
    readTime: "3 menit baca"
  },
  {
    id: "opini-mengapa-outline-penting",
    slug: "opini-mengapa-outline-penting",
    title: "Mengapa outline sering lebih penting daripada paragraf pembuka yang bagus",
    excerpt: "Catatan opini tentang pentingnya struktur awal supaya penulisan tidak habis energi di kalimat pembuka tetapi kosong di argumen.",
    category: "Opini",
    author: "Tim Makalah AI",
    publishedAt: "2026-01-10",
    dateShort: "10/01/2026",
    dateLong: "10 Januari 2026",
    readTime: "6 menit baca"
  },
  {
    id: "menjaga-konsistensi-istilah-akademik",
    slug: "menjaga-konsistensi-istilah-akademik",
    title: "Menjaga konsistensi istilah akademik dari awal draft sampai final",
    excerpt: "Panduan singkat untuk merapikan istilah, definisi, dan pilihan kata agar paper terasa stabil saat dibaca dari awal sampai akhir.",
    category: "Tutorial",
    author: "Salsa Permata",
    publishedAt: "2026-01-03",
    dateShort: "03/01/2026",
    dateLong: "3 Januari 2026",
    readTime: "5 menit baca"
  },
  {
    id: "menyaring-referensi-sejak-awal",
    slug: "menyaring-referensi-sejak-awal",
    title: "Menyaring referensi sejak awal supaya daftar bacaan tidak melebar",
    excerpt: "Cara memilih sumber awal yang relevan agar proses membaca tidak habis di artikel yang sebenarnya tidak membantu argumen inti.",
    category: "Tutorial",
    author: "Rani Kurnia",
    publishedAt: "2025-12-28",
    dateShort: "28/12/2025",
    dateLong: "28 Desember 2025",
    readTime: "5 menit baca"
  },
  {
    id: "update-catatan-tepi-draft",
    slug: "update-catatan-tepi-draft",
    title: "Update: catatan tepi draft kini lebih ringkas saat membaca revisi",
    excerpt: "Perbaikan kecil di workspace untuk membantu Kamu membaca masukan revisi tanpa kehilangan fokus pada paragraf utama.",
    category: "Update",
    author: "Tim Produk",
    publishedAt: "2025-12-20",
    dateShort: "20/12/2025",
    dateLong: "20 Desember 2025",
    readTime: "4 menit baca"
  },
  {
    id: "opini-kapan-ai-harus-diam",
    slug: "opini-kapan-ai-harus-diam",
    title: "Kapan AI sebaiknya diam dan membiarkan penulis mengambil keputusan",
    excerpt: "Opini tentang batas yang sehat antara bantuan AI, intuisi akademik, dan keputusan akhir yang tetap harus dipegang penulis.",
    category: "Opini",
    author: "Tim Makalah AI",
    publishedAt: "2025-12-12",
    dateShort: "12/12/2025",
    dateLong: "12 Desember 2025",
    readTime: "6 menit baca"
  },
  {
    id: "event-review-outline-desember",
    slug: "event-review-outline-desember",
    title: "Sesi review outline Desember untuk topik yang belum terkunci",
    excerpt: "Ringkasan sesi komunitas yang membantu peserta mempersempit topik dan menata urutan pembahasan sebelum drafting dimulai.",
    category: "Event",
    author: "Tim Komunitas",
    publishedAt: "2025-12-05",
    dateShort: "05/12/2025",
    dateLong: "5 Desember 2025",
    readTime: "3 menit baca"
  },
  {
    id: "menulis-latar-belakang-tidak-bertele",
    slug: "menulis-latar-belakang-tidak-bertele",
    title: "Menulis latar belakang tanpa bertele-tele tetapi tetap cukup kuat",
    excerpt: "Panduan merapikan bagian pembuka agar cepat masuk ke masalah inti, tanpa kehilangan konteks yang dibutuhkan pembaca.",
    category: "Tutorial",
    author: "Fikri Mahesa",
    publishedAt: "2025-11-29",
    dateShort: "29/11/2025",
    dateLong: "29 November 2025",
    readTime: "5 menit baca"
  },
  {
    id: "update-ekspor-dokumen",
    slug: "update-ekspor-dokumen",
    title: "Update ekspor dokumen: struktur heading kini lebih stabil",
    excerpt: "Pembaruan pada hasil ekspor membantu menjaga hierarki heading dan daftar referensi tetap rapi saat dibuka di editor dokumen.",
    category: "Update",
    author: "Tim Produk",
    publishedAt: "2025-11-22",
    dateShort: "22/11/2025",
    dateLong: "22 November 2025",
    readTime: "4 menit baca"
  },
  {
    id: "opini-refrasa-bukan-kosmetik",
    slug: "opini-refrasa-bukan-kosmetik",
    title: "Refrasa bukan kosmetik: dia menentukan seberapa mudah argumen dipahami",
    excerpt: "Catatan tentang kenapa perapihan bahasa bukan tahap tambahan, melainkan bagian penting dari kualitas berpikir yang terbaca.",
    category: "Opini",
    author: "Nadia Salsabila",
    publishedAt: "2025-11-15",
    dateShort: "15/11/2025",
    dateLong: "15 November 2025",
    readTime: "6 menit baca"
  },
  {
    id: "memilih-kutipan-yang-benar-benar-perlu",
    slug: "memilih-kutipan-yang-benar-benar-perlu",
    title: "Memilih kutipan yang benar-benar perlu, bukan sekadar memperbanyak referensi",
    excerpt: "Cara memilih kutipan yang menopang argumen, bukan hanya menambah padat daftar pustaka tetapi lemah di substansi.",
    category: "Tutorial",
    author: "Aditama Putra",
    publishedAt: "2025-11-08",
    dateShort: "08/11/2025",
    dateLong: "8 November 2025",
    readTime: "5 menit baca"
  },
  {
    id: "event-bedah-paper-november",
    slug: "event-bedah-paper-november",
    title: "Bedah paper November: membaca struktur argumen dari draft peserta",
    excerpt: "Sesi komunitas yang membahas contoh draft nyata dan menyorot bagian mana yang perlu diperjelas sebelum masuk revisi akhir.",
    category: "Event",
    author: "Tim Komunitas",
    publishedAt: "2025-11-01",
    dateShort: "01/11/2025",
    dateLong: "1 November 2025",
    readTime: "3 menit baca"
  },
  {
    id: "menyusun-abstrak-belakangan",
    slug: "menyusun-abstrak-belakangan",
    title: "Kenapa abstrak sering lebih baik ditulis belakangan",
    excerpt: "Alasan praktis kenapa abstrak akan lebih kuat jika ditulis setelah struktur, hasil, dan posisi argumen benar-benar stabil.",
    category: "Tutorial",
    author: "Karina Lestari",
    publishedAt: "2025-10-25",
    dateShort: "25/10/2025",
    dateLong: "25 Oktober 2025",
    readTime: "5 menit baca"
  },
  {
    id: "update-lampiran-dan-catatan",
    slug: "update-lampiran-dan-catatan",
    title: "Update lampiran dan catatan kerja untuk riset yang lebih tertata",
    excerpt: "Perubahan minor di workspace yang membantu Kamu memisahkan bahan tambahan dari naskah utama agar revisi terasa lebih bersih.",
    category: "Update",
    author: "Tim Produk",
    publishedAt: "2025-10-18",
    dateShort: "18/10/2025",
    dateLong: "18 Oktober 2025",
    readTime: "4 menit baca"
  },
  {
    id: "opini-argumen-bukan-opini-pribadi",
    slug: "opini-argumen-bukan-opini-pribadi",
    title: "Argumen akademik bukan opini pribadi yang dipoles rapi",
    excerpt: "Opini tentang perbedaan antara keyakinan pribadi, posisi argumentatif, dan dukungan sumber yang membuat paper layak dipertahankan.",
    category: "Opini",
    author: "Tim Makalah AI",
    publishedAt: "2025-10-10",
    dateShort: "10/10/2025",
    dateLong: "10 Oktober 2025",
    readTime: "6 menit baca"
  },
  {
    id: "mengunci-batas-pembahasan",
    slug: "mengunci-batas-pembahasan",
    title: "Mengunci batas pembahasan sebelum drafting dimulai",
    excerpt: "Panduan singkat untuk menentukan apa yang masuk dan tidak masuk ke paper supaya drafting tidak melebar ke mana-mana.",
    category: "Tutorial",
    author: "Rizky Ananda",
    publishedAt: "2025-10-03",
    dateShort: "03/10/2025",
    dateLong: "3 Oktober 2025",
    readTime: "5 menit baca"
  },
  {
    id: "event-klinik-sitasi-oktober",
    slug: "event-klinik-sitasi-oktober",
    title: "Klinik sitasi Oktober: merapikan referensi dan kutipan yang kacau",
    excerpt: "Ringkasan sesi pendampingan komunitas untuk membereskan format sitasi dan hubungan antar sumber dalam draft yang sedang tumbuh.",
    category: "Event",
    author: "Tim Komunitas",
    publishedAt: "2025-09-26",
    dateShort: "26/09/2025",
    dateLong: "26 September 2025",
    readTime: "3 menit baca"
  },
  {
    id: "update-penanda-progres",
    slug: "update-penanda-progres",
    title: "Update penanda progres untuk membaca tahap aktif lebih cepat",
    excerpt: "Perbaikan tampilan kecil yang membuat status kerja, revisi terakhir, dan tahap berjalan lebih mudah dilihat sepintas.",
    category: "Update",
    author: "Tim Produk",
    publishedAt: "2025-09-19",
    dateShort: "19/09/2025",
    dateLong: "19 September 2025",
    readTime: "4 menit baca"
  },
  {
    id: "menjaga-alur-antar-paragraf",
    slug: "menjaga-alur-antar-paragraf",
    title: "Menjaga alur antar paragraf supaya pembaca tidak kehilangan arah",
    excerpt: "Cara merapikan transisi antar bagian agar pembaca bisa mengikuti gerak argumen tanpa merasa loncat dari satu ide ke ide lain.",
    category: "Tutorial",
    author: "Dian Wicaksono",
    publishedAt: "2025-09-12",
    dateShort: "12/09/2025",
    dateLong: "12 September 2025",
    readTime: "5 menit baca"
  }
];

const BLOG_PAGE_SIZE = 6;
const BLOG_PAGE_COUNT = 5;
const BLOG_ARTICLE_ROUTE = "#/blog/workflow-bertahap-untuk-paper";

const BlogCategoryThumb = ({ category, title }) => (
  <div className={`blog-feed-thumb blog-feed-thumb-${category.toLowerCase()}`} aria-hidden="true">
    <span>{category.toUpperCase()}</span>
    <strong>{title.slice(0, 28).toUpperCase()}</strong>
  </div>
);

const BlogFeaturedCard = ({ post }) => (
  <article className="blog-featured-card">
    <div className="blog-featured-copy">
      <div className="blog-featured-topline">
        <span>/ {post.category.toUpperCase()} | {post.dateShort}</span>
      </div>
      <a href={BLOG_ARTICLE_ROUTE} className="blog-featured-link" aria-label={`Buka artikel ${post.title}`}>
        <h2>{post.title}</h2>
      </a>
      <p>{post.excerpt}</p>
    </div>

    <a href={BLOG_ARTICLE_ROUTE} className="blog-featured-art" aria-label={`Buka artikel ${post.title}`}>
      <BlogCategoryThumb category={post.category} title={post.title} />
    </a>
  </article>
);

const BlogStoryCard = ({ post }) => (
  <article className="blog-story-card">
    <a href="#/blog" className="blog-story-thumb-link" aria-label={`Buka artikel ${post.title}`}>
      <BlogCategoryThumb category={post.category} title={post.title} />
    </a>
    <div className="blog-story-body">
      <div className="blog-story-meta">
        <span>/ {post.category.toUpperCase()} | {post.dateShort}</span>
      </div>
      <a href="#/blog" className="blog-story-title-link" aria-label={`Buka artikel ${post.title}`}>
        <strong>{post.title}</strong>
      </a>
      <p>{post.excerpt}</p>
    </div>
  </article>
);

const BlogNewsletterBand = () => (
  <section className="blog-newsletter-band">
    <div className="eyebrow">Newsletter</div>
    <div className="blog-newsletter-grid">
      <div className="blog-newsletter-copy">
        <h2>Tetap terhubung dengan update, panduan, dan catatan produk.</h2>
        <p>Dapatkan ringkasan tulisan terbaru Makalah AI langsung di email Kamu, tanpa harus memeriksa halaman ini satu per satu.</p>
      </div>
      <div className="blog-newsletter-form">
        <input type="email" placeholder="Alamat email..." aria-label="Alamat email" />
        <button type="button" className="btn btn-primary blog-newsletter-button">Gabung</button>
      </div>
    </div>
  </section>
);

const BlogPagination = ({ currentPage, onPageChange }) => (
  <nav className="blog-pagination" aria-label="Paginasi blog">
    {Array.from({ length: BLOG_PAGE_COUNT }, (_, index) => {
      const page = index + 1;

      return (
        <button
          key={page}
          type="button"
          className={`blog-pagination-button${currentPage === page ? " active" : ""}`}
          onClick={() => onPageChange(page)}
          aria-current={currentPage === page ? "page" : undefined}
        >
          {page}
        </button>
      );
    })}
  </nav>
);

const BlogPage = () => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const featuredPost = BLOG_POSTS[0];
  const feedPosts = BLOG_POSTS.filter((post) => post.id !== featuredPost.id);
  const currentFeedPosts = feedPosts.slice((currentPage - 1) * BLOG_PAGE_SIZE, currentPage * BLOG_PAGE_SIZE);

  return (
    <section className="section-frame blog-marketing-page">
      <div className="hero-ornament" />
      <div className="container">
        {currentPage === 1 ? (
          <Reveal delay={1}>
            <BlogFeaturedCard post={featuredPost} />
          </Reveal>
        ) : null}

        <Reveal delay={1}>
          <div className="blog-feed-grid">
            {currentFeedPosts.map((post) => (
              <BlogStoryCard key={post.id} post={post} />
            ))}
          </div>
        </Reveal>

        <Reveal delay={1}>
          <BlogPagination currentPage={currentPage} onPageChange={setCurrentPage} />
        </Reveal>

        <Reveal delay={1}>
          <BlogNewsletterBand />
        </Reveal>
      </div>
    </section>
  );
};

Object.assign(window, {
  BLOG_POSTS,
  BLOG_ARTICLE_ROUTE,
  BlogCategoryThumb,
  BlogFeaturedCard,
  BlogStoryCard,
  BlogPagination,
  BlogNewsletterBand,
  BlogPage,
});

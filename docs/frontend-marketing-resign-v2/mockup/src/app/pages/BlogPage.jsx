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
  }
];

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
      <a href="#/blog" className="blog-featured-link" aria-label={`Buka artikel ${post.title}`}>
        <h2>{post.title}</h2>
      </a>
      <p>{post.excerpt}</p>
    </div>

    <a href="#/blog" className="blog-featured-art" aria-label={`Buka artikel ${post.title}`}>
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
      <div>
        <h2>Tetap terhubung dengan update, panduan, dan catatan produk.</h2>
        <p>Dapatkan ringkasan tulisan terbaru Makalah AI langsung di email Kamu, tanpa harus memeriksa halaman ini satu per satu.</p>
      </div>
      <div className="blog-newsletter-form">
        <input type="email" placeholder="Alamat email..." aria-label="Alamat email" />
        <button type="button" className="btn btn-primary">Gabung</button>
      </div>
    </div>
  </section>
);

const BlogPage = () => {
  const featuredPost = BLOG_POSTS[0];
  const feedPosts = BLOG_POSTS.filter((post) => post.id !== featuredPost.id);

  return (
    <section className="section-frame blog-marketing-page">
      <div className="container">
        <Reveal delay={1}>
          <BlogFeaturedCard post={featuredPost} />
        </Reveal>

        <Reveal delay={1}>
          <div className="blog-feed-grid">
            {feedPosts.map((post) => (
              <BlogStoryCard key={post.id} post={post} />
            ))}
          </div>
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
  BlogCategoryThumb,
  BlogFeaturedCard,
  BlogStoryCard,
  BlogNewsletterBand,
  BlogPage,
});

/* Static blog article page mock */

const BLOG_ARTICLE = {
  id: "workflow-bertahap-untuk-paper",
  slug: "workflow-bertahap-untuk-paper",
  category: "Tutorial",
  title: "Menulis paper lebih terarah dengan workflow bertahap",
  excerpt: "Panduan praktis untuk memakai Makalah AI dari pemilihan topik, penyusunan outline, sampai perapihan draft akhir.",
  author: "Tim Makalah AI",
  publishedAt: "18 April 2026",
  updatedAt: "21 April 2026",
  readTime: "8 menit baca",
  sections: [
    {
      heading: "Mulai dari pertanyaan, bukan dari paragraf pembuka",
      paragraphs: [
        "Banyak paper terasa berat sejak awal karena penulis buru-buru ingin menghasilkan paragraf yang rapi, padahal pertanyaan intinya sendiri belum cukup tajam. Akibatnya, draft terlihat bergerak tetapi sebenarnya belum punya arah pembahasan yang stabil.",
        "Workflow bertahap membantu Kamu menahan dorongan itu. Langkah pertama bukan menulis kalimat yang terdengar akademik, melainkan memastikan apa persoalan yang sedang dibahas, kenapa persoalan itu penting, dan batas mana yang tidak akan dibuka."
      ]
    },
    {
      heading: "Kerangka awal dipakai untuk mengunci fokus",
      paragraphs: [
        "Sesudah pertanyaan riset cukup jelas, kerangka awal dipakai untuk melihat apakah urutan bahasan sudah masuk akal. Di tahap ini, targetnya bukan membuat outline yang sempurna, tetapi memastikan setiap bagian punya fungsi yang jelas terhadap argumen utama.",
        "Makalah AI lebih berguna ketika dipakai sebagai sparring partner pada tahap ini. Kamu bisa mengecek apakah sebuah subbagian terlalu melebar, apakah ada lompatan logika, atau apakah sebuah klaim sebenarnya belum punya dukungan sumber yang cukup."
      ]
    },
    {
      heading: "Masuk ke drafting setelah bahan benar-benar siap",
      paragraphs: [
        "Drafting yang baik biasanya terasa lebih ringan karena sebagian besar keputusan besar sudah dibuat sebelumnya. Kamu tidak lagi bingung harus membahas apa, tetapi tinggal memindahkan struktur yang sudah stabil menjadi prosa yang enak dibaca dan cukup presisi.",
        "Di titik ini, workflow bertahap menjaga supaya tiap revisi tetap terhubung dengan tujuan awal paper. Revisi tidak berubah menjadi tumpukan edit acak, melainkan rangkaian keputusan yang masih bisa ditelusuri alasan dan dampaknya."
      ]
    },
    {
      heading: "Tahap akhir bukan sekadar merapikan bahasa",
      paragraphs: [
        "Perapihan akhir memang menyentuh struktur kalimat, istilah, dan ritme paragraf, tetapi fungsinya bukan kosmetik. Tahap ini penting karena pembaca hanya bisa menangkap kualitas berpikir sejauh kualitas penulisan memungkinkan.",
        "Kalau istilah berubah-ubah, transisi antarbagian patah, atau paragraf terlalu padat, argumen yang sebenarnya kuat bisa terasa kabur. Karena itu, langkah akhir perlu diperlakukan sebagai tahap editorial yang serius, bukan pekerjaan finishing sambil lalu."
      ]
    }
  ]
};

const BlogArticlePage = () => (
  <section className="section-frame blog-article-page">
    <div className="container">
      <Reveal>
        <div className="blog-article-shell">
          <div className="blog-article-head">
            <a href="#/blog" className="blog-article-back">
              <i className="iconoir-nav-arrow-left" aria-hidden="true" />
              <span>Kembali ke blog</span>
            </a>
            <div className="blog-article-meta">
              <span>/ {BLOG_ARTICLE.category.toUpperCase()}</span>
              <span>{BLOG_ARTICLE.publishedAt}</span>
              <span>{BLOG_ARTICLE.readTime}</span>
            </div>
            <h1>{BLOG_ARTICLE.title}</h1>
            <p className="blog-article-excerpt">{BLOG_ARTICLE.excerpt}</p>
            <div className="blog-article-byline">
              <div>
                <strong>{BLOG_ARTICLE.author}</strong>
                <span>Diperbarui {BLOG_ARTICLE.updatedAt}</span>
              </div>
            </div>
          </div>

          <div className="blog-article-cover">
            <BlogCategoryThumb category={BLOG_ARTICLE.category} title={BLOG_ARTICLE.title} />
          </div>

          <article className="blog-article-body">
            {BLOG_ARTICLE.sections.map((section) => (
              <section key={section.heading} className="blog-article-section">
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
          </article>

          <div className="blog-article-footer">
            <div className="blog-article-footer-label">Baca Juga</div>
            <div className="blog-article-footer-grid">
              <a href="#/blog" className="blog-article-footer-card">
                <div className="blog-article-footer-meta">
                  <span>/ TUTORIAL</span>
                </div>
                <strong>Menentukan topik riset tanpa mulai dari judul final</strong>
                <p>Mulai dari pertanyaan inti, batas pembahasan, dan tujuan akademik sebelum mengunci judul paper.</p>
              </a>
              <a href="#/blog" className="blog-article-footer-card">
                <div className="blog-article-footer-meta">
                  <span>/ UPDATE</span>
                </div>
                <strong>Update Refrasa: perapihan kalimat untuk draft akhir</strong>
                <p>Refrasa membantu Kamu merapikan bahasa, menjaga konsistensi istilah, dan membuat paragraf lebih mudah dibaca.</p>
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

Object.assign(window, {
  BLOG_ARTICLE,
  BlogArticlePage,
});

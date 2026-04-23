/* Static blog landing page mock */

const BLOG_CATEGORY_OPTIONS = ["Semua", "Update", "Tutorial", "Opini", "Event"];
const BLOG_TIME_OPTIONS = [
  { id: "all", label: "Semua" },
  { id: "7d", label: "7 hari" },
  { id: "30d", label: "30 hari" },
  { id: "90d", label: "90 hari" },
  { id: "year", label: "Tahun ini" }
];
const BLOG_SORT_OPTIONS = [
  { id: "newest", label: "Terbaru" },
  { id: "oldest", label: "Terlama" }
];

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
  }
];

const getBlogCategoryCounts = (posts) => (
  posts.reduce((counts, post) => {
    counts.Semua += 1;
    counts[post.category] = (counts[post.category] || 0) + 1;
    return counts;
  }, { Semua: 0, Update: 0, Tutorial: 0, Opini: 0, Event: 0 })
);

const isBlogPostInTimeRange = (post, range) => {
  if (range === "all") return true;

  const publishedAt = new Date(`${post.publishedAt}T00:00:00`).getTime();
  const now = new Date("2026-04-23T00:00:00").getTime();

  if (range === "7d") return publishedAt >= now - 7 * 24 * 60 * 60 * 1000;
  if (range === "30d") return publishedAt >= now - 30 * 24 * 60 * 60 * 1000;
  if (range === "90d") return publishedAt >= now - 90 * 24 * 60 * 60 * 1000;

  return new Date(`${post.publishedAt}T00:00:00`).getFullYear() === 2026;
};

const BlogCategoryThumb = ({ category, title }) => (
  <div className={`blog-spotlight-thumb blog-spotlight-thumb-${category.toLowerCase()}`} aria-hidden="true">
    <span>{category.toUpperCase()}</span>
    <strong>{title.slice(0, 28).toUpperCase()}</strong>
  </div>
);

const BlogControlPanel = ({
  searchQuery,
  onSearchQueryChange,
  categoryFilter,
  onCategoryFilterChange,
  timeRangeFilter,
  onTimeRangeFilterChange,
  sortFilter,
  onSortFilterChange,
  categoryCounts
}) => (
  <div className="blog-control-panel">
    <label className="blog-search-field">
      <i className="iconoir-search" aria-hidden="true" />
      <input
        type="search"
        value={searchQuery}
        placeholder="Cari tulisan, topik, atau penulis..."
        onChange={(event) => onSearchQueryChange(event.target.value)}
      />
    </label>

    <div className="blog-chip-row">
      {BLOG_CATEGORY_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          className={categoryFilter === option ? "active" : ""}
          onClick={() => onCategoryFilterChange(option)}
        >
          <span>{option}</span>
          <b>{categoryCounts[option] || 0}</b>
        </button>
      ))}
    </div>

    <div className="blog-sort-row">
      <div className="blog-mini-group">
        <span>Waktu</span>
        <div className="blog-mini-toggle">
          {BLOG_TIME_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={timeRangeFilter === option.id ? "active" : ""}
              onClick={() => onTimeRangeFilterChange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="blog-mini-group">
        <span>Urutkan</span>
        <div className="blog-mini-toggle">
          {BLOG_SORT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={sortFilter === option.id ? "active" : ""}
              onClick={() => onSortFilterChange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const BlogFeaturedCard = ({ post }) => (
  <article className="blog-featured-card">
    <div className="blog-featured-copy">
      <div className="eyebrow">Headline blog</div>
      <a href="#/blog" className="blog-featured-link" aria-label={`Buka artikel ${post.title}`}>
        <h2>{post.title}</h2>
      </a>
      <p>{post.excerpt}</p>

      <div className="blog-featured-meta">
        <div>
          <span>/ {post.category.toUpperCase()}</span>
          <strong>{post.author}</strong>
        </div>
        <div>
          <span>{post.dateLong}</span>
          <strong>{post.readTime}</strong>
        </div>
        <a href="#/blog" className="btn btn-primary">
          Baca <Arrow />
        </a>
      </div>
    </div>

    <a href="#/blog" className="blog-featured-art" aria-label={`Buka artikel ${post.title}`}>
      <BlogCategoryThumb category={post.category} title={post.title} />
    </a>
  </article>
);

const BlogStoryCard = ({ post, isExpanded, onToggle }) => (
  <article className={`blog-story-card${isExpanded ? " open" : ""}`}>
    <button type="button" className="blog-story-head" aria-expanded={isExpanded} onClick={onToggle}>
      <BlogCategoryThumb category={post.category} title={post.title} />
      <span className="blog-story-copy">
        <small>/ {post.category.toUpperCase()} | {post.dateShort}</small>
        <strong>{post.title}</strong>
        <em>{post.excerpt}</em>
      </span>
      <span className="blog-story-toggle" aria-hidden="true">{isExpanded ? "−" : "+"}</span>
    </button>

    {isExpanded ? (
      <div className="blog-story-body">
        <p>{post.excerpt}</p>
        <div className="blog-featured-meta">
          <div>
            <span>/ {post.category.toUpperCase()}</span>
            <strong>{post.author}</strong>
          </div>
          <div>
            <span>{post.dateLong}</span>
            <strong>{post.readTime}</strong>
          </div>
          <a href="#/blog" className="btn btn-ghost">
            Baca <Arrow />
          </a>
        </div>
      </div>
    ) : null}
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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("Semua");
  const [timeRangeFilter, setTimeRangeFilter] = React.useState("all");
  const [sortFilter, setSortFilter] = React.useState("newest");
  const [expandedRowKey, setExpandedRowKey] = React.useState("post-meningkatkan-judul");
  const [mobileControlsOpen, setMobileControlsOpen] = React.useState(false);

  const categoryCounts = React.useMemo(() => getBlogCategoryCounts(BLOG_POSTS), []);

  const filteredPosts = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = BLOG_POSTS.filter((post) => {
      if (categoryFilter !== "Semua" && post.category !== categoryFilter) return false;
      if (!isBlogPostInTimeRange(post, timeRangeFilter)) return false;
      if (!query) return true;

      return [post.title, post.excerpt, post.author, post.category]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

    return [...filtered].sort((a, b) => {
      const first = new Date(`${a.publishedAt}T00:00:00`).getTime();
      const second = new Date(`${b.publishedAt}T00:00:00`).getTime();
      return sortFilter === "newest" ? second - first : first - second;
    });
  }, [categoryFilter, searchQuery, sortFilter, timeRangeFilter]);

  const featuredPost = BLOG_POSTS[0];
  const feedPosts = filteredPosts.filter((post) => post.id !== featuredPost.id);
  const mobileCount = feedPosts.length + 1;

  const toggleRow = (rowKey) => {
    setExpandedRowKey((currentKey) => (currentKey === rowKey ? null : rowKey));
  };

  const controlProps = {
    searchQuery,
    onSearchQueryChange: setSearchQuery,
    categoryFilter,
    onCategoryFilterChange: setCategoryFilter,
    timeRangeFilter,
    onTimeRangeFilterChange: setTimeRangeFilter,
    sortFilter,
    onSortFilterChange: setSortFilter,
    categoryCounts
  };

  return (
    <section className="section-frame blog-marketing-page">
      <div className="container">
        <Reveal>
          <PageSplitHero
            className="blog-hero"
            eyebrow="/ blog"
            title={<>Tulisan, update, dan opini yang tetap dekat dengan workflow <em>Makalah AI</em></>}
            description="Halaman ini merangkum tulisan terbaru, catatan produk, dan panduan kerja yang relevan untuk Kamu yang sedang menyusun paper."
            titleClassName="blog-hero-title"
            descriptionClassName="blog-hero-desc"
            rightClassName="blog-hero-side"
          />
        </Reveal>

        <Reveal delay={1}>
          <div className="blog-hero-grid">
            <div className="blog-hero-panel">
              <span className="blog-kicker">Ringkasan isi</span>
              <div>
                <strong>{BLOG_POSTS.length}</strong>
                <span>artikel statis yang disusun dari topik utama blog saat ini.</span>
              </div>
            </div>
            <div className="blog-hero-panel blog-hero-panel-soft">
              <span className="blog-kicker">Arah baca</span>
              <div>
                <strong>Featured first</strong>
                <span>Hero menonjolkan satu tulisan utama, lalu feed turun ke tulisan yang lebih pendek dan mudah dipindai.</span>
              </div>
            </div>
            <div className="blog-hero-panel blog-hero-panel-accent">
              <span className="blog-kicker">Kontrol</span>
              <div>
                <strong>Filter ringan</strong>
                <span>Pencarian dan penyaringan tetap ada, tetapi tampil sebagai kontrol pendamping, bukan inti layout.</span>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={1}>
          <div className="blog-controls-shell">
            <div className="blog-controls-head">
              <div>
                <div className="eyebrow">Filter konten</div>
                <h3>Gunakan kontrol ini kalau Kamu ingin menyaring tulisan tertentu.</h3>
              </div>
              <button
                type="button"
                className={mobileControlsOpen ? "blog-mobile-toggle active" : "blog-mobile-toggle"}
                aria-expanded={mobileControlsOpen}
                onClick={() => setMobileControlsOpen(!mobileControlsOpen)}
              >
                <i className={`iconoir-${mobileControlsOpen ? "xmark" : "filter-list"}`} aria-hidden="true" />
                Filter
              </button>
            </div>

            <div className="blog-controls-desktop">
              <BlogControlPanel {...controlProps} />
            </div>

            {mobileControlsOpen ? (
              <div className="blog-controls-mobile">
                <BlogControlPanel {...controlProps} />
              </div>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={1}>
          <BlogFeaturedCard post={featuredPost} />
        </Reveal>

        <Reveal delay={1}>
          <div className="blog-feed-header">
            <div>
              <div className="eyebrow">Feed</div>
              <h2>{mobileCount} tulisan yang bisa Kamu pindai cepat.</h2>
            </div>
            <p>Daftar ini tetap statis, tapi strukturnya dibuat supaya mudah dipakai sebagai acuan visual untuk halaman marketing lain.</p>
          </div>

          <div className="blog-feed-grid">
            {feedPosts.length ? (
              feedPosts.map((post) => (
                <BlogStoryCard
                  key={post.id}
                  post={post}
                  isExpanded={expandedRowKey === `post-${post.id}`}
                  onToggle={() => toggleRow(`post-${post.id}`)}
                />
              ))
            ) : (
              <div className="blog-empty-state">
                <div><i className="iconoir-search" aria-hidden="true" /></div>
                <h3>Konten Tidak Ditemukan</h3>
                <p>Coba ubah kata kunci atau kombinasi filter.</p>
              </div>
            )}
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
  BLOG_CATEGORY_OPTIONS,
  BLOG_TIME_OPTIONS,
  BLOG_SORT_OPTIONS,
  BLOG_POSTS,
  BlogCategoryThumb,
  BlogControlPanel,
  BlogFeaturedCard,
  BlogStoryCard,
  BlogNewsletterBand,
  BlogPage,
  getBlogCategoryCounts,
  isBlogPostInTimeRange
});

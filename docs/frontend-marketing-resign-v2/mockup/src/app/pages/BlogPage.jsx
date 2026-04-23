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
  <div className={`blog-thumb blog-thumb-${category.toLowerCase()}`} aria-hidden="true">
    <span>{category.toUpperCase()}</span>
    <strong>{title.slice(0, 24).toUpperCase()}</strong>
  </div>
);

const BlogFiltersPanel = ({
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
  <div className="blog-filter-panel">
    <div className="blog-filter-group">
      <p>Cari Konten</p>
      <label className="blog-search">
        <i className="iconoir-search" aria-hidden="true" />
        <input
          type="search"
          value={searchQuery}
          placeholder="Cari..."
          onChange={(event) => onSearchQueryChange(event.target.value)}
        />
      </label>
    </div>

    <div className="blog-filter-group">
      <p>Kategori</p>
      <div className="blog-filter-list">
        {BLOG_CATEGORY_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={categoryFilter === option ? "active" : ""}
            onClick={() => onCategoryFilterChange(option)}
          >
            <span>{option}</span>
            <span>{categoryCounts[option] || 0}</span>
          </button>
        ))}
      </div>
    </div>

    <div className="blog-filter-group">
      <p>Waktu</p>
      <div className="blog-filter-grid">
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

    <div className="blog-filter-group">
      <p>Urutkan</p>
      <div className="blog-filter-grid">
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
);

const BlogHeadlineSection = ({ post }) => (
  <article className="blog-headline-card">
    <div className="blog-badge">Headline</div>
    <div className="blog-headline-main">
      <a href="#/blog" className="blog-headline-thumb" aria-label={`Buka artikel ${post.title}`}>
        <BlogCategoryThumb category={post.category} title={post.title} />
      </a>
      <div className="blog-headline-copy">
        <a href="#/blog" aria-label={`Buka artikel ${post.title}`}>
          <h1>{post.title}</h1>
        </a>
        <p>{post.excerpt}</p>
      </div>
    </div>
    <div className="blog-meta-panel">
      <div>
        <span>/ {post.category.toUpperCase()}</span>
        <strong>{post.author}</strong>
      </div>
      <div>
        <strong>{post.dateLong}</strong>
        <span>{post.readTime}</span>
      </div>
      <a href="#/blog" className="btn btn-primary">
        Baca <Arrow />
      </a>
    </div>
  </article>
);

const BlogFeedSection = ({ posts, expandedRowKey, onExpandRow, onToggleRow }) => {
  if (!posts.length) {
    return (
      <div className="blog-empty-state">
        <div><i className="iconoir-search" aria-hidden="true" /></div>
        <h3>Konten Tidak Ditemukan</h3>
        <p>Coba ubah kata kunci atau kombinasi filter.</p>
      </div>
    );
  }

  return (
    <div className="blog-feed-card">
      {posts.map((post) => {
        const rowKey = `post-${post.id}`;
        const isExpanded = expandedRowKey === rowKey;

        return (
          <article key={post.id} className={isExpanded ? "blog-feed-row open" : "blog-feed-row"}>
            <div className="blog-feed-summary">
              <button
                type="button"
                className="blog-row-main"
                aria-expanded={isExpanded}
                onClick={() => onExpandRow(rowKey)}
              >
                <BlogCategoryThumb category={post.category} title={post.title} />
                <span>
                  <small>/ {post.category.toUpperCase()} | {post.dateShort}</small>
                  <strong>{post.title}</strong>
                  <em>{post.excerpt}</em>
                </span>
              </button>
              <button
                type="button"
                className="blog-row-toggle"
                aria-label={isExpanded ? "Tutup detail artikel" : "Buka detail artikel"}
                onClick={() => onToggleRow(rowKey)}
              >
                {isExpanded ? "-" : "+"}
              </button>
            </div>

            {isExpanded ? (
              <div className="blog-feed-detail">
                <p>{post.excerpt}</p>
                <div className="blog-meta-panel">
                  <div>
                    <span>/ {post.category.toUpperCase()}</span>
                    <strong>{post.author}</strong>
                  </div>
                  <div>
                    <strong>{post.dateLong}</strong>
                    <span>{post.readTime}</span>
                  </div>
                  <a href="#/blog" className="btn btn-ghost">
                    Baca <Arrow />
                  </a>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
};

const BlogNewsletterSection = () => (
  <section className="blog-newsletter">
    <h2>Tetap Terhubung</h2>
    <p>Dapatkan update terbaru, panduan penulisan, dan catatan produk Makalah AI langsung di email Kamu.</p>
    <div>
      <input type="email" placeholder="Alamat email..." aria-label="Alamat email" />
      <button type="button" className="btn btn-primary">Gabung</button>
    </div>
  </section>
);

const BlogPage = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("Semua");
  const [timeRangeFilter, setTimeRangeFilter] = React.useState("all");
  const [sortFilter, setSortFilter] = React.useState("newest");
  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false);
  const [expandedRowKey, setExpandedRowKey] = React.useState("post-menentukan-topik-riset");

  const headlinePost = BLOG_POSTS[0];
  const categoryCounts = React.useMemo(() => getBlogCategoryCounts(BLOG_POSTS), []);

  const feedPosts = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = BLOG_POSTS
      .filter((post) => post.id !== headlinePost.id)
      .filter((post) => categoryFilter === "Semua" || post.category === categoryFilter)
      .filter((post) => isBlogPostInTimeRange(post, timeRangeFilter))
      .filter((post) => {
        if (!query) return true;
        return [post.title, post.excerpt, post.author, post.category].join(" ").toLowerCase().includes(query);
      });

    return [...filtered].sort((a, b) => {
      const first = new Date(`${a.publishedAt}T00:00:00`).getTime();
      const second = new Date(`${b.publishedAt}T00:00:00`).getTime();
      return sortFilter === "newest" ? second - first : first - second;
    });
  }, [headlinePost.id, searchQuery, categoryFilter, timeRangeFilter, sortFilter]);

  const toggleRow = (rowKey) => {
    setExpandedRowKey((currentKey) => currentKey === rowKey ? null : rowKey);
  };

  const filterProps = {
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
    <section className="section blog-page">
      <div className="container">
        <div className="blog-mobile-bar">
          <span>{feedPosts.length} konten</span>
          <button
            type="button"
            className={mobileFilterOpen ? "active" : ""}
            aria-expanded={mobileFilterOpen}
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          >
            <i className={`iconoir-${mobileFilterOpen ? "xmark" : "filter-list"}`} aria-hidden="true" />
            Filter
          </button>
        </div>

        {mobileFilterOpen ? (
          <div className="blog-mobile-filter">
            <BlogFiltersPanel {...filterProps} />
          </div>
        ) : null}

        <div className="blog-page-layout">
          <aside className="blog-sidebar" aria-label="Filter konten blog">
            <BlogFiltersPanel {...filterProps} />
          </aside>

          <div className="blog-content">
            <BlogHeadlineSection post={headlinePost} />
            <p className="blog-count">{feedPosts.length} konten</p>
            <BlogFeedSection
              posts={feedPosts}
              expandedRowKey={expandedRowKey}
              onExpandRow={setExpandedRowKey}
              onToggleRow={toggleRow}
            />
            <BlogNewsletterSection />
          </div>
        </div>
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
  BlogFiltersPanel,
  BlogHeadlineSection,
  BlogFeedSection,
  BlogNewsletterSection,
  BlogPage,
  getBlogCategoryCounts,
  isBlogPostInTimeRange
});

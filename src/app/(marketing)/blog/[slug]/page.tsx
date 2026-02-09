import { BlogArticlePage } from "@/components/marketing/blog/BlogArticlePage"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function BlogArticleRoute({ params }: PageProps) {
  const { slug } = await params
  return <BlogArticlePage slug={slug} />
}

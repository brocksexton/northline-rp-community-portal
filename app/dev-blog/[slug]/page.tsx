import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildPageMetadata, cleanMetaText } from '@/lib/embed-metadata';
import { getDevBlogPost, getDevBlogPosts } from '@/lib/dev-blog';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

function formatPostDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Undated';
  return date.toLocaleDateString([], { dateStyle: 'long' });
}

export async function generateStaticParams() {
  const posts = await getDevBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const post = await getDevBlogPost(slug);
  return buildPageMetadata({
    title: post?.title || 'Dev Blog Update',
    description: cleanMetaText(post?.excerpt || 'Northline RP portal release notes and development update.', 180),
    path: `/dev-blog/${encodeURIComponent(slug)}`,
  });
}

export default async function DevBlogPostPage({ params }: Params) {
  if (!(await isSiteFeatureEnabled('devBlog'))) notFound();
  const { slug } = await params;
  const post = await getDevBlogPost(slug);
  if (!post) notFound();

  const posts = await getDevBlogPosts();
  const currentIndex = posts.findIndex((item) => item.slug === post.slug);
  const newer = currentIndex > 0 ? posts[currentIndex - 1] : null;
  const older = currentIndex >= 0 && currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;

  return (
    <main className="page-shell dev-blog-post-page">
      <Link className="dev-blog-back-link" href="/dev-blog">← Back to dev blog</Link>

      <article className="dev-blog-post-shell">
        <header className="dev-blog-post-header">
          <span className="nl-kicker"><i /> Release notes</span>
          <h1>{post.title}</h1>
          <div className="dev-blog-post-meta">
            <span>{formatPostDate(post.date)}</span>
            {post.version ? <span>v{post.version}</span> : null}
          </div>
        </header>

        <div className="dev-blog-markdown" dangerouslySetInnerHTML={{ __html: post.html }} />
      </article>

      <nav className="dev-blog-post-nav" aria-label="Adjacent dev blog posts">
        {newer ? <Link href={`/dev-blog/${newer.slug}`}><span>Newer</span><strong>{newer.title}</strong></Link> : <span />}
        {older ? <Link href={`/dev-blog/${older.slug}`}><span>Older</span><strong>{older.title}</strong></Link> : <span />}
      </nav>
    </main>
  );
}

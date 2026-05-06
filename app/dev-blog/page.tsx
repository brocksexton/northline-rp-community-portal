import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { getDevBlogPosts } from '@/lib/dev-blog';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';

export const dynamic = 'force-dynamic';

function formatPostDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Undated';
  return date.toLocaleDateString([], { dateStyle: 'long' });
}

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Dev Blog',
    description: 'Northline RP portal release notes, development updates, and patch history.',
    path: '/dev-blog',
  });
}

export default async function DevBlogPage() {
  if (!(await isSiteFeatureEnabled('devBlog'))) notFound();
  const posts = await getDevBlogPosts();
  const latest = posts[0] ?? null;

  return (
    <main className="page-shell dev-blog-page">
      <section className="dev-blog-hero">
        <div>
          <span className="nl-kicker"><i /> Dev Blog</span>
          <h1>Release notes and build updates</h1>
          <p>Every portal release note is now treated as a dated blog post, so staff and players can follow what changed without digging through files.</p>
        </div>
        <aside className="dev-blog-hero-card">
          <span>Latest release</span>
          <strong>{latest?.version ? `v${latest.version}` : 'No posts yet'}</strong>
          <small>{latest ? formatPostDate(latest.date) : 'Release notes will appear here once added.'}</small>
        </aside>
      </section>

      <section className="dev-blog-toolbar">
        <div><strong>{posts.length}</strong><span>published update{posts.length === 1 ? '' : 's'}</span></div>
        <p>Release notes are loaded from <code>content/dev-blog</code>.</p>
      </section>

      {posts.length ? (
        <section className="dev-blog-grid" aria-label="Dev blog posts">
          {posts.map((post) => (
            <article className="dev-blog-card" key={post.slug}>
              <div className="dev-blog-card-topline">
                <span>{formatPostDate(post.date)}</span>
                {post.version ? <b>v{post.version}</b> : null}
              </div>
              <h2><Link href={`/dev-blog/${post.slug}`}>{post.title}</Link></h2>
              <p>{post.excerpt || 'Read the full release notes for this portal update.'}</p>
              <Link className="dev-blog-read-link" href={`/dev-blog/${post.slug}`}>Read update <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-card dev-blog-empty"><strong>No dev blog posts yet.</strong><p>Add markdown files to <code>content/dev-blog</code> to publish updates.</p></section>
      )}
    </main>
  );
}

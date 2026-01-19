import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllPosts, getPostBySlug } from '@/lib/blog';

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {};
  }

  return {
    title: `${post.title} | Viral Ads Now`,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="bg-white">
      <section className="border-b border-border bg-surface-muted">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <Link href="/blog" className="text-sm font-semibold text-brand">
            ← Back to blog
          </Link>
          <h1 className="mt-4 text-4xl font-bold text-foreground">{post.title}</h1>
          <p className="mt-4 text-lg text-muted">{post.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-subtle">
            <span>{post.author}</span>
            <span>•</span>
            <span>{new Date(post.date).toLocaleDateString()}</span>
            <span>•</span>
            <span>{post.readingTimeMinutes} min read</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {post.imageUrl ? (
          <div className="mb-8 overflow-hidden rounded-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.imageUrl} alt={post.title} className="h-full w-full object-cover" />
          </div>
        ) : null}

        <article
          className="blog-content space-y-5 text-base leading-relaxed text-muted"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      </section>
    </div>
  );
}

import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export const metadata = {
  title: 'Blog | Viral Ads Now',
  description: 'TikTok ad strategy, creative testing, and UGC insights for growth teams.',
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  return (
    <div className="bg-white">
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Viral Ads Now</p>
          <h1 className="mt-3 text-4xl font-bold text-gray-900 sm:text-5xl">
            Playbooks for TikTok ad performance.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-600">
            Latest tactics on hooks, creative testing, and UGC that keep your CPM down and your
            ROAS up.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
                {post.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                    Viral Ads Now
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-4 p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-blue-50 px-3 py-1">
                      {tag}
                    </span>
                  ))}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 group-hover:text-blue-600">
                    {post.title}
                  </h2>
                  <p className="mt-3 text-sm text-gray-600">{post.description}</p>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>{post.author}</span>
                  <span>•</span>
                  <span>{new Date(post.date).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{post.readingTimeMinutes} min read</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  imageUrl?: string;
  readingTimeMinutes: number;
};

export type BlogPostWithContent = BlogPost & {
  contentHtml: string;
};

type Frontmatter = {
  title?: string;
  description?: string;
  date?: string | Date;
  author?: string;
  tags?: string[];
  imageUrl?: string;
};

function getReadingTimeMinutes(content: string) {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function toPostSlug(filename: string) {
  return filename.replace(/\.md$/, '');
}

function normalizeFrontmatter(slug: string, frontmatter: Frontmatter, content: string): BlogPost {
  const normalizedDate =
    frontmatter.date instanceof Date
      ? frontmatter.date.toISOString()
      : frontmatter.date ?? new Date().toISOString();

  return {
    slug,
    title: frontmatter.title ?? slug.replace(/-/g, ' '),
    description: frontmatter.description ?? 'TikTok ad insights and creative strategy.',
    date: normalizedDate,
    author: frontmatter.author ?? 'Viral Ads Now Team',
    tags: frontmatter.tags ?? [],
    imageUrl: frontmatter.imageUrl,
    readingTimeMinutes: getReadingTimeMinutes(content),
  };
}

async function getBlogFiles() {
  try {
    const entries = await fs.readdir(BLOG_DIR);
    return entries.filter((entry) => entry.endsWith('.md'));
  } catch {
    return [];
  }
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const entries = await getBlogFiles();
  const posts = await Promise.all(
    entries.map(async (entry) => {
      const slug = toPostSlug(entry);
      const filePath = path.join(BLOG_DIR, entry);
      const fileContents = await fs.readFile(filePath, 'utf8');
      const { data, content } = matter(fileContents);
      return normalizeFrontmatter(slug, data as Frontmatter, content);
    }),
  );

  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPostBySlug(slug: string): Promise<BlogPostWithContent | null> {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  try {
    const fileContents = await fs.readFile(filePath, 'utf8');
    const { data, content } = matter(fileContents);
    const html = await marked.parse(content);
    return {
      ...normalizeFrontmatter(slug, data as Frontmatter, content),
      contentHtml: html,
    };
  } catch {
    return null;
  }
}

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { put } from '@vercel/blob';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const IMAGE_DIR = path.join(process.cwd(), 'content', 'blog-images');

const CONTENT_TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

type BlogFrontmatter = {
  imageFile?: string;
  imageUrl?: string;
};

async function getBlogFiles() {
  const entries = await fs.readdir(BLOG_DIR);
  return entries.filter((entry) => entry.endsWith('.md'));
}

async function uploadImage(slug: string, imageFile: string) {
  const imagePath = path.join(IMAGE_DIR, imageFile);
  const fileBuffer = await fs.readFile(imagePath);
  const ext = path.extname(imageFile).toLowerCase();
  const contentType = CONTENT_TYPES[ext];

  const blob = await put(`blog/${slug}/${imageFile}`, fileBuffer, {
    access: 'public',
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return blob.url;
}

async function seedBlogImages() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('Missing BLOB_READ_WRITE_TOKEN in the environment.');
  }

  const entries = await getBlogFiles();

  for (const entry of entries) {
    const slug = entry.replace(/\.md$/, '');
    const filePath = path.join(BLOG_DIR, entry);
    const fileContents = await fs.readFile(filePath, 'utf8');
    const { data, content } = matter(fileContents);
    const frontmatter = data as BlogFrontmatter;

    if (!frontmatter.imageFile || frontmatter.imageUrl) {
      continue;
    }

    const imageUrl = await uploadImage(slug, frontmatter.imageFile);
    const updatedFrontmatter = { ...frontmatter, imageUrl };
    const updatedContents = matter.stringify(content, updatedFrontmatter);
    await fs.writeFile(filePath, updatedContents, 'utf8');
    console.log(`Seeded ${entry} → ${imageUrl}`);
  }
}

seedBlogImages().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { readdir, readFile } from 'fs/promises';
import path from 'path';

export type DevBlogPost = {
  slug: string;
  title: string;
  date: string;
  version: string | null;
  excerpt: string;
  body: string;
  html: string;
};

type FrontmatterResult = {
  data: Record<string, string>;
  body: string;
};

const DEV_BLOG_DIR = path.join(process.cwd(), 'content', 'dev-blog');

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseFrontmatter(value: string): FrontmatterResult {
  const text = String(value || '').replace(/^\uFEFF/, '');
  if (!text.startsWith('---')) return { data: {}, body: text };
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: text };

  const data: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    if (!key) continue;
    data[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
  return { data, body: match[2] };
}

function slugFromFilename(fileName: string) {
  return fileName.replace(/\.md$/i, '').toLowerCase();
}

function versionFromSlug(slug: string) {
  const match = slug.match(/v(\d+(?:-\d+)*)$/i);
  return match ? match[1].replace(/-/g, '.') : null;
}

function versionSortKey(version: string | null) {
  return String(version || '0').split('.').map((part) => Number.parseInt(part, 10) || 0);
}

function compareVersions(a: string | null, b: string | null) {
  const left = versionSortKey(a);
  const right = versionSortKey(b);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (right[index] ?? 0) - (left[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function formatExcerpt(markdown: string) {
  const clean = markdown
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_`>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= 180) return clean;
  return `${clean.slice(0, 177).trimEnd()}…`;
}

function renderInline(value: string) {
  let output = escapeHtml(value);
  output = output.replace(/`([^`]+)`/g, '<code>$1</code>');
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  output = output.replace(/\[([^\]]+)\]\((\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
  return output;
}

export function markdownToHtml(markdown: string) {
  const lines = String(markdown || '').split('\n');
  const html: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let inCode = false;
  let codeBuffer: string[] = [];
  let codeLanguage = '';

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!listItems.length) return;
    html.push(`<ul>${listItems.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`);
    listItems = [];
  }

  for (const line of lines) {
    const fence = line.match(/^```\s*([\w-]*)\s*$/);
    if (fence) {
      if (inCode) {
        html.push(`<pre><code${codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : ''}>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
        codeBuffer = [];
        codeLanguage = '';
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
        codeLanguage = fence[1] || '';
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length, 3);
      html.push(`<h${level}>${renderInline(heading[2].trim())}</h${level}>`);
      continue;
    }

    const list = line.match(/^[-*]\s+(.+)$/);
    if (list) {
      flushParagraph();
      listItems.push(list[1].trim());
      continue;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${renderInline(quote[1].trim())}</blockquote>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  if (inCode) html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
  return html.join('\n');
}

export async function getDevBlogPosts(): Promise<DevBlogPost[]> {
  let entries: string[] = [];
  try {
    entries = await readdir(DEV_BLOG_DIR);
  } catch {
    return [];
  }

  const posts = await Promise.all(entries
    .filter((entry) => entry.toLowerCase().endsWith('.md'))
    .map(async (entry) => {
      const slug = slugFromFilename(entry);
      const raw = await readFile(path.join(DEV_BLOG_DIR, entry), 'utf8');
      const { data, body } = parseFrontmatter(raw);
      const version = data.version || versionFromSlug(slug);
      const title = data.title || body.split('\n').find((line) => line.startsWith('# '))?.replace(/^#\s+/, '').trim() || `Release notes v${version ?? ''}`.trim();
      const date = data.date || '2026-05-06';
      return {
        slug,
        title,
        date,
        version,
        excerpt: formatExcerpt(body),
        body,
        html: markdownToHtml(body),
      } satisfies DevBlogPost;
    }));

  return posts.sort((a, b) => {
    const dateDifference = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDifference !== 0) return dateDifference;
    return compareVersions(a.version, b.version);
  });
}

export async function getDevBlogPost(slug: string) {
  const cleaned = String(slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  const posts = await getDevBlogPosts();
  return posts.find((post) => post.slug === cleaned) ?? null;
}

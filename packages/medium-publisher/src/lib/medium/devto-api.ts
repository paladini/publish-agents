const DEVTO_URL = /^https?:\/\/(?:www\.)?dev\.to\/([^/]+)\/([^/?#]+)/i;

export type DevtoArticle = {
  title: string;
  description: string;
  body_markdown: string;
  url: string;
  tags: string[];
  cover_image: string | null;
  social_image: string | null;
};

export function heroImageUrl(article: Pick<DevtoArticle, 'cover_image' | 'social_image'>): string | null {
  return article.cover_image || article.social_image || null;
}

export function parseDevtoUrl(url: string): { username: string; slug: string } | null {
  const match = url.match(DEVTO_URL);
  if (!match?.[1] || !match[2]) return null;
  return { username: match[1], slug: match[2] };
}

export async function fetchDevtoArticle(devtoUrl: string): Promise<DevtoArticle> {
  const parsed = parseDevtoUrl(devtoUrl);
  if (!parsed) {
    throw new Error(`Invalid DEV.to URL: ${devtoUrl}`);
  }

  const apiUrl = `https://dev.to/api/articles/${encodeURIComponent(parsed.username)}/${encodeURIComponent(parsed.slug)}`;
  const res = await fetch(apiUrl, {
    headers: { Accept: 'application/json', 'User-Agent': 'medium-publisher/0.1' },
  });

  if (!res.ok) {
    throw new Error(`DEV.to API returned ${res.status} for ${parsed.username}/${parsed.slug}`);
  }

  const data = (await res.json()) as {
    title?: string;
    description?: string;
    body_markdown?: string;
    url?: string;
    tag_list?: string;
    cover_image?: string | null;
    social_image?: string | null;
  };

  if (!data.body_markdown) {
    throw new Error('DEV.to article has no body_markdown — is it published?');
  }

  const tags = (data.tag_list ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);

  return {
    title: data.title ?? '',
    description: data.description ?? '',
    body_markdown: data.body_markdown,
    url: data.url ?? devtoUrl,
    tags,
    cover_image: data.cover_image ?? null,
    social_image: data.social_image ?? null,
  };
}

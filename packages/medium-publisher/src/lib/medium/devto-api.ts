const DEVTO_URL = /^https?:\/\/(?:www\.)?dev\.to\/([^/]+)\/([^/?#]+)/i;

export type DevtoArticle = {
  title: string;
  body_markdown: string;
  url: string;
};

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
    body_markdown?: string;
    url?: string;
  };

  if (!data.body_markdown) {
    throw new Error('DEV.to article has no body_markdown — is it published?');
  }

  return {
    title: data.title ?? '',
    body_markdown: data.body_markdown,
    url: data.url ?? devtoUrl,
  };
}

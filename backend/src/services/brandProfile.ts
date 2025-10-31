export interface BrandProfile {
  url: string;
  title?: string;
  description?: string;
  colors: string[];
  fontFamilies: string[];
  logoUrls: string[];
  imageUrls: string[];
  fetchedAt: string;
}

export type BaserowSyncStatus = 'skipped' | 'success' | 'failed';

export interface BaserowSyncResult {
  status: BaserowSyncStatus;
  reason?: string;
  error?: string;
}

export interface BaserowConfig {
  apiToken: string;
  apiUrl: string;
  tableId: string;
}

const HEX_COLOR_REGEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const FONT_FAMILY_REGEX = /font-family\s*:\s*([^;}]*)/gi;
const TITLE_REGEX = /<title[^>]*>([^<]*)<\/title>/i;

function ensureHttpUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function normalizeHex(color: string): string {
  const cleaned = color.trim();
  if (!cleaned.startsWith('#')) {
    return cleaned;
  }
  if (cleaned.length === 4) {
    const [, r, g, b] = cleaned;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (cleaned.length === 5) {
    const [, r, g, b, a] = cleaned;
    return `#${r}${r}${g}${g}${b}${b}${a}${a}`.toUpperCase();
  }
  return cleaned.toUpperCase();
}

function dedupePreserveOrder<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const item of items) {
    if (item && !seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

function extractTitle(html: string): string | undefined {
  const match = TITLE_REGEX.exec(html);
  const value = match?.[1]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function extractMetaContent(html: string, key: string): string | undefined {
  const metaRegex = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escapeRegExp(key)}["'][^>]*>`,
    'i',
  );
  const match = metaRegex.exec(html);
  if (!match) return undefined;
  const attributes = parseAttributes(match[0]);
  const content = attributes.get('content')?.trim();
  return content && content.length > 0 ? content : undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const attrRegex = /([a-zA-Z_:][\w:.-]*)\s*=\s*("[^"]*"|'[^']*')/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(tag)) !== null) {
    const name = match[1].toLowerCase();
    const rawValue = match[2];
    attributes.set(name, rawValue.slice(1, -1));
  }
  return attributes;
}

function resolveUrl(baseUrl: string, value?: string | null): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function collectMetaImageCandidates(html: string): string[] {
  const results: string[] = [];
  for (const property of ['og:image', 'twitter:image']) {
    const metaRegex = new RegExp(
      `<meta[^>]+(?:name|property)=["']${property}["'][^>]*>`,
      'gi',
    );
    let match: RegExpExecArray | null;
    while ((match = metaRegex.exec(html)) !== null) {
      const attributes = parseAttributes(match[0]);
      const content = attributes.get('content');
      if (content) {
        results.push(content);
      }
    }
  }
  return results;
}

function collectImageTags(html: string): string[] {
  const tags: string[] = [];
  const imgRegex = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    tags.push(match[0]);
  }
  return tags;
}

function collectLinkTags(html: string): string[] {
  const tags: string[] = [];
  const linkRegex = /<link\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    tags.push(match[0]);
  }
  return tags;
}

function collectImageCandidates(html: string): string[] {
  const candidates: string[] = [];
  candidates.push(...collectMetaImageCandidates(html));

  for (const tag of collectImageTags(html)) {
    const attributes = parseAttributes(tag);
    const src = attributes.get('src');
    if (src) {
      candidates.push(src);
    }
    const srcset = attributes.get('srcset');
    if (srcset) {
      const first = srcset.split(',')[0]?.trim().split(' ')[0];
      if (first) {
        candidates.push(first);
      }
    }
  }

  return candidates;
}

function selectLogoUrls(html: string, baseUrl: string): string[] {
  const logoUrls: string[] = [];

  for (const tag of collectImageTags(html)) {
    const attributes = parseAttributes(tag);
    const alt = attributes.get('alt')?.toLowerCase() ?? '';
    const className = attributes.get('class')?.toLowerCase() ?? '';
    const id = attributes.get('id')?.toLowerCase() ?? '';
    const src = attributes.get('src');
    if (src && [alt, className, id].some((value) => value.includes('logo'))) {
      const resolved = resolveUrl(baseUrl, src);
      if (resolved) {
        logoUrls.push(resolved);
      }
    }
  }

  for (const tag of collectLinkTags(html)) {
    const attributes = parseAttributes(tag);
    const rel = attributes.get('rel')?.toLowerCase() ?? '';
    if (rel.includes('icon')) {
      const href = attributes.get('href');
      const resolved = resolveUrl(baseUrl, href);
      if (resolved) {
        logoUrls.push(resolved);
      }
    }
  }

  const ogLogo = extractMetaContent(html, 'og:logo');
  if (ogLogo) {
    const resolved = resolveUrl(baseUrl, ogLogo);
    if (resolved) {
      logoUrls.push(resolved);
    }
  }

  return dedupePreserveOrder(logoUrls);
}

function selectImageUrls(html: string, baseUrl: string): string[] {
  const raw = collectImageCandidates(html);
  const resolved = raw
    .map((candidate) => resolveUrl(baseUrl, candidate))
    .filter((value): value is string => Boolean(value));
  return dedupePreserveOrder(resolved).slice(0, 20);
}

function extractHexColors(html: string): string[] {
  const matches = html.match(HEX_COLOR_REGEX) ?? [];
  const normalized = matches.map(normalizeHex);
  const counts = new Map<string, number>();
  for (const color of normalized) {
    counts.set(color, (counts.get(color) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.map(([color]) => color).slice(0, 8);
}

function extractFontFamilies(html: string): string[] {
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = FONT_FAMILY_REGEX.exec(html)) !== null) {
    const families = match[1]
      .split(',')
      .map((part) => part.replace(/['"]/g, '').trim())
      .filter(Boolean);
    results.push(...families);
  }
  return dedupePreserveOrder(results).slice(0, 8);
}

export function extractBrandProfile(baseUrl: string, html: string): BrandProfile {
  const normalizedUrl = ensureHttpUrl(baseUrl);

  const title = extractTitle(html);
  const description = extractMetaContent(html, 'description');

  const colors = extractHexColors(html);
  const fontFamilies = extractFontFamilies(html);
  const logoUrls = selectLogoUrls(html, normalizedUrl);
  const imageUrls = selectImageUrls(html, normalizedUrl);

  return {
    url: normalizedUrl,
    title,
    description,
    colors,
    fontFamilies,
    logoUrls,
    imageUrls,
    fetchedAt: new Date().toISOString(),
  };
}

export async function scanBrandProfile(rawUrl: string): Promise<BrandProfile> {
  const url = ensureHttpUrl(rawUrl);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'pomelli-lite-brand-scanner/1.0',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return extractBrandProfile(url, html);
}

export async function syncProfileToBaserow(
  profile: BrandProfile,
  configOverrides: Partial<BaserowConfig> = {},
): Promise<BaserowSyncResult> {
  const config = resolveBaserowConfig(configOverrides);
  if (!config) {
    return {
      status: 'skipped',
      reason: 'missing-config',
    };
  }

  try {
    const response = await fetch(
      `${config.apiUrl.replace(/\/$/, '')}/api/database/rows/table/${config.tableId}/?user_field_names=true`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Website: profile.url,
          Title: profile.title ?? '',
          Description: profile.description ?? '',
          Colors: profile.colors.join(', '),
          Fonts: profile.fontFamilies.join(', '),
          Logos: profile.logoUrls.join(', '),
          Images: profile.imageUrls.join(', '),
          FetchedAt: profile.fetchedAt,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await safeReadError(response);
      return {
        status: 'failed',
        error: `Baserow sync failed: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`,
      };
    }

    return { status: 'success' };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function resolveBaserowConfig(overrides: Partial<BaserowConfig>): BaserowConfig | undefined {
  const apiToken = overrides.apiToken ?? process.env.BASEROW_API_TOKEN;
  const apiUrl = overrides.apiUrl ?? process.env.BASEROW_API_URL ?? 'https://api.baserow.io';
  const tableId = overrides.tableId ?? process.env.BASEROW_BRAND_TABLE_ID;

  if (!apiToken || !tableId) {
    return undefined;
  }

  return { apiToken, apiUrl, tableId };
}

async function safeReadError(response: { text: () => Promise<string> }): Promise<string | undefined> {
  try {
    const text = await response.text();
    return text?.slice(0, 500);
  } catch {
    return undefined;
  }
}

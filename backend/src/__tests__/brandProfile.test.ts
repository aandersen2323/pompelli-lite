import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractBrandProfile, syncProfileToBaserow } from '../services/brandProfile.js';

const SAMPLE_HTML = `
<html>
  <head>
    <title>Eyesights Tech</title>
    <meta name="description" content="See further with AI." />
    <meta property="og:image" content="/images/social-card.png" />
    <link rel="icon" href="/favicon.ico" />
    <style>
      body { background-color: #112233; font-family: 'Inter', sans-serif; }
      h1 { color: #123; font-family: "Roboto", serif; }
    </style>
  </head>
  <body>
    <img src="/assets/logo.svg" alt="Eyesights Logo" />
    <img src="/assets/hero.jpg" />
  </body>
</html>
`;

describe('extractBrandProfile', () => {
  it('parses title, description, colors, fonts, and assets', () => {
    const profile = extractBrandProfile('https://eyesights.tech', SAMPLE_HTML);

    expect(profile.url).toBe('https://eyesights.tech');
    expect(profile.title).toBe('Eyesights Tech');
    expect(profile.description).toBe('See further with AI.');
    expect(profile.colors).toEqual(['#112233']);
    expect(profile.fontFamilies).toEqual(['Inter', 'sans-serif', 'Roboto', 'serif']);
    expect(profile.logoUrls).toEqual([
      'https://eyesights.tech/assets/logo.svg',
      'https://eyesights.tech/favicon.ico',
    ]);
    expect(profile.imageUrls).toEqual([
      'https://eyesights.tech/images/social-card.png',
      'https://eyesights.tech/assets/logo.svg',
      'https://eyesights.tech/assets/hero.jpg',
    ]);
    expect(Date.parse(profile.fetchedAt)).not.toBeNaN();
  });
});

describe('syncProfileToBaserow', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('skips syncing when configuration is missing', async () => {
    const profile = extractBrandProfile('https://eyesights.tech', SAMPLE_HTML);
    const result = await syncProfileToBaserow(profile, { apiToken: '', tableId: '' } as any);
    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('missing-config');
  });

  it('sends rows to baserow when configuration provided', async () => {
    const profile = extractBrandProfile('https://eyesights.tech', SAMPLE_HTML);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await syncProfileToBaserow(profile, {
      apiToken: 'token',
      apiUrl: 'https://baserow.example',
      tableId: '123',
    });

    expect(result.status).toBe('success');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://baserow.example/api/database/rows/table/123/?user_field_names=true');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toMatchObject({
      Authorization: 'Token token',
      'Content-Type': 'application/json',
    });
    const body = JSON.parse(options?.body as string);
    expect(body.Website).toBe('https://eyesights.tech');
    expect(body.Colors).toBe('#112233');
  });
});

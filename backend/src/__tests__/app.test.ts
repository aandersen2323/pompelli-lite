import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../app.js';

const INPUT_TEXT = 'Pomelli-lite lets me remix prompts quickly.';

describe('API lifecycle', () => {
  const server = buildServer();

  beforeAll(async () => {
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('enqueues a job and retrieves the results', async () => {
    const generate = await server.inject({
      method: 'POST',
      url: '/api/v1/generate',
      payload: { input: INPUT_TEXT, templateId: 'default', n: 2 },
    });

    expect(generate.statusCode).toBe(202);
    const { jobId } = generate.json<{ jobId: string }>();
    expect(jobId).toBeTruthy();

    const status = await server.inject({
      method: 'GET',
      url: `/api/v1/job/${jobId}`,
    });
    expect(status.statusCode).toBe(200);

    // Wait for the background worker to finish.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const result = await server.inject({
      method: 'GET',
      url: `/api/v1/job/${jobId}/result`,
    });

    // It might still be running, but eventually should be done.
    if (result.statusCode === 409) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const final = await server.inject({
      method: 'GET',
      url: `/api/v1/job/${jobId}/result`,
    });

    expect(final.statusCode).toBe(200);
    const payload = final.json<{ results: string[] }>();
    expect(payload.results).toHaveLength(2);
  });

  it('scans a brand website and returns extracted data', async () => {
    const html = `
      <html>
        <head>
          <title>Eyesights Tech</title>
          <meta name="description" content="See further" />
        </head>
        <body>
          <style>
            body { color: #abcdef; font-family: "Inter", sans-serif; }
          </style>
          <img src="/logo.png" alt="Main Logo" />
        </body>
      </html>
    `;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => html,
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/brand-scan',
      payload: { url: 'https://eyesights.tech' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      profile: { title: string; colors: string[] };
      baserow: { status: string; reason?: string };
    }>();

    expect(body.profile.title).toBe('Eyesights Tech');
    expect(body.profile.colors).toContain('#ABCDEF');
    expect(body.baserow.status).toBe('skipped');
    expect(body.baserow.reason).toBe('disabled');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

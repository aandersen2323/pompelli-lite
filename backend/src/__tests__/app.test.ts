import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
});

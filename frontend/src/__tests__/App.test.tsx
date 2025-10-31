import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';

type FetchMockResponse = {
  matcher: RegExp;
  method?: string;
  body: unknown;
  status?: number;
  once?: boolean;
};

describe('App integration', () => {
  const createFetchMock = (responses: FetchMockResponse[]) => {
    return vi.fn().mockImplementation(async (input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.url;
      const method = init?.method ?? 'GET';
      const matchIndex = responses.findIndex((response) =>
        response.matcher.test(url) && (response.method ?? 'GET') === method,
      );
      if (matchIndex === -1) {
        throw new Error(`Unexpected fetch request: ${method} ${url}`);
      }
      const response = responses[matchIndex];
      if (response.once) {
        responses.splice(matchIndex, 1);
      }
      return {
        ok: (response.status ?? 200) >= 200 && (response.status ?? 200) < 300,
        status: response.status ?? 200,
        json: async () => response.body,
      } as Response;
    });
  };

  const renderApp = () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    render(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>,
    );
  };

  it('submits a job and shows results', async () => {
    const responses: FetchMockResponse[] = [
      {
        matcher: /\/api\/v1\/templates/,
        body: {
          templates: [
            { id: 'default', name: 'Default', promptWrapper: '', description: '' },
            { id: 'playful', name: 'Playful', promptWrapper: '', description: '' },
          ],
        },
      },
      {
        matcher: /\/api\/v1\/history/,
        body: { jobs: [] },
      },
      {
        matcher: /\/api\/v1\/history/,
        body: { jobs: [] },
      },
      {
        matcher: /\/api\/v1\/generate/,
        method: 'POST',
        body: { jobId: 'job-1' },
        once: true,
      },
      {
        matcher: /\/api\/v1\/job\/job-1$/,
        body: {
          job: {
            id: 'job-1',
            input: 'Hello',
            templateId: 'default',
            n: 2,
            status: 'done',
            results: ['Result 1', 'Result 2'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        once: true,
      },
    ];

    global.fetch = createFetchMock(responses);

    renderApp();

    await screen.findByText(/pomelli-lite/i);
    const textarea = screen.getByPlaceholderText(/paste a snippet/i);
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(
      () => {
        expect(screen.getByDisplayValue('Result 1')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Result 2')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});

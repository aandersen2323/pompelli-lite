export type Template = {
  id: string;
  name: string;
  promptWrapper: string;
  description: string;
};

export type Job = {
  id: string;
  input: string;
  templateId: string;
  n: number;
  status: 'queued' | 'running' | 'done' | 'failed';
  results: string[];
  createdAt: string;
  updatedAt: string;
  error?: string;
};

type GenerateResponse = { jobId: string };

type JobResponse = { job: Job };

type TemplatesResponse = { templates: Template[] };

type HistoryResponse = { jobs: Job[] };

const API_BASE = typeof window === 'undefined' ? '' : import.meta.env.VITE_API_BASE ?? '';

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function fetchTemplates() {
  return request<TemplatesResponse>('/api/v1/templates');
}

export function createJob(input: string, templateId: string, n: number) {
  return request<GenerateResponse>('/api/v1/generate', {
    method: 'POST',
    body: JSON.stringify({ input, templateId, n }),
  });
}

export function fetchJob(jobId: string) {
  return request<JobResponse>(`/api/v1/job/${jobId}`);
}

export function fetchHistory() {
  return request<HistoryResponse>('/api/v1/history');
}

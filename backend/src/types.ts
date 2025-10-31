export type Template = {
  id: string;
  name: string;
  promptWrapper: string;
  description: string;
};

export type JobStatus = 'queued' | 'running' | 'done' | 'failed';

export type Job = {
  id: string;
  input: string;
  templateId: string;
  n: number;
  status: JobStatus;
  results: string[];
  createdAt: string;
  updatedAt: string;
  error?: string;
};

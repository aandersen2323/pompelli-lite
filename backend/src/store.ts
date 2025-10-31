import { Job } from './types.js';

const JOBS = new Map<string, Job>();

export function saveJob(job: Job) {
  JOBS.set(job.id, job);
}

export function getJob(id: string) {
  return JOBS.get(id);
}

export function listJobs(limit = 50) {
  return Array.from(JOBS.values())
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}

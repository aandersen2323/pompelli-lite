import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import { nanoid } from 'nanoid';
import { InMemoryQueue } from './queue.js';
import { generateWithAdapter } from './adapters/index.js';
import { findTemplate, TEMPLATES } from './templates.js';
import { getJob, listJobs, saveJob } from './store.js';
import type { Job } from './types.js';

export function buildServer() {
  const server = Fastify({ logger: true });
  server.register(cors, {
    origin: true,
  });

  const authSecret = process.env.AUTH_SECRET;
  if (authSecret) {
    server.register(fastifyJwt, {
      secret: authSecret,
    });

    server.addHook('onRequest', async (req, reply) => {
      const isLoginRoute = req.routerPath?.startsWith('/api/v1/login') || req.url.startsWith('/api/v1/login');
      if (isLoginRoute) return;
      try {
        await req.jwtVerify();
      } catch (err) {
        reply.code(401).send({ error: 'Unauthorized' });
      }
    });

    server.post('/api/v1/login', async (req, reply) => {
      const { token } = req.body as { token?: string };
      if (!token || token !== process.env.AUTH_TOKEN) {
        return reply.code(401).send({ error: 'Invalid token' });
      }
      const jwt = await reply.jwtSign({ sub: 'user' }, { expiresIn: '30m' });
      return { jwt };
    });
  }

  const queue = new InMemoryQueue<Job>(async (job) => {
    const template = findTemplate(job.templateId);
    job.templateId = template.id;
    job.status = 'running';
    job.updatedAt = new Date().toISOString();
    saveJob(job);
    try {
      const results = await generateWithAdapter(job.input, job.templateId, job.n);
      job.results = results;
      job.status = 'done';
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    }
    job.updatedAt = new Date().toISOString();
    saveJob(job);
  });

  server.get('/api/v1/templates', () => ({ templates: TEMPLATES }));

  server.post('/api/v1/generate', async (req, reply) => {
    const body = req.body as Partial<{
      input: string;
      templateId: string;
      n: number;
    }>;

    if (!body?.input || body.input.trim().length === 0) {
      return reply.code(400).send({ error: 'input is required' });
    }

    const templateId = body.templateId ?? 'default';
    const n = Math.max(1, Math.min(body.n ?? 3, 10));
    const job: Job = {
      id: nanoid(),
      input: body.input,
      templateId,
      n,
      status: 'queued',
      results: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveJob(job);
    queue.enqueue(job.id, job);

    return reply.code(202).send({ jobId: job.id });
  });

  server.get('/api/v1/job/:id', (req, reply) => {
    const { id } = req.params as { id: string };
    const job = getJob(id);
    if (!job) {
      return reply.code(404).send({ error: 'Job not found' });
    }
    return { job };
  });

  server.get('/api/v1/job/:id/result', (req, reply) => {
    const { id } = req.params as { id: string };
    const job = getJob(id);
    if (!job) {
      return reply.code(404).send({ error: 'Job not found' });
    }
    if (job.status !== 'done') {
      return reply.code(409).send({ error: 'Job not complete', status: job.status });
    }
    return { results: job.results };
  });

  server.get('/api/v1/history', () => ({ jobs: listJobs() }));

  return server;
}

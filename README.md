# pomelli-lite

pomelli-lite is a local-first playground for generating AI-powered variations of short text prompts. Paste a snippet, pick a template, and receive multiple rewrites side-by-side with fast editing, copy/export, and lightweight history.

## Features

- 📄 Paste or upload text (CSV upload planned) and request multiple variations.
- 🎛️ Template-driven prompts: concise summaries, playful rewrites, technical briefs, and image prompt helpers.
- ⚙️ In-memory background queue with progress polling and an easy path to upgrade to Redis/BullMQ for production scale.
- 🔌 Pluggable LLM adapters: bundled mock adapter for local demos plus an OpenAI-ready skeleton.
- 💾 History stored in `localStorage` with optional server-sync history endpoint.
- 🧱 React + Tailwind frontend focused on quick iteration and responsive previews.
- 🧪 Vitest-powered unit tests for backend queue + API flow and frontend UI components.
- 📦 Docker Compose for spinning up the full stack with one command.
- ✅ GitHub Actions CI running frontend and backend test suites.

## Getting started

### Requirements

- Node.js 20+
- npm 9+

### Backend

```bash
cd backend
npm install
npm run dev
```

The Fastify server listens on `http://localhost:5000` by default.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite hosts the app on `http://localhost:5173`. API requests proxy to the backend during development.

### Swap to OpenAI

1. Set `OPENAI_API_KEY` in your backend environment.
2. Optionally configure `AUTH_SECRET` and `AUTH_TOKEN` to enable JWT-based auth for hosted scenarios.
3. The OpenAI adapter lives in [`backend/src/adapters/llm-openai.ts`](backend/src/adapters/llm-openai.ts). Replace the placeholder implementation with calls to your preferred SDK (e.g. `openai` npm package).

### Scaling the queue

The backend uses an intentionally small in-memory queue (`InMemoryQueue`). For production, consider replacing it with Redis + BullMQ or another durable queue:

- Install `bullmq` and connect to Redis.
- Swap `InMemoryQueue` usage in [`backend/src/app.ts`](backend/src/app.ts) with a BullMQ `Queue` and worker.
- Move job result persistence into SQLite/Postgres for multi-instance reliability.

### Docker Compose

```bash
docker-compose up --build
```

This command builds and launches both frontend and backend in development mode.

### Testing

Run backend tests:

```bash
cd backend
npm run test
```

Run frontend tests:

```bash
cd frontend
npm run test
```

The CI workflow mirrors these commands and reports coverage.

### Project structure

```
pomelli-lite/
├─ backend/           # Fastify API, adapters, queue, Vitest tests
├─ frontend/          # React + Vite app with Tailwind styling
├─ docker/            # Dockerfiles for dev containers
├─ docker-compose.yml # Compose setup for local dev
└─ .github/workflows  # GitHub Actions CI definition
```

## License

[MIT](LICENSE)

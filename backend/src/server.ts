import { buildServer } from './app.js';

const PORT = Number(process.env.PORT ?? 5000);

async function main() {
  const server = buildServer();
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    server.log.info(`Server listening on http://0.0.0.0:${PORT}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

void main();

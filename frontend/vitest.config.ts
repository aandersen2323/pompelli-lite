import { defineConfig } from 'vitest/config';

const reactPlugin = import('@vitejs/plugin-react')
  .then((mod) => mod.default())
  .catch(() => null);

export default defineConfig(async () => {
  const plugin = (await reactPlugin)?.();

  return {
    plugins: plugin ? [plugin] : [],
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      coverage: {
        reporter: ['text', 'html'],
      },
    },
  };
});

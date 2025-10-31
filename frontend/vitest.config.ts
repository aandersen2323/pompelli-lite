import { defineConfig } from 'vitest/config';

const reactPluginFactory = import('@vitejs/plugin-react')
  .then((mod) => mod.default)
  .catch(() => null);

export default defineConfig(async () => {
  const pluginFactory = await reactPluginFactory;
  const plugin = pluginFactory?.();

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

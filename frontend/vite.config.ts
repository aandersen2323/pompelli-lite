import { defineConfig } from 'vite';

const reactPlugin = import('@vitejs/plugin-react')
  .then((mod) => mod.default())
  .catch(() => null);

export default defineConfig(async () => {
  const plugin = (await reactPlugin)?.();

  return {
    plugins: plugin ? [plugin] : [],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});

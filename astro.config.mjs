import { defineConfig } from 'astro/config';

// Только статическая сборка: никакого SSR и Node на сервере (см. CLAUDE.md)
export default defineConfig({
  output: 'static',
  site: 'https://ray-nn.ru',
  server: { port: 4321 },
  build: {
    format: 'directory',
  },
});

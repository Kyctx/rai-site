import { defineConfig } from 'astro/config';

// Только статическая сборка: никакого SSR и Node на сервере (см. CLAUDE.md)
// base — подпуть для превью на GitHub Pages (kyctx.github.io/rai-site/);
// на проде (свой домен, корень) переменную GITHUB_PAGES не выставляем — base остаётся "/".
const isGithubPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  output: 'static',
  site: isGithubPages ? 'https://kyctx.github.io' : 'https://ray-nn.ru',
  base: isGithubPages ? '/rai-site' : '/',
  server: { port: 4321 },
  build: {
    format: 'directory',
  },
});

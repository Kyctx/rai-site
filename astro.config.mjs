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
    // Превью на GitHub Pages обновляется после каждого push, а HTML кэшируется браузером ~10 минут:
    // пока кэш не истёк, страница ссылается на старый файл стилей с хэшем, которого после деплоя уже нет
    // (404) — и страница показывается без оформления. Поэтому на превью CSS встраиваем в HTML.
    // На проде (свой хостинг, длинный кэш /_astro/) оставляем обычные внешние файлы.
    inlineStylesheets: isGithubPages ? 'always' : 'auto',
  },
});

// Данные каталога и общие хелперы. Единственный источник товаров — src/data/products.json.
import data from '@data/products.json';

export interface Spec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  category: string;
  categoryTitle: string;
  name: string;
  price: number;
  short: string;
  description: string;
  specs: Spec[];
  photo: { status: string; file: string | null };
  popular: boolean;
  inStock: boolean;
}

export interface Category {
  slug: string;
  title: string;
}

// BASE_URL учитывает /rai-site/ на GitHub Pages (см. astro.config.mjs)
export const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export const categories = data.categories as Category[];

// inStock: false — не показываем (сейчас все в наличии)
export const products = (data.products as unknown as Product[]).filter((p) => p.inStock !== false);

// Падежные формы названий разделов для подписей в макете
export const categoryForms: Record<string, { singular: string; all: string }> = {
  coffins: { singular: 'Гроб', all: 'Все гробы' },
  wreaths: { singular: 'Венок', all: 'Все венки и цветы' },
  crosses: { singular: 'Крест', all: 'Все кресты' },
  clothing: { singular: 'Одежда', all: 'Вся одежда' },
  accessories: { singular: 'Принадлежность', all: 'Все принадлежности' },
};

export const byCategory = (slug: string) => products.filter((p) => p.category === slug);

export const countIn = (slug: string) => byCategory(slug).length;

// Цена с неразрывным пробелом: «104 000 ₽»
export const formatNumber = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const formatPrice = (n: number) => `${formatNumber(n)} ₽`;

export const catalogUrl = (category?: string) => `${base}/catalog/${category ? `${category}/` : ''}`;
export const productUrl = (p: Pick<Product, 'category' | 'slug'>) => `${base}/catalog/${p.category}/${p.slug}/`;
// У позиций без улучшенного фото (status: missing) file = null — их снимок из fallbackUrl лежит локально под именем slug
export const photoUrl = (p: Pick<Product, 'photo' | 'slug'>) => `${base}${p.photo.file ?? `/images/catalog/${p.slug}.webp`}`;

// Компактные данные для клиента: шторка списка и форма строят строки по slug
export const clientCatalog = () =>
  Object.fromEntries(
    products.map((p) => [
      p.slug,
      {
        name: p.name,
        price: p.price,
        category: categoryForms[p.category]?.singular ?? p.categoryTitle,
        photo: photoUrl(p),
        url: productUrl(p),
      },
    ]),
  );

// Порядок на странице «Все товары»: гробы, венки и кресты — вперемешку на первых страницах,
// дальше к ним примешивается одежда и принадлежности. Внутри каждого раздела порядок как в products.json.
// «Вперемешку» — равномерное распределение без случайности: страницы статичные, порядок всегда одинаковый.
const MIX_PRIORITY = ['coffins', 'wreaths', 'crosses', 'clothing', 'accessories'];
const MIX_FIRST_SCREEN = 36; // три страницы по 12 товаров на desktop (на mobile — 4,5 страницы по 8)

// Детерминированный «шум» от slug: число от -0.5 до 0.5 (одинаковое при каждой сборке)
const jitter = (slug: string) => {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000 - 0.5;
};

function spread(groups: Product[][]): Product[] {
  const total = groups.reduce((sum, g) => sum + g.length, 0);
  const items = groups.flatMap((g, order) => {
    const step = total / g.length;
    let prev = -Infinity;
    return g.map((product, i) => {
      // Равномерная сетка плюс небольшой сдвиг — чтобы чередование не выглядело механическим.
      // Порядок внутри раздела сохраняем: позиция не может быть левее предыдущей.
      const pos = Math.max((i + 0.5) * step + jitter(product.slug) * step * 0.9, prev + 0.01);
      prev = pos;
      return { product, order, pos };
    });
  });
  return items.sort((x, y) => x.pos - y.pos || x.order - y.order).map((item) => item.product);
}

export function mixedProducts(): Product[] {
  const by = (slug: string) => byCategory(slug);
  // Первые страницы: все кресты (их мало) + поровну гробов и венков
  const crossCount = by('crosses').length;
  const perGroup = Math.max(0, Math.floor((MIX_FIRST_SCREEN - crossCount) / 2));
  const first = spread([by('coffins').slice(0, perGroup), by('wreaths').slice(0, perGroup), by('crosses')]);
  const used = new Set(first.map((p) => p.slug));
  // Остальное — гробы и венки, что не вошли, вперемешку с одеждой и принадлежностями
  const rest = spread(
    MIX_PRIORITY.map((slug) => by(slug).filter((p) => !used.has(p.slug))).filter((g) => g.length),
  );
  return [...first, ...rest];
}

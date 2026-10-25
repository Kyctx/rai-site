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
export const categoryForms: Record<string, { singular: string; with: string; all: string }> = {
  coffins: { singular: 'Гроб', with: 'гробом', all: 'Все гробы' },
  wreaths: { singular: 'Венок', with: 'венком', all: 'Все венки и цветы' },
  crosses: { singular: 'Крест', with: 'крестом', all: 'Все кресты' },
  clothing: { singular: 'Одежда', with: 'одеждой', all: 'Вся одежда' },
  accessories: { singular: 'Принадлежность', with: 'принадлежностями', all: 'Все принадлежности' },
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

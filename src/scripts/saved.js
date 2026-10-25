// «Отложить для агента»: список slug в localStorage, ключ rai:saved. Без сервера и регистрации.
// Модуль общий: шапка (счётчик «Отмечено N») подключает его на всех страницах,
// интерфейс каталога — в catalog.js.

const KEY = 'rai:saved';
const EVENT = 'rai:saved-change';

// Если localStorage недоступен (приватный режим, запрет cookie) — держим список в памяти страницы
let memory = [];

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((slug) => typeof slug === 'string') : [];
  } catch {
    return memory;
  }
}

function write(list) {
  memory = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // список остаётся в memory
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: list }));
}

export const getSaved = read;

export const isSaved = (slug) => read().includes(slug);

/** Добавляет или убирает товар. Возвращает true, если после вызова товар отложен. */
export function toggleSaved(slug) {
  const list = read();
  if (list.includes(slug)) {
    write(list.filter((item) => item !== slug));
    return false;
  }
  write([...list, slug]);
  return true;
}

export function removeSaved(slug) {
  write(read().filter((item) => item !== slug));
}

/** Добавляет товары к списку, не трогая уже отложенные (ссылка «Поделиться с близкими») */
export function mergeSaved(slugs) {
  const list = read();
  const next = [...list, ...slugs.filter((slug) => !list.includes(slug))];
  if (next.length !== list.length) write(next);
}

/** Подписка на изменения списка: на этой странице и в других вкладках */
export function onSavedChange(callback) {
  window.addEventListener(EVENT, (event) => callback(event.detail));
  window.addEventListener('storage', (event) => {
    if (event.key === KEY) callback(read());
  });
}

/** Цель Яндекс Метрики; счётчик подключён только в production (см. Base.astro) */
export function goal(name, params) {
  const id = import.meta.env.PUBLIC_YANDEX_METRIKA_ID;
  if (import.meta.env.PROD && id) window.ym?.(id, 'reachGoal', name, params);
}

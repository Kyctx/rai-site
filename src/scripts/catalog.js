// Интерфейс каталога: «Отложить для агента», тост, шторка списка, форма звонка,
// «Показать ещё», вкладки «Что ещё понадобится». Без фреймворков.
// Состояние списка — saved.js (localStorage, ключ rai:saved).
import IMask from 'imask';
import { getSaved, toggleSaved, removeSaved, mergeSaved, onSavedChange, goal } from './saved.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const dataEl = document.getElementById('catalog-data');
const catalog = dataEl ? JSON.parse(dataEl.textContent || '{}') : {};
const fmt = (n) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;
const knownSaved = () => getSaved().filter((slug) => catalog[slug]);

const savedDialog = document.getElementById('saved-dialog');
const leadDialog = document.getElementById('lead-dialog');
const toastRegion = document.getElementById('saved-toast');

// ===== Диалоги (<dialog>): Esc и клик по фону закрывают, прокрутка страницы блокируется =====

function openDialog(dialog) {
  if (!dialog || dialog.open) return;
  document.body.style.overflow = 'hidden';
  dialog.showModal();
}

[savedDialog, leadDialog].forEach((dialog) => {
  if (!dialog) return;
  dialog.addEventListener('click', (event) => {
    // Панель лежит внутри <dialog>, клик мимо неё попадает в сам <dialog> — это «фон»
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
  });
  $$('[data-dialog-close]', dialog).forEach((button) => button.addEventListener('click', () => dialog.close()));
});

// ===== Закладки в ячейках и на странице товара =====

function syncMarks(list = getSaved()) {
  $$('[data-slug]').forEach((cell) => {
    const on = list.includes(cell.dataset.slug);
    cell.toggleAttribute('data-saved', on);
    const button = $('[data-save]', cell);
    if (button) {
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-label', on ? 'Убрать из отложенного' : 'Отложить для агента');
    }
  });

  const panelButton = $('[data-save-panel]');
  if (panelButton) {
    const on = list.includes(panelButton.dataset.savePanel);
    panelButton.toggleAttribute('data-saved', on);
    panelButton.setAttribute('aria-pressed', String(on));
    $$('[data-saved-count]', panelButton).forEach((node) => (node.textContent = String(list.length)));
  }
}

// ===== Тост «{Товар} отмечен для агента» (4 секунды, role="status") =====

let toastTimer;

function hideToast() {
  if (!toastRegion) return;
  clearTimeout(toastTimer);
  const toast = $('.toast', toastRegion);
  if (toast) toast.hidden = true;
}

function showToast(text, { withAction = true } = {}) {
  if (!toastRegion) return;
  const toast = $('.toast', toastRegion);
  $('[data-toast-text]', toast).textContent = text;
  $('[data-toast-open]', toast).hidden = !withAction;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 4000);
}

if (toastRegion) {
  $('[data-toast-close]', toastRegion)?.addEventListener('click', hideToast);
  $('[data-toast-open]', toastRegion)?.addEventListener('click', () => {
    hideToast();
    openSaved();
  });
}

// ===== Шторка со списком =====

function renderSaved() {
  if (!savedDialog) return;
  const list = knownSaved();
  const ul = $('[data-saved-list]', savedDialog);
  const template = $('template[data-row]', savedDialog);
  ul.replaceChildren();

  let total = 0;
  list.forEach((slug) => {
    const item = catalog[slug];
    total += item.price;
    const row = template.content.firstElementChild.cloneNode(true);
    const photo = $('[data-row-photo]', row);
    photo.src = item.photo;
    $('[data-row-cat]', row).textContent = item.category;
    const link = $('[data-row-name]', row);
    link.textContent = item.name;
    link.href = item.url;
    $('[data-row-price]', row).textContent = fmt(item.price);
    const remove = $('[data-row-remove]', row);
    remove.setAttribute('aria-label', `Убрать: ${item.name}`);
    remove.addEventListener('click', () => removeSaved(slug));
    ul.append(row);
  });

  $('[data-saved-total]', savedDialog).textContent = fmt(total);
}

function openSaved() {
  if (!savedDialog || !knownSaved().length) return;
  renderSaved();
  openDialog(savedDialog);
  goal('saved_list_open');
}

if (savedDialog) {
  $('[data-saved-send]', savedDialog).addEventListener('click', () => {
    savedDialog.close();
    openLead('saved-list');
  });

  $('[data-saved-share]', savedDialog).addEventListener('click', async () => {
    const url = new URL(savedDialog.dataset.catalogUrl, location.origin);
    url.searchParams.set('saved', knownSaved().join(','));
    try {
      await navigator.clipboard.writeText(url.href);
      showToast('Ссылка скопирована — отправьте её близким', { withAction: false });
    } catch {
      showToast('Не удалось скопировать ссылку', { withAction: false });
    }
    goal('saved_list_share');
  });
}

// ===== Форма звонка =====

const leadForm = leadDialog ? $('[data-lead-form]', leadDialog) : null;
let leadSource = 'catalog-bar';
let leadProduct = null;
let phoneMask;

function setLeadState(state) {
  leadDialog.dataset.state = state;
  const sending = state === 'sending';
  const button = $('[data-lead-submit]', leadDialog);
  button.disabled = sending;
  $('span', button).textContent = sending ? 'Отправляем…' : button.dataset.label;
  $('[data-lead-error]', leadDialog).hidden = state !== 'error';
  $('[data-lead-form]', leadDialog).hidden = state === 'success';
  $('[data-lead-done]', leadDialog).hidden = state !== 'success';
}

function renderLeadList() {
  const withList = leadSource === 'saved-list';
  const list = withList ? knownSaved() : [];
  const block = $('[data-lead-list]', leadDialog);
  block.hidden = !list.length;

  const chips = $('[data-lead-chips]', leadDialog);
  const template = $('template[data-chip]', leadDialog);
  chips.replaceChildren();
  list.forEach((slug) => {
    const chip = template.content.firstElementChild.cloneNode(true);
    $('[data-chip-name]', chip).textContent = catalog[slug].name;
    const remove = $('[data-chip-remove]', chip);
    remove.setAttribute('aria-label', `Убрать: ${catalog[slug].name}`);
    // ✕ убирает товар и из формы, и из списка в localStorage
    remove.addEventListener('click', () => removeSaved(slug));
    chips.append(chip);
  });

  const product = $('[data-lead-product]', leadDialog);
  product.hidden = !leadProduct;
  if (leadProduct) $('[data-lead-product-name]', leadDialog).textContent = catalog[leadProduct]?.name ?? '';
}

function openLead(source, productSlug = null) {
  if (!leadDialog) return;
  leadSource = source;
  leadProduct = source === 'product' ? productSlug : null;
  $$('[data-field-error]', leadDialog).forEach((node) => (node.textContent = ''));
  $$('[aria-invalid]', leadDialog).forEach((node) => node.removeAttribute('aria-invalid'));
  setLeadState('form');
  renderLeadList();
  openDialog(leadDialog);
  $('[name="name"]', leadDialog).focus();
}

if (leadDialog && leadForm) {
  const phoneInput = $('[name="phone"]', leadDialog);
  phoneMask = IMask(phoneInput, { mask: '+{7} (000) 000-00-00', lazy: true });

  const fail = (field, message) => {
    const input = $(`[name="${field}"]`, leadDialog);
    input.setAttribute('aria-invalid', 'true');
    $(`[data-field-error="${field}"]`, leadDialog).textContent = message;
    return input;
  };

  leadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    $$('[data-field-error]', leadDialog).forEach((node) => (node.textContent = ''));
    $$('[aria-invalid]', leadDialog).forEach((node) => node.removeAttribute('aria-invalid'));

    const digits = phoneMask.unmaskedValue;
    const consent = $('[name="consent"]', leadDialog);
    let firstInvalid = null;
    if (digits.length !== 11) firstInvalid = fail('phone', 'Введите номер полностью');
    if (!consent.checked) {
      // fail() вызываем всегда — сообщение под чекбоксом нужно, даже если телефон тоже не прошёл
      const invalid = fail('consent', 'Нужно согласие на обработку данных');
      firstInvalid ??= invalid;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const items =
      leadSource === 'saved-list'
        ? knownSaved().map((slug) => ({ slug, name: catalog[slug].name, price: catalog[slug].price }))
        : undefined;

    const payload = {
      name: $('[name="name"]', leadDialog).value.trim(),
      phone: `+${digits}`,
      channel: 'call',
      source: leadSource,
      product: leadProduct ?? undefined,
      items,
      consent: true,
      website: $('[name="website"]', leadDialog).value,
      captcha_token: '',
    };

    setLeadState('sending');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(leadDialog.dataset.api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || String(response.status));
    } catch {
      // Введённые данные и список не стираем — только показываем плашку с телефоном
      setLeadState('error');
      return;
    }

    $('[data-done-phone]', leadDialog).textContent = phoneMask.value;
    const done = $('[data-done-list]', leadDialog);
    done.hidden = !items?.length;
    if (items?.length) {
      const sum = items.reduce((acc, item) => acc + item.price, 0);
      done.textContent = `Ваш список уже у него: ${items.map((item) => item.name).join(', ')} — примерно ${fmt(sum)} за товары.`;
    }
    setLeadState('success');
    goal('lead_sent', { source: leadSource });
  });
}

// ===== Клики: закладки, открытие форм и списка =====

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const mark = target.closest('[data-save]');
  if (mark) {
    event.preventDefault();
    event.stopPropagation();
    const slug = mark.closest('[data-slug]')?.dataset.slug;
    if (slug && toggleSaved(slug)) {
      showToast(`${catalog[slug]?.name ?? 'Товар'} отмечен для агента`);
      goal('item_saved', { slug });
    }
    return;
  }

  const panelMark = target.closest('[data-save-panel]');
  if (panelMark) {
    const slug = panelMark.dataset.savePanel;
    // Уже отмечено — кнопка открывает список, иначе отмечает товар
    if (getSaved().includes(slug)) {
      openSaved();
    } else if (toggleSaved(slug)) {
      showToast(`${catalog[slug]?.name ?? 'Товар'} отмечен для агента`);
      goal('item_saved', { slug });
    }
    return;
  }

  const lead = target.closest('[data-open-lead]');
  if (lead) {
    openLead(lead.dataset.openLead, lead.dataset.slug ?? null);
    return;
  }

  const open = target.closest('[data-open-saved]');
  if (open && savedDialog) {
    event.preventDefault();
    openSaved();
  }
});

onSavedChange((list) => {
  syncMarks(list);
  if (savedDialog?.open) {
    if (knownSaved().length) renderSaved();
    else savedDialog.close();
  }
  if (leadDialog?.open) renderLeadList();
});

// ===== «Показать ещё»: по 12 на desktop/планшете, по 8 на mobile =====

const grid = $('[data-grid]');
const moreButton = $('[data-more]');

if (grid && moreButton) {
  const cells = [...grid.children];
  const wideQuery = matchMedia('(min-width: 768px)');
  const step = () => (wideQuery.matches ? 12 : 8);
  let extra = 0;

  const renderMore = () => {
    const left = (size) => Math.max(0, cells.length - (size + extra));
    $('[data-more-n="d"]', moreButton).textContent = String(left(12));
    $('[data-more-n="m"]', moreButton).textContent = String(left(8));
    moreButton.toggleAttribute('data-d-empty', left(12) === 0);
    moreButton.toggleAttribute('data-m-empty', left(8) === 0);
  };

  moreButton.addEventListener('click', () => {
    const size = step();
    const from = size + extra;
    cells.slice(from, from + size).forEach((cell) => cell.setAttribute('data-shown', ''));
    extra += size;
    renderMore();
  });

  renderMore();
}

// ===== Вкладки «Что ещё понадобится»: role="tablist", стрелки, без перезагрузки =====

$$('[role="tablist"][data-tabs]').forEach((tablist) => {
  const tabs = $$('[role="tab"]', tablist);

  const select = (tab, focus = false) => {
    tabs.forEach((item) => {
      const on = item === tab;
      item.setAttribute('aria-selected', String(on));
      item.tabIndex = on ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    const link = document.getElementById(tab.dataset.link);
    $$('[data-tab-link]').forEach((node) => (node.hidden = node !== link));
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      const keys = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
      if (!(event.key in keys)) return;
      event.preventDefault();
      select(tabs[(keys[event.key] + tabs.length) % tabs.length], true);
    });
  });
});

// ===== Старт: ссылка «Поделиться» (?saved=…), #saved, подсветка закладок =====

const shared = new URLSearchParams(location.search).get('saved');
if (shared) {
  const slugs = shared.split(',').filter((slug) => catalog[slug]);
  // Ссылка добавляет товары к списку, не стирая уже отложенное
  mergeSaved(slugs);
  history.replaceState(null, '', location.pathname + location.hash);
}

syncMarks();
if ((shared || location.hash === '#saved') && knownSaved().length) openSaved();

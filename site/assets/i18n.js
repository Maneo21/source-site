// Moteur de langue des pages du site.
// Les textes vivent dans /i18n/<code>.json ; la liste des langues dans /i18n/languages.json.
// Ajouter une langue = un fichier de textes + une ligne dans languages.json (voir LISEZ-MOI).
import { get, interpolate, buildVars, isPlaceholder } from './vars.js?v=8a517853cc';

const KEY = 'lang';
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mark = s => (isPlaceholder(s) ? `<mark class="todo">${esc(s)}</mark>` : esc(s));

const cache = new Map();
export const json = url => {
  if (!cache.has(url)) cache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }));
  return cache.get(url);
};

export const I = {
  lang: null, info: null, dict: {}, config: null, langs: [], vars: {},
  async init() {
    [this.config, this.langs] = await Promise.all([json('/config.json'), json('/i18n/languages.json')]);
    return this;
  },
  has(code) { return !!code && this.langs.some(l => l.code === code); },
  urlLang() {
    const q = new URLSearchParams(location.search).get('lang');
    const p = location.pathname.split('/')[1];
    return [q, p].find(c => this.has(c)) || null;
  },
  stored() { try { const c = localStorage.getItem(KEY); return this.has(c) ? c : null; } catch { return null; } },
  remember(code) { try { localStorage.setItem(KEY, code); } catch { /* navigation privée */ } },
  browser() {
    for (const l of navigator.languages || [navigator.language || '']) {
      const c = String(l).slice(0, 2).toLowerCase();
      if (this.has(c)) return c;
    }
    return this.langs[0].code;
  },
  async set(code, { persist = true } = {}) {
    if (!this.has(code)) code = this.langs[0].code;
    const dict = await json(`/i18n/${code}.json`);
    this.lang = code;
    this.info = this.langs.find(l => l.code === code);
    this.dict = dict;
    this.vars = buildVars(this.config, dict, this.info);
    document.documentElement.lang = code;
    if (persist) this.remember(code);
    this.apply();
    return this;
  },
  raw(key) { return get(this.dict, key); },
  t(key, vars) { const s = get(this.dict, key); return s == null ? '' : interpolate(s, { ...this.vars, ...vars }); },
  html(key, vars) { const s = get(this.dict, key); return s == null ? '' : interpolate(s, { ...this.vars, ...vars }, mark); },
  fmt(str, vars, html = false) { return interpolate(str, { ...this.vars, ...vars }, html ? mark : null); },
  apply(root = document) {
    for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = this.t(el.dataset.i18n);
    for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = this.html(el.dataset.i18nHtml);
    for (const el of root.querySelectorAll('[data-i18n-attr]')) {
      for (const pair of el.dataset.i18nAttr.split(',')) {
        const [attr, key] = pair.split(':').map(s => s.trim());
        el.setAttribute(attr, this.t(key));
      }
    }
    for (const el of root.querySelectorAll('[data-price]')) { const id = el.dataset.price === 'creation' ? 'essentielle' : el.dataset.price || 'guide'; el.textContent = this.vars.prices?.[id] ?? this.vars.price; }
    for (const el of root.querySelectorAll('[data-price-was]')) { const id = el.dataset.priceWas, was = this.vars.pricesRegular?.[id], now = this.vars.prices?.[id]; el.textContent = was && was !== now ? was : ''; el.hidden = !was || was === now; }
    for (const el of root.querySelectorAll('[data-brand]')) el.textContent = this.config.brand;
    for (const el of root.querySelectorAll('[data-contact]')) {
      const c = this.config.contactEmail;
      if (isPlaceholder(c)) el.removeAttribute('href'); else el.href = 'mailto:' + c;
    }
  },
};

// Sélecteur FR / EN, partagé par toutes les pages.
export function langSwitch(el, onPick) {
  if (!el) return;
  el.style.setProperty('--n', I.langs.length);
  el.innerHTML = '<span class="ls-pill" aria-hidden="true"></span>' +
    I.langs.map(l => `<button type="button" data-lang="${l.code}" lang="${l.code}" aria-label="${esc(l.name)}">${esc(l.short)}</button>`).join('');
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-lang]');
    if (b && b.dataset.lang !== I.lang) onPick(b.dataset.lang);
  });
  syncSwitch(el);
}
export function syncSwitch(el) {
  if (!el) return;
  const i = Math.max(0, I.langs.findIndex(l => l.code === I.lang));
  el.style.setProperty('--i', i);
  for (const b of el.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === I.lang));
}

// Changement de langue avec un fondu rapide ; met aussi à jour l'adresse si elle porte la langue.
export async function swapLang(code, after) {
  const html = document.documentElement;
  const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  html.classList.add('is-swapping');
  await new Promise(r => setTimeout(r, rm ? 0 : 190));
  await I.set(code);
  const u = new URL(location.href);
  if (u.searchParams.has('lang')) u.searchParams.set('lang', code);
  const seg = u.pathname.split('/');
  if (I.has(seg[1])) { seg[1] = code; u.pathname = seg.join('/'); }
  if (u.href !== location.href) history.replaceState(history.state, '', u);
  await after?.();
  requestAnimationFrame(() => html.classList.remove('is-swapping'));
}

// Mentions légales, CGV et confidentialité, dans la langue choisie (/i18n/legal.<code>.json).
import { I, esc, json, langSwitch, syncSwitch, swapLang } from './i18n.js?v=f72cd7a6ed';

const $ = (s, r = document) => r.querySelector(s);
const DOCS = ['mentions', 'cgv', 'confidentialite'];
// Notes de travail (éléments à compléter) : seulement dans l'aperçu sur le Mac, jamais sur le site public.
const PREVIEW = /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname);
let legal = null;

function where() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (DOCS.includes(h)) return { doc: h };
  if (h === 'retractation') return { doc: 'cgv', anchor: 'retractation' };
  return { doc: 'mentions' };
}

function render(scroll = true) {
  const { doc, anchor } = where(), d = legal[doc];
  $('[data-doc-body]').innerHTML =
    `<h1>${esc(d.title)}</h1>` + (d.updated ? `<p class="updated">${I.fmt(d.updated, {}, true)}</p>` : '') +
    d.sections.map(s => `<h2${s.id ? ` id="${s.id}"` : ''}>${esc(s.h)}</h2>${I.fmt(s.html + (s.ifMediator ? (I.vars.mediator.name ? s.ifMediator : s.ifNoMediator) : ''), {}, true)}`).join('');
  for (const a of document.querySelectorAll('[data-doc]')) {
    if (a.dataset.doc === doc) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  const draft = $('[data-draft]');
  const todo = !I.vars.mediator.name || !!$('[data-doc-body] mark.todo');
  draft.hidden = !(PREVIEW && todo);
  draft.textContent = 'Aperçu local : ' + (I.vars.mediator.name ? 'éléments surlignés à compléter.' : 'médiateur de la consommation à renseigner dans site/config.json (mediator).');
  if (!PREVIEW) for (const m of document.querySelectorAll('[data-doc-body] mark.todo')) m.replaceWith(m.textContent);
  document.title = `${d.title} · ${I.config.brand}`;
  syncSwitch($('[data-langswitch]'));
  if (anchor) requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ block: 'start' }));
  else if (scroll) scrollTo(0, 0);
}

async function load() { legal = await json(`/i18n/legal.${I.lang}.json`); }

async function boot() {
  await I.init();
  await I.set(I.urlLang() || I.stored() || I.browser(), { persist: false });
  await load();
  langSwitch($('[data-langswitch]'), code => swapLang(code, async () => { await load(); render(false); }));
  addEventListener('hashchange', () => render());
  render(false);
}
boot();

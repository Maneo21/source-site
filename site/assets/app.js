// Page de vente : accueil de langue, animations, vidéos des trois univers, les deux formules, récapitulatif avant paiement.
import { I, esc, langSwitch, syncSwitch, swapLang } from './i18n.js?v=ead063818e';
import { pick } from './vars.js?v=8a517853cc';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const WIDE = matchMedia('(min-width: 900px)');
const SAVE = !!(navigator.connection && navigator.connection.saveData);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const wait = ms => new Promise(r => setTimeout(r, ms));
const MEDIA = '/assets/media/';

// Les réalisations, dans l'ordre d'affichage. Fichiers : <key>-mini.mp4 (mur de l'accroche), <key>-teaser.mp4 (extrait muet), <key>.mp4 (vidéo complète, avec le son), <key>-poster.webp.
// « kind » est le type de projet présélectionné dans le récapitulatif et transmis à Stripe.
const U = [
  { key: 'bmw', kind: 'pub', dur: '0:20', wide: true },
  { key: 'commeca', kind: 'pub', dur: '0:09' },
  { key: 'sites', kind: 'site', dur: '0:22' },
  { key: 'roadster', kind: 'pub', dur: '0:15', wide: true },
  { key: 'digi', kind: 'pub', dur: '0:16' },
];
// Les deux formules. « guide » : l'échange personnalisé (je t'explique). « creation » : la création sur mesure (je réalise et je livre).
// Chaque formule a son lien de paiement Stripe et ses types de projet.
// « guide » : Je te guide. Trois créations : studio, pro (mise en avant), essentielle. HOW_TABS : les deux onglets du déroulé.
const TIERS = ['studio', 'pro', 'essentielle'], OFFERS = ['guide', ...TIERS], HOW_TABS = ['creation', 'guide'];
const isTier = o => TIERS.includes(o);
const KINDS = { guide: ['site', 'pub', 'motion', 'autre'], studio: ['pub', 'motion', 'site'], pro: ['pub', 'motion', 'site'], essentielle: ['pub', 'motion'] };
// Aperçu sur le Mac (et non site public). « ?public=1 » montre l'aperçu comme le verra un visiteur.
const PREVIEW = /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname) && !/[?&]public=1(&|$)/.test(location.search);

const els = {};
let started = false, overlays = 0;
let lastKind = null, kindTouched = false;
let offer = 'guide', howTab = 'creation';

/* ---------- appui volontaire, glissement ou clic fantôme ? ---------- */
// Dans certains navigateurs intégrés (TikTok, Instagram…), un « clic » peut arriver à la fin d'un défilement,
// sans véritable appui. On suit donc chaque geste nous-mêmes, avec les événements tactiles ET les pointeurs,
// puis on classe chaque clic :
//   'mouse'   clic de souris                         'tap'     appui net du doigt, page immobile
//   'key'     clavier, lecteur d'écran               'ghost'   clic de fin de défilement ou de glissement
//   'unknown' clic au doigt sans geste observé (refusé pour ouvrir une vidéo)
const TOUCH = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
const COARSE = matchMedia('(pointer: coarse)').matches;
const SLOP = 14; // au-delà de cette distance (px), le doigt a glissé
const G = { type: '', live: false, dirty: false, seen: false, x: 0, y: 0, sy: 0, max: 0, end: -1e9, last: -1e9 };
const KIND = new WeakMap(), ACT = new Set(['mouse', 'tap', 'key']);
let lastScroll = -1e9, closedAt = -1e9, verdict = { t: -1e9, kind: '' };

function gStart(x, y, type) {
  const now = performance.now();
  Object.assign(G, { type, live: true, seen: true, x, y, sy: scrollY, max: 0, last: now });
  // un doigt posé pendant que la page défile encore sert à l'arrêter, pas à cliquer
  G.dirty = type !== 'mouse' && now - lastScroll < 240;
}
function gMove(x, y) {
  G.last = performance.now();
  if (G.type === 'mouse') return;
  G.max = Math.max(G.max, Math.hypot(x - G.x, y - G.y));
  if (G.max > SLOP) G.dirty = true;
}
function gEnd(cancelled) {
  G.last = G.end = performance.now();
  if (G.type !== 'mouse' && (cancelled || Math.abs(scrollY - G.sy) > 2)) G.dirty = true;
  G.live = false;
}
function watchGestures() {
  const o = { capture: true, passive: true };
  addEventListener('scroll', () => { lastScroll = performance.now(); if (G.live && G.type !== 'mouse') G.dirty = true; }, { passive: true });
  document.addEventListener('pointerdown', e => gStart(e.clientX, e.clientY, e.pointerType || 'touch'), o);
  document.addEventListener('pointermove', e => { if (G.live && e.pointerType !== 'mouse') gMove(e.clientX, e.clientY); }, o);
  document.addEventListener('pointerup', () => gEnd(false), o);
  document.addEventListener('pointercancel', () => gEnd(true), o);
  // Les événements tactiles continuent pendant un défilement, et existent même là où les pointeurs manquent.
  document.addEventListener('touchstart', e => {
    const t = e.touches[0];
    if (!t) return;
    if (!(G.live && G.type !== 'mouse' && performance.now() - G.last < 120)) gStart(t.clientX, t.clientY, 'touch');
    if (e.touches.length > 1) G.dirty = true;
  }, o);
  document.addEventListener('touchmove', e => { const t = e.touches[0]; if (t && G.type !== 'mouse') gMove(t.clientX, t.clientY); }, o);
  document.addEventListener('touchend', e => { if (!e.touches.length && G.type !== 'mouse') gEnd(false); }, o);
  document.addEventListener('touchcancel', () => { if (G.type !== 'mouse') gEnd(true); }, o);
  // Premier à recevoir chaque clic : un clic fantôme s'arrête ici et n'active rien (ni vidéo, ni bouton, ni lien).
  document.addEventListener('click', e => {
    const k = kindOf(e);
    diag(`clic ${k} · ${e.target.closest?.('[data-play],[data-book],[data-step],.dcard,.ucard,a,button,summary,label')?.className?.toString().split(' ')[0] || e.target.tagName} · d${e.detail} · glissé ${Math.round(G.max)}px${G.dirty ? ' · geste écarté' : ''}`);
    if (k === 'ghost') { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
}
function kindOf(e) {
  if (KIND.has(e)) return KIND.get(e);
  const now = performance.now();
  let k;
  if (verdict.kind && now - verdict.t < 60) k = verdict.kind; // clic relayé par le navigateur (libellé → case à cocher)
  else if (e.detail === 0) k = 'key';
  else if (G.type === 'mouse' && now - G.end < 1500) k = 'mouse';
  else if (G.type && G.type !== 'mouse' && (G.live || now - G.end < 900 || now - G.last < 900)) k = !G.live && !G.dirty && Math.hypot(e.clientX - G.x, e.clientY - G.y) <= 30 ? 'tap' : 'ghost';
  else if (TOUCH && now - lastScroll < 250) k = 'ghost';
  else k = !TOUCH ? 'mouse' : G.seen ? 'unknown' : 'tap';
  KIND.set(e, k);
  if (k === 'tap' || k === 'mouse') verdict = { t: now, kind: k };
  return k;
}
// Une vidéo ne s'ouvre que sur un appui reconnu, et jamais dans l'instant qui suit la fermeture du lecteur.
const mayOpen = e => ACT.has(kindOf(e)) && performance.now() - closedAt > 400;

// Journal à l'écran, seulement avec « ?diag=1 » dans l'adresse : sert à comprendre un navigateur intégré.
const DIAG = /[?&]diag=1(&|$)/.test(location.search);
let diagEl = null, diagLines = [];
function diag(msg) {
  if (!DIAG) return;
  if (!diagEl) {
    diagEl = document.createElement('pre');
    diagEl.style.cssText = 'position:fixed;z-index:999;left:6px;right:6px;bottom:calc(env(safe-area-inset-bottom) + 92px);margin:0;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.86);color:#D2FF4D;font:10px/1.35 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-all;pointer-events:none';
    document.body.append(diagEl);
  }
  diagLines = [...diagLines, `${(performance.now() / 1000).toFixed(1)}s ${msg}`].slice(-11);
  diagEl.textContent = `${navigator.userAgent.slice(-96)}\npointeurs:${'onpointerdown' in window ? 'oui' : 'non'} tactile:${TOUCH ? 'oui' : 'non'} grossier:${COARSE ? 'oui' : 'non'}\n${diagLines.join('\n')}`;
}

/* ---------- titres découpés en mots ---------- */
function split(el) {
  let i = 0;
  const walk = node => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const part of child.textContent.split(/([ \n\t]+)/)) {
          if (!part) continue;
          if (/^[ \n\t]+$/.test(part)) { frag.append(' '); continue; }
          const w = document.createElement('span'); w.className = 'w';
          const wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = part; wi.style.setProperty('--i', i++);
          w.append(wi); frag.append(w);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && !child.classList.contains('w')) walk(child);
    }
  };
  walk(el);
}

/* ---------- textes qui dépendent de la langue ---------- */
function pageText() {
  document.title = I.t('meta.title');
  $('meta[name="description"]')?.setAttribute('content', I.t('meta.description'));
  // *mot* dans un titre : mis en avant en citron
  for (const el of $$('[data-split][data-i18n]')) { const t = I.t(el.dataset.i18n); if (t.includes('*')) el.innerHTML = esc(t).replace(/\*([^*]+)\*/g, '<em class="acc">$1</em>'); }
  $$('[data-split]').forEach(split);
  buildRolls();
  buildExample();
  buildHow();
  offerState();
  sheetText();
  buildSig();
  buildRot();
  buildReviews();
  buildTiers();
  heroPick();
  syncSwitch($('[data-langswitch]'));
  if ($('[data-tt-lang]')?.childElementCount) syncSwitch($('[data-tt-lang]'));
}

// Les prix des deux formules : chaque chiffre est une colonne qui défile jusqu'à sa valeur.
function buildRolls() {
  for (const el of $$('[data-roll]')) {
    const s = el.dataset.roll === 'creation' ? I.vars.priceCreation : I.vars.price;
    let k = 0;
    el.innerHTML = `<span class="sr">${esc(s)}</span>` + [...s].map(ch => {
      if (/\d/.test(ch)) return `<span class="dg" aria-hidden="true"><span class="dg-col" style="--v:${ch};--k:${k++}">${Array.from({ length: 20 }, (_, n) => `<span>${n % 10}</span>`).join('')}</span></span>`;
      if (/\s/.test(ch)) return '<span class="sp" aria-hidden="true"></span>';
      if (/[.,]/.test(ch)) return `<span class="pt" aria-hidden="true">${ch}</span>`;
      return `<span class="cur" aria-hidden="true">${esc(ch)}</span>`;
    }).join('');
  }
}

// Comment ça se passe : trois étapes et un aperçu, pour la formule de l'onglet choisi.
// Une icône par étape : réserver, décrire, puis recevoir (la création, ou la réponse).
const ST_IC = {
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
  play: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="3"/><path d="M10.5 9.5l4 2.5-4 2.5z"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-11.2 6.5L4 19l1.1-4.4A7.5 7.5 0 1 1 20 11.5z"/></svg>',
};
const STEP_ICONS = { creation: ['lock', 'pen', 'play'], guide: ['lock', 'pen', 'chat'] };
function buildHow(animate = false) {
  const box = $('[data-steps]'), tabs = $('[data-tabs]');
  if (!box || !tabs) return;
  const steps = I.raw(`how.${howTab}.steps`) || [];
  const fill = () => {
    $$('.step', box).forEach((li, k) => {
      $('[data-step-t]', li).textContent = I.fmt(steps[k]?.t || '');
      $('[data-step-d]', li).textContent = I.fmt(steps[k]?.d || '');
      const ic = $('[data-step-ic]', li); if (ic) ic.innerHTML = ST_IC[STEP_ICONS[howTab][k]] || '';
    });
    box.classList.remove('swap');
  };
  tabs.style.setProperty('--i', HOW_TABS.indexOf(howTab));
  for (const b of $$('[data-tab]', tabs)) b.setAttribute('aria-selected', String(b.dataset.tab === howTab));
  for (const v of $$('[data-view]')) v.hidden = v.dataset.view !== howTab;
  if (animate && !RM) { box.classList.add('swap'); setTimeout(fill, 220); } else fill();
  if (animate && howTab === 'guide') $('[data-type]')?._type?.();
}

let typed = false, typeTimer = 0;
function buildExample() {
  const el = $('[data-type]');
  if (!el) return;
  const full = I.t('get.exPrompt');
  clearTimeout(typeTimer);
  el.innerHTML = `<span class="sr">${esc(full)}</span><span class="ghost" aria-hidden="true">${esc(full)}</span><span class="typed" aria-hidden="true"></span>`;
  const out = $('.typed', el);
  if (typed || RM) { out.textContent = full; el._type = null; return; }
  el._type = () => {
    typed = true;
    const txt = document.createTextNode(''), caret = document.createElement('i');
    caret.className = 'caret-t'; out.append(txt, caret);
    let i = 0;
    const step = () => {
      i = Math.min(full.length, i + 1 + (Math.random() < .35 ? 1 : 0));
      txt.data = full.slice(0, i);
      if (i < full.length) typeTimer = setTimeout(step, 18 + Math.random() * 34);
    };
    typeTimer = setTimeout(step, 500);
  };
}

// L'accueil : la formule choisie (Pro d'avance), ce qu'elle comprend, et le bouton qui ouvre son récapitulatif.
let heroTier = 'pro';
function heroPick(id = heroTier) {
  heroTier = id;
  for (const b of $$('[data-pick-tier]')) { const on = b.dataset.pickTier === id; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', String(on)); }
  const v = { ...I.vars.tiers?.[id] }, sum = $('[data-ho-sum]'), cta = $('[data-ho-cta]');
  if (sum) sum.innerHTML = I.t(`offers.${id}.sum`, v).split(' · ').map((x, k) => `<span${k ? '' : ' class="on"'}>${esc(x)}</span>`).join('');
  if (cta) { cta.dataset.book = id; $('[data-ho-label]', cta).textContent = I.t('hero.choose', { name: I.t(`offers.${id}.name`), price: I.vars.prices?.[id] }); }
  offerState();
}
function buildTiers() {
  for (const el of $$('[data-ti18n]')) {
    const host = el.closest('[data-tier]') || el.closest('[data-trio]'), id = host?.dataset.tier || host?.dataset.trio, k = el.dataset.ti18n, v = I.vars.tiers?.[id] || {};
    el.textContent = k.startsWith('{') ? I.fmt(k, v) : I.t(k, v);
  }
  // le badge de l'Essentielle annonce l'offre de lancement tant qu'elle dure
  const eb = $('[data-tier="essentielle"] .tier-badge span');
  if (eb) eb.textContent = I.t(I.vars.launchOn && I.config.launch?.essentielle ? 'offers.essentielle.badgeLaunch' : 'offers.essentielle.badge');
  $('[data-tier="essentielle"]')?.classList.toggle('is-launch', !!I.vars.launchOn);
  const lb = $('[data-launch]');
  if (lb) { lb.hidden = !I.vars.launchOn; $('[data-launch-text]', lb).textContent = I.vars.launchOn ? I.t('offers.launchHero') : ''; tickLaunch(); }
  for (const td of $$('#cmpbox .cmp tbody td')) { const t = td.textContent.trim(); td.classList.toggle('yes', t === '✓'); td.classList.toggle('no', t === '—'); }
  const lf = $('[data-launch-full]');
  if (lf) { lf.hidden = !I.vars.launchOn; $('span', lf).textContent = I.vars.launchOn ? I.t('offers.launch') : ''; }
}
// Compte à rebours de l'offre de lancement ; à l'heure dite, les prix normaux et les nouveaux liens prennent le relais.
let launchTimer = 0;
function tickLaunch() {
  clearTimeout(launchTimer);
  const el = $('[data-countdown]'), until = Date.parse(I.config.launch?.until || '');
  if (!el || !I.vars.launchOn || !Number.isFinite(until)) return;
  const left = until - Date.now();
  if (left <= 0) { I.set(I.lang, { persist: false }).then(() => { pageText(); kick(); }); return; }
  const d = Math.floor(left / 864e5), hh = Math.floor(left / 36e5) % 24, mm = Math.floor(left / 6e4) % 60;
  const t = d ? `${d} j ${hh} h` : hh ? `${hh} h ${String(mm).padStart(2, '0')} min` : `${mm} min`;
  el.textContent = I.t('offers.launchLeft', { t: I.lang === 'en' ? t.replace(' j ', ' d ') : t });
  launchTimer = setTimeout(tickLaunch, 30000);
}

function buildSig() {
  const c = I.config.creator || {}, name = c.name || '';
  const letter = /^\[/.test(name) || !name ? '✦' : name.trim()[0].toUpperCase();
  for (const el of $$('[data-initial]')) el.textContent = letter;
  // Photo et chiffres : affichés seulement s'ils sont renseignés dans config.json. Rien n'est inventé.
  const photo = String(c.photo || '').trim(), av = $('.sig .avatar');
  if (av && /^\/[\w./-]+\.(webp|jpe?g|png)$/i.test(photo)) { av.style.backgroundImage = `url("${photo}")`; av.classList.add('has-photo'); }
  const tt = String(c.tiktok || '').replace(/^@/, '');
  const a = $('[data-tiktok]');
  if (a && tt) { a.href = `https://www.tiktok.com/@${encodeURIComponent(tt)}`; a.hidden = false; }
  const items = (Array.isArray(I.config.proof) ? I.config.proof : [])
    .map(p => ({ value: String(pick(p?.value, I.lang) ?? '').trim(), label: String(pick(p?.label, I.lang) ?? '').trim() }))
    .filter(p => p.value);
  const proof = $('[data-proof]'), line = $('[data-proofline]');
  if (proof) {
    proof.hidden = !items.length;
    proof.innerHTML = items.map(p => `<li><strong>${esc(p.value)}</strong><span>${esc(p.label)}</span></li>`).join('');
  }
  if (line) {
    const ICO = { users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.9-3 3-4.6 5.5-4.6s4.6 1.6 5.5 4.6"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.6c1.5.6 2.5 2.1 3 4.4"/></svg>', eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>', heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/></svg>' };
    const raw = (Array.isArray(I.config.proof) ? I.config.proof : []).filter(p => String(pick(p?.value, I.lang) ?? '').trim());
    line.hidden = !items.length;
    line.innerHTML = items.slice(0, 2).map((p, k) => `<span class="hp-i">${ICO[raw[k]?.icon] || ''}<b>${esc(p.value)}</b> ${esc(p.label)}</span>`).join('');
  }
}

// Liens de paiement Stripe (site/config.json) : « paymentLink » pour l'échange, « creation.paymentLink » pour la création.
// Un lien de test contient « /test_ ».
const payLink = (o = offer) => {
  const c = I.config, L = c.launch || {};
  if (I.vars.launchOn && L[o]?.paymentLink) return String(L[o].paymentLink).trim();
  return String((o === 'guide' ? c.paymentLink : c.creation?.tiers?.[o]?.paymentLink) || '').trim();
};
const validLink = o => { try { return new URL(payLink(o)).protocol === 'https:'; } catch { return false; } };
// Une formule sans lien de paiement est annoncée « bientôt disponible » sur le site public et ne peut pas être commandée.
// L'aperçu local garde tout actif, pour montrer le parcours complet.
const isOpen = o => validLink(o) || PREVIEW;
const firstOpenTier = () => ['pro', 'essentielle', 'studio'].find(isOpen) || null;
function offerState() {
  for (const o of OFFERS) {
    const open = isOpen(o);
    root.classList.toggle('no-' + o, !open);
    for (const b of $$(`[data-book="${o}"]`)) b.disabled = !open;
  }
  for (const el of $$('[data-soon]')) {
    const o = el.closest('[data-book]')?.dataset.book || el.closest('[data-tier]')?.dataset.tier;
    el.textContent = I.t(!o || isOpen(o) ? el.dataset.soon : 'offers.soon');
  }
}
function modeTag() {
  const el = $('[data-mode-tag]');
  if (!el) return;
  const test = /\/test_/.test(payLink());
  el.hidden = !test;
  if (test) el.textContent = I.t('sheet.test');
}

/* ---------- apparitions ---------- */
const io = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in');
    io.unobserve(e.target);
    $('[data-type]', e.target)?._type?.();
  }
}, { rootMargin: '0px 0px -10% 0px' });

function replayVisible() {
  for (const el of $$('[data-split].in')) {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) continue;
    el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  }
}

/* ---------- accueil : choix de la langue ---------- */
function welcome() {
  root.classList.add('is-welcome');
  const w = $('#welcome'), box = $('[data-langs]'), hello = $('[data-hello]');
  for (const el of [$('main'), $('[data-top]'), $('.foot')]) el.inert = true;
  // Une langue ajoutée dans languages.json mais pas encore dans la page apparaît quand même.
  for (const l of I.langs) {
    if (!$(`[data-code="${l.code}"]`, box)) box.insertAdjacentHTML('beforeend', `<button type="button" class="wl-btn" data-code="${l.code}" lang="${l.code}"><img class="flag" src="/assets/flags/${l.flag}.svg" alt="" width="36" height="36"><span class="wl-name">${esc(l.name)}</span><span class="wl-go" aria-hidden="true">→</span></button>`);
    if (!$(`[lang="${l.code}"]`, hello)) hello.insertAdjacentHTML('beforeend', `<span lang="${l.code}">${esc(l.hello)}</span>`);
  }
  $$('.wl-btn', box).forEach((b, k) => b.style.setProperty('--k', k));
  if (!$('.is-sug', box)) ($(`[data-code="${I.browser()}"]`, box) || box.firstElementChild).classList.add('is-sug');
  if (!$('.on', hello)) hello.firstElementChild.classList.add('on');

  const spans = $$('span', hello);
  let h = Math.max(0, spans.findIndex(x => x.classList.contains('on')));
  const cycle = spans.length > 1 && !RM ? setInterval(() => {
    const a = spans[h], b = spans[(h + 1) % spans.length];
    b.style.transition = 'none'; b.classList.remove('off'); void b.offsetWidth; b.style.transition = '';
    a.classList.replace('on', 'off'); b.classList.add('on');
    h = (h + 1) % spans.length;
  }, 1800) : 0;

  w.tabIndex = -1;
  w.focus({ preventScroll: true });
  let done = false;
  const choose = async (code, btn) => {
    if (done) return;
    done = true; clearInterval(cycle);
    btn?.classList.add('is-picked');
    if (code !== I.lang) { await I.set(code); pageText(); } else I.remember(code);
    await wait(RM ? 0 : 170);
    reveal(w, btn || box);
  };
  // Le choix peut avoir été fait avant le chargement de ce script (bouton déjà actif dans la page).
  window.__onPick = () => { const p = window.__pick; if (p) choose(p.code, p.el); };
  if (window.__pick) window.__onPick();
  box.addEventListener('click', e => { const b = e.target.closest('[data-code]'); if (b) choose(b.dataset.code, b); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !done) { const b = $('.is-sug', box); choose(b.dataset.code, b); } });
}

// L'écran d'accueil s'ouvre en cercle depuis le bouton touché, et le site démarre.
function reveal(w, from) {
  const r = from.getBoundingClientRect();
  w.style.setProperty('--x', `${r.left + r.width / 2}px`);
  w.style.setProperty('--y', `${r.top + r.height / 2}px`);
  w.classList.add('out');
  start();
  setTimeout(() => { root.classList.remove('is-welcome', 'is-tt'); w.hidden = true; }, RM ? 0 : 1150);
}

/* ---------- arrivée depuis le navigateur intégré de TikTok ---------- */
// La page le repère avant tout affichage (classe « is-tt », posée dans index.html) et propose
// d'ouvrir le site dans le vrai navigateur. Il n'y a pas de « Rester ici » (demande d'Evan, 22 oct.) : dans TikTok, le site ne s'ouvre pas,
// seule l'ouverture dans le vrai navigateur y mène. La langue est détectée, et se change sur place si besoin.
const fromTikTok = () => root.classList.contains('is-tt');
function ttHint() {
  return new Promise(resolve => {
    const w = $('#welcome');
    for (const el of [$('main'), $('[data-top]'), $('.foot')]) el.inert = true;
    // L'adresse porte la langue : ouverte dans le navigateur, la page arrive directement sur le site.
    const urlLang = () => {
      try {
        const u = new URL(location.href);
        u.searchParams.set('lang', I.lang);
        u.searchParams.delete('tiktok');
        history.replaceState(history.state, '', u);
      } catch { /* adresse inchangée */ }
    };
    urlLang();
    const sw = $('[data-tt-lang]', w);
    if (sw && !sw.childElementCount) langSwitch(sw, async code => { await I.set(code, { persist: false }); pageText(); urlLang(); });
    w.hidden = false;
    w.setAttribute('aria-labelledby', 'tt-title');
    w.classList.add('show-tt');
    requestAnimationFrame(() => requestAnimationFrame(() => $('.tt-title', w)?.classList.add('in')));
    try { sessionStorage.removeItem('tt'); localStorage.removeItem('tt'); } catch { /* navigation privée */ }
  });
}

function start() {
  if (started) return;
  started = true;
  for (const el of [$('main'), $('[data-top]'), $('.foot')]) el.inert = false;
  requestAnimationFrame(() => $$('.hero [data-h]').forEach(el => el.classList.add('in')));
  $$('[data-r], [data-split]').forEach(el => { if (!el.closest('.hero')) io.observe(el); });
  initTiers();
  setTimeout(() => { initWall(); initReel(); initMinis(); }, RM ? 0 : 450);
  if (!RM && $('[data-rot]')) Rt.timer = setInterval(rotNext, 2600);
  setTimeout(updSticky, RM ? 0 : 1700);
  kick();
}

/* ---------- accroche : le mur des créations ---------- */
// Trois colonnes d'affiches qui défilent lentement (CSS). Dans chaque colonne, quelques tuiles jouent un extrait muet très léger
// (<clé>-mini.mp4, 360 × 640, 5 s en boucle), seulement quand elles sont à l'écran : six au plus sur ordinateur, trois sur téléphone.
// Avec « économie de données » ou le mouvement réduit : les affiches seules.
const autoplay = !RM && !SAVE;
const Wl = { tiles: [], vis: false };
function initWall() {
  const wall = $('[data-wall]');
  if (!wall) return;
  // une seule tuile animée par création (et sa copie, quatre plus bas, qui sert à la boucle) : quatre sur ordinateur, trois sur téléphone
  const wide = WIDE.matches, max = wide ? 4 : 3, used = new Set(), live = new Set(), cols = $$('.wcol', wall);
  for (const i of wide ? [0, 2, 1, 3] : [1, 2, 0, 3]) for (const col of cols) {
    const ts = $$('.wt', col), t = ts[i];
    if (t && used.size < max && !used.has(t.dataset.k)) { used.add(t.dataset.k); live.add(t); if (ts[i + 4]) live.add(ts[i + 4]); }
  }
  cols.forEach(col => $$('.wt', col).forEach(t => {
    if (!autoplay || !live.has(t)) return;
    const v = document.createElement('video');
    Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'none' });
    v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1;
    v.dataset.src = `${MEDIA}${t.dataset.k}-mini.mp4`;
    v.addEventListener('playing', () => t.classList.add('playing'));
    t.append(v);
    Wl.tiles.push({ t, v, on: false });
  }));
  const tio = new IntersectionObserver(es => { for (const e of es) { const w = Wl.tiles.find(x => x.t === e.target); if (w) w.on = e.isIntersecting; } wallPlay(); });
  Wl.tiles.forEach(w => tio.observe(w.t));
  new IntersectionObserver(es => { Wl.vis = es[0].isIntersecting; wall.classList.toggle('still', !Wl.vis); wallPlay(); }).observe(wall);
}
function wallPlay() {
  for (const w of Wl.tiles) {
    if (Wl.vis && w.on && !P.open && !document.hidden) {
      if (!w.v.getAttribute('src')) w.v.src = w.v.dataset.src;
      w.v.play().catch(() => {});
    } else if (!w.v.paused) w.v.pause();
  }
}

// Le mot du titre (« une pub », « du motion », « un site ») change toutes les 2,6 s, sur sa pastille citron.
const Rt = { i: 0, timer: 0 };
function buildRot() {
  const rot = $('[data-rot]'), words = I.raw('hero.words') || [];
  if (!rot || !words.length) return;
  rot.innerHTML = words.map((w, k) => `<span class="rot-w${k === Rt.i % words.length ? ' on' : ''}">${esc(w)}</span>`).join('');
  requestAnimationFrame(sizeRot);
}
function sizeRot() {
  const rot = $('[data-rot]'), on = rot && $('.rot-w.on', rot);
  if (!on) return;
  // sur un très petit écran, un mot long (« une vidéo motion ») se réduit pour que la pastille reste dans la largeur
  rot.style.fontSize = '';
  const max = rot.parentElement.getBoundingClientRect().width, pad = parseFloat(getComputedStyle(rot).fontSize) * .36;
  let w = on.getBoundingClientRect().width;
  if (w + pad > max) { const k = max / (w + pad); rot.style.fontSize = `${(k * 100).toFixed(1)}%`; w *= k; }
  rot.style.setProperty('--w', `${w}px`);
}
function rotNext() {
  const ws = $$('[data-rot] .rot-w');
  if (ws.length < 2 || document.hidden) return;
  const a = ws[Rt.i % ws.length];
  Rt.i++;
  const b = ws[Rt.i % ws.length];
  a.classList.remove('on'); a.classList.add('out');
  setTimeout(() => a.classList.remove('out'), 650);
  b.classList.add('on');
  sizeRot();
}

/* ---------- les réalisations ---------- */
// Chaque vidéo joue son extrait muet (<clé>-teaser.mp4) quand elle est bien à l'écran ; deux au plus à la fois.
// Le son : seulement dans le lecteur, au toucher du bouton (ou au clic de souris sur la vidéo).
const Rl = { tiles: [] };
function initReel() {
  const box = $('[data-reel]');
  if (!box) return;
  Rl.tiles = $$('[data-reel] .rt, [data-ex] .rt').map(t => ({ t, v: $('video', t), r: 0 }));
  for (const x of Rl.tiles) x.v.addEventListener('playing', () => x.t.classList.add('playing'));
  const io2 = new IntersectionObserver(es => {
    for (const e of es) { const x = Rl.tiles.find(y => y.t === e.target); if (!x) continue; x.r = e.intersectionRatio; if (e.isIntersecting) x.t.classList.add('in'); }
    reelPlay();
  }, { threshold: [0, .25, .5, .75, 1] });
  Rl.tiles.forEach(x => io2.observe(x.t));
}
function reelPlay() {
  const on = autoplay && !P.open && !document.hidden;
  const best = Rl.tiles.filter(x => x.r >= .5).sort((a, b) => b.r - a.r).slice(0, 2);
  for (const x of Rl.tiles) {
    if (on && best.includes(x)) { if (!x.v.getAttribute('src')) x.v.src = `${MEDIA}${x.t.dataset.k}-teaser.mp4`; x.v.play().catch(() => {}); }
    else if (!x.v.paused) x.v.pause();
  }
}

// L'exemple de création dans la formule « Je crée pour toi » : un extrait muet, joué seulement quand il est à l'écran.
function initMinis() {
  if (!autoplay) return;
  const mio = new IntersectionObserver(es => {
    for (const e of es) {
      const v = e.target;
      if (e.isIntersecting && !P.open) { if (!v.getAttribute('src')) v.src = `${MEDIA}${v.dataset.mini}-mini.mp4`; v.play().then(() => v.parentElement.classList.add('playing')).catch(() => {}); }
      else if (!v.paused) v.pause();
    }
  }, { threshold: .3 });
  $$('video[data-mini]').forEach(v => mio.observe(v));
}

// Pendant que le lecteur est ouvert, rien d'autre ne joue.
function mediaHold() {
  wallPlay();
  reelPlay();
  if (P.open) $$('video[data-mini]').forEach(v => v.pause());
}

/* ---------- les formules ---------- */
function goOffers() {
  const box = $('.hero-offers');
  if (!box) return;
  scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
  box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
}
function centerTier(id, smooth = true) {
  const rail = $('[data-tiers]'), card = rail && $(`[data-tier="${id}"]`, rail);
  if (!card || rail.scrollWidth <= rail.clientWidth + 2) return;
  rail.scrollTo({ left: card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2, behavior: smooth && !RM ? 'smooth' : 'auto' });
}
function initTiers() {
  for (const b of $$('[data-pick-tier]')) b.addEventListener('click', () => heroPick(b.dataset.pickTier));
  const rail = $('[data-tiers]');
  if (!rail) return;
  const cards = $$('.tier', rail), dots = $$('.tier-dots i');
  requestAnimationFrame(() => centerTier('pro', false));
  let t = 0;
  rail.addEventListener('scroll', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const r = rail.getBoundingClientRect(), mid = r.left + r.width / 2;
      let best = 0, bd = Infinity;
      cards.forEach((c, k) => { const cr = c.getBoundingClientRect(), d = Math.abs(cr.left + cr.width / 2 - mid); if (d < bd) { bd = d; best = k; } });
      cards.forEach((c, k) => c.classList.toggle('centered', k === best));
      dots.forEach((d, k) => d.classList.toggle('on', k === best));
      $$('[data-tier-go]').forEach(b => { const on = b.dataset.tierGo === cards[best]?.dataset.tier; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
    }, 60);
  }, { passive: true });
  // les cartes apparaissent l'une après l'autre quand la section arrive à l'écran
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { rail.classList.add('in'); o.disconnect(); } }, { threshold: .15 }).observe(rail);
  addEventListener('resize', () => centerTier('pro', false));
  for (const b of $$('[data-tier-go]')) b.addEventListener('click', () => {
    centerTier(b.dataset.tierGo);
    // la carte choisie s'allume un instant, et la bande des cartes vient à l'écran
    const card = $(`.tier[data-tier="${b.dataset.tierGo}"]`);
    if (card) { card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash'); }
    const wrap = $('.tiers-wrap'), r = wrap?.getBoundingClientRect();
    if (r && (r.top > innerHeight * .55 || r.bottom < 120)) scrollTo({ top: scrollY + r.top - 90, behavior: RM ? 'auto' : 'smooth' });
  });
}

// Le comparatif des trois formules : une fenêtre ouverte depuis l'accueil ; « Choisir » passe au récapitulatif.
function openCompare() {
  const box = $('#cmpbox');
  if (!box || !box.hidden) return;
  lastFocus = document.activeElement;
  box.hidden = false;
  lock(true);
  requestAnimationFrame(() => requestAnimationFrame(() => { box.classList.add('open'); $('[data-cmp-close].x', box)?.focus({ preventScroll: true }); }));
}
function closeCompare(then) {
  const box = $('#cmpbox');
  if (!box || box.hidden) { then?.(); return; }
  box.classList.remove('open');
  setTimeout(() => { box.hidden = true; lock(false); if (then) then(); else lastFocus?.focus?.({ preventScroll: true }); }, 280);
}

/* ---------- avis clients ---------- */
// Uniquement de vrais avis, donnés avec l'accord de leur auteur : config.json, « reviews » :
// [{ "name": "Prénom N.", "project": { "fr": "Pub TikTok", "en": "TikTok ad" }, "text": { "fr": "…", "en": "…" }, "consent": true }]
// Sans avis (ou sans « consent »: true), la section reste masquée. Rien n'est inventé.
function buildReviews() {
  const sec = $('[data-reviews]');
  if (!sec) return;
  const items = (Array.isArray(I.config.reviews) ? I.config.reviews : [])
    .filter(r => r && r.consent === true)
    .map(r => {
      const t = pick(r.text, I.lang);
      return { name: String(pick(r.name, I.lang) ?? '').trim(), source: r.source === 'dm' ? 'dm' : 'email', capture: /^\/assets\/media\/[\w.-]+\.(jpe?g|webp|png)$/.test(r.capture || '') ? r.capture : '', parts: (Array.isArray(t) ? t : [t]).map(x => String(x ?? '').trim()).filter(Boolean) };
    })
    .filter(r => r.name && (r.capture || r.parts.length));
  sec.hidden = !items.length;
  const ICON = { email: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4 7l8 6 8-6"/></svg>', dm: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-11.2 6.5L4 19l1.1-4.4A7.5 7.5 0 1 1 20 11.5z"/></svg>' };
  // la capture d'origine, telle quelle (nom masqué) : un toucher l'ouvre en grand
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  $('[data-rv-list]', sec).innerHTML = items.map((r, i) => `<figure class="rv rv-${r.source}" style="--r:${i}">
    <figcaption class="rv-head"><span class="rv-av">${ICON[r.source]}</span><span><b>${esc(r.name)}</b><small>${esc(I.t('reviews.' + r.source))}</small></span><em class="rv-auth">${CHECK}${esc(I.t('reviews.authentic'))}</em></figcaption>
    ${r.capture ? `<button class="rv-cap rv-shot" type="button" data-cap="${esc(r.capture)}" aria-label="${esc(I.t('reviews.capture'))}"><span class="rv-bar" aria-hidden="true"><i></i><i></i><i></i><b>${esc(I.t('reviews.bar' + (r.source === 'dm' ? 'Dm' : 'Mail')))}</b></span><img src="${esc(r.capture)}" alt="${esc(I.t('reviews.alt'))}" loading="lazy" decoding="async"></button>
    <p class="rv-zoom">${esc(I.t('reviews.zoom'))}</p>` : ''}
  </figure>`).join('');
  const list = $('[data-rv-list]', sec), dots = $('[data-rv-dots]', sec);
  if (dots) {
    dots.innerHTML = items.length > 1 ? items.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('') : '';
    if (!list._dots) { list._dots = true; list.addEventListener('scroll', () => { const k = Math.round(list.scrollLeft / Math.max(1, list.scrollWidth - list.clientWidth) * (list.children.length - 1)); $$('i', dots).forEach((d, i) => d.classList.toggle('on', i === k)); }, { passive: true }); }
  }
  if (!list._io) { list._io = new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { list.classList.add('in'); o.disconnect(); } }, { threshold: .25 }); list._io.observe(list); }
}
// La capture d'origine d'un avis : plein écran, fermée d'un toucher.
function openCap(src) {
  const box = $('#capbox'), img = $('[data-capimg]', box);
  img.src = src;
  box.hidden = false;
  lock(true, true);
  requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('open')));
  const close = () => { box.classList.remove('open'); setTimeout(() => { box.hidden = true; lock(false, true); }, 300); box.removeEventListener('click', close); document.removeEventListener('keydown', key); };
  const key = e => { if (e.key === 'Escape') close(); };
  setTimeout(() => { box.addEventListener('click', close); document.addEventListener('keydown', key); }, 50);
}

/* ---------- effets liés au défilement et au pointeur ---------- */
const fx = { tx: 0, ty: 0, cx: 0, cy: 0, y0: 0, rate: 1 };
let ticking = false;
function kick() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
function frame() {
  ticking = false;
  const vh = innerHeight, y = scrollY;
  els.top.classList.toggle('scrolled', y > 8);
  els.top.style.setProperty('--sp', clamp(y / Math.max(1, document.documentElement.scrollHeight - vh)).toFixed(4));
  fx.y0 = y;

  // le mur de l'accroche : incliné, il suit un peu la souris et s'éloigne au défilement
  const wi = els.wallIn;
  if (wi && y < vh * 1.5) {
    fx.cx = lerp(fx.cx, fx.tx, .08);
    fx.cy = lerp(fx.cy, fx.ty, .08);
    const sp = RM ? 0 : clamp(y / vh);
    wi.style.transform = `translate3d(${(-fx.cx * 22).toFixed(1)}px,${(-sp * 90 - fx.cy * 14).toFixed(1)}px,0) rotateX(${(24 - sp * 10 + fx.cy * 3).toFixed(2)}deg) rotateZ(${(-10 + fx.cx * 2.5).toFixed(2)}deg) scale(${(1.06 + sp * .1).toFixed(3)})`;
    els.hero.style.setProperty('--sp', sp.toFixed(3));
    if (Math.abs(fx.cx - fx.tx) + Math.abs(fx.cy - fx.ty) > .002) kick();
  }

  const st = els.steps;
  if (st) {
    const r = st.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) {
      const line = vh * .6;
      st.style.setProperty('--p', RM ? 1 : clamp((line - r.top - 22) / (r.height - 44)).toFixed(4));
      for (const s of els.stepItems) s.classList.toggle('on', RM || s.getBoundingClientRect().top + 22 <= line);
    }
  }

  const q = els.quote;
  if (q) {
    const r = q.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) {
      const ws = q.querySelectorAll('.wi');
      const p = clamp((vh * .85 - r.top) / (r.height + vh * .3));
      const n = RM ? ws.length : Math.round(p * ws.length * 1.12);
      ws.forEach((w, i) => w.classList.toggle('lit', i < n));
    }
  }
}

/* ---------- barre de réservation (téléphone) ---------- */
const seen = new Set();
function updSticky() {
  els.sticky?.classList.toggle('on', started && seen.size === 0 && overlays === 0 && !root.classList.contains('is-welcome') && !root.classList.contains('is-tt'));
}

// « soft » : le calque couvre l'écran et absorbe lui-même les gestes (touch-action: none), sans modifier la page.
// Les navigateurs intégrés supportent mal qu'on coupe puis rétablisse le défilement de la page (overflow: hidden).
let hardLocks = 0;
function lock(on, soft = false) {
  overlays = Math.max(0, overlays + (on ? 1 : -1));
  if (!soft) hardLocks = Math.max(0, hardLocks + (on ? 1 : -1));
  root.classList.toggle('is-locked', hardLocks > 0);
  updSticky();
}

/* ---------- récapitulatif avant paiement ---------- */
let lastFocus = null;
function kindSpec() {
  const el = $('[data-kind-spec]'), k = els.form.elements.kind.value;
  el.hidden = !isTier(offer) || !KINDS[offer].includes(k);
  el.textContent = el.hidden ? '' : I.t(k === 'site' ? `sheet.creation.specs.site.${offer}` : `sheet.creation.specs.${k}`, I.vars.tiers?.[offer]);
}
function sheetText() {
  const f = els.form;
  if (!f) return;
  if (!isOpen(offer)) offer = isOpen('guide') ? 'guide' : firstOpenTier() || 'guide';
  const fam = isTier(offer) ? 'creation' : 'guide', tv = isTier(offer) ? { ...I.vars.tiers?.[offer], tierName: I.t(`offers.${offer}.name`) } : {};
  f.dataset.offer = fam;
  f.dataset.tier = offer;
  for (const r of f.elements.offer) r.checked = r.value === offer;
  $('[data-offer-switch]', f).style.setProperty('--i', Math.max(0, TIERS.indexOf(offer)));
  for (const el of $$('[data-sheet]', f)) el.textContent = I.t(`sheet.${fam}.${el.dataset.sheet}`, tv);
  // le délai suit la formule choisie (24 h ou 48 h)
  if (fam === 'creation') $('[data-sheet-ship]', f).textContent = I.t('sheet.creation.ship', tv);
  const items = [];
  for (let k = 0; fam === 'creation' && k < 8; k++) { const x = I.t(`offers.${offer}.items.${k}`, tv); if (!x) break; items.push(x); }
  $('[data-sheet-items]', f).innerHTML = items.map(x => `<li>${esc(x)}</li>`).join('');
  $('[data-sheet-price]', f).textContent = I.vars.prices?.[offer] || I.vars.price;
  for (const el of $$('[data-only]', f)) el.hidden = el.dataset.only !== fam;
  // seuls les types proposés par la formule restent : le site web est dans Pro et Studio, pas dans l'Essentielle
  const kinds = $('[data-kinds]', f);
  for (const l of $$('.kind', kinds)) l.hidden = !KINDS[offer].includes($('input', l).value);
  const nk = KINDS[offer].length;
  kinds.classList.toggle('two', nk === 2); kinds.classList.toggle('three', nk === 3);
  // une création porte toujours sur une pub ou une vidéo motion : un choix est toujours fait
  if (fam === 'creation' && !KINDS[offer].includes(f.elements.kind.value)) f.elements.kind.value = KINDS[offer].includes(lastKind) ? lastKind : 'pub';
  kindSpec();
  $('[data-chan-help]', f).hidden = f.elements.chan.value !== 'tiktok';
  const other = $('[data-sheet-other]', f), alt = fam === 'creation' ? (isOpen('guide') ? 'guide' : null) : firstOpenTier();
  other.hidden = !alt;
  other.textContent = I.t(`sheet.${fam}.other`);
  other.dataset.to = alt || '';
  modeTag();
}
function openSheet(o) {
  const sheet = els.sheet;
  if (!sheet.hidden) return;
  if (P.open) { closePlayer(); setTimeout(() => openSheet(o), 420); return; }
  if (OFFERS.includes(o)) offer = o;
  if (!isOpen(offer)) return;
  lastFocus = document.activeElement;
  $('[data-sheet-err]').textContent = '';
  $('.check').classList.remove('err');
  $('[data-pay]').classList.remove('loading');
  // le type de projet suit la dernière vidéo regardée, tant que le visiteur n'a pas choisi lui-même
  if (!kindTouched && lastKind) els.form.elements.kind.value = lastKind;
  sheetText();
  sheet.hidden = false;
  lock(true);
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('open')));
  const panel = $('.sheet-panel', sheet);
  panel.tabIndex = -1;
  panel.scrollTop = 0;
  setTimeout(() => panel.focus({ preventScroll: true }), 60);
}
function closeSheet() {
  const sheet = els.sheet;
  if (sheet.hidden || !sheet.classList.contains('open')) return;
  sheet.classList.remove('open');
  setTimeout(() => { sheet.hidden = true; lock(false); lastFocus?.focus?.({ preventScroll: true }); }, 480);
}
function checkout(e) {
  e.preventDefault();
  const form = e.currentTarget, err = $('[data-sheet-err]'), btn = $('[data-pay]'), chk = $('.check');
  if (!form.consent.checked) {
    err.textContent = I.t('sheet.consentRequired');
    chk.classList.remove('err'); void chk.offsetWidth; chk.classList.add('err');
    chk.scrollIntoView({ block: 'center', behavior: RM ? 'auto' : 'smooth' });
    return;
  }
  let url;
  try { url = new URL(payLink()); } catch { url = null; }
  if (!url || url.protocol !== 'https:') { err.textContent = I.t('sheet.unavailable'); return; }
  err.textContent = '';
  btn.classList.add('loading');
  // Page Stripe dans la langue du visiteur. La référence garde la langue, la version des CGV acceptée avec la case cochée,
  // la formule, le type de projet et le canal de réponse choisis : elle revient dans la commande, donc dans les e-mails.
  // Une création est toujours livrée par e-mail.
  const kind = form.elements.kind.value, chan = offer === 'guide' && form.elements.chan.value === 'tiktok' ? 'tiktok' : 'mail';
  url.searchParams.set('locale', I.info.stripe);
  url.searchParams.set('client_reference_id', `site_${I.lang}_cgv-${I.config.termsVersion}_retractation-ok${isTier(offer) ? `_offre-${offer}` : ''}${KINDS[offer].includes(kind) ? `_type-${kind}` : ''}_rep-${chan}`);
  // la page de remerciement s'en sert pour afficher la suite de la bonne formule
  try { localStorage.setItem('offre', JSON.stringify({ o: offer, t: Date.now() })); } catch { /* navigation privée */ }
  location.assign(url.href);
}

/* ---------- lecteur vidéo ---------- */
const P = { open: false, closing: false, soft: false, focus: true, hideT: 0, drag: null, k: 0, origin: null };
const fmtT = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function pui(show = true) {
  const el = els.player;
  clearTimeout(P.hideT);
  if (show) el.classList.add('ui');
  if (!els.pvideo.paused) P.hideT = setTimeout(() => el.classList.remove('ui'), 2600);
}
// Le lecteur part de la carte cliquée et y revient : même centre, même largeur ou même hauteur.
function flipFrom(fr, from) {
  const to = fr.getBoundingClientRect(), s = Math.max(from.width / to.width, from.height / to.height);
  return `translate(${(from.left + from.width / 2 - to.left - to.width / 2).toFixed(1)}px, ${(from.top + from.height / 2 - to.top - to.height / 2).toFixed(1)}px) scale(${s.toFixed(4)})`;
}
const onScreen = el => { const r = el?.getBoundingClientRect(); return r && r.width > 0 && r.bottom > 0 && r.top < innerHeight ? r : null; };
function openPlayer(k = 0, origin = null, kind = 'key') {
  if (P.open || P.closing) return;
  if (!els.sheet.hidden) closeSheet();
  const el = els.player, fr = $('.player-frame', el), v = els.pvideo, u = U[k] || U[0];
  P.open = true;
  P.k = k;
  P.origin = origin || null;
  lastKind = u.kind;
  // le focus n'est déplacé (puis rendu) que pour le clavier et la souris : au doigt, il reste où il est
  P.focus = kind !== 'tap';
  P.soft = COARSE;
  lastFocus = document.activeElement;
  el.hidden = false;
  el.classList.remove('ended', 'closing');
  el.classList.toggle('wide', !!u.wide);
  lock(true, P.soft);
  diag(`lecteur ouvert (${u.key}, ${kind})`);
  mediaHold();
  if (v.dataset.key !== u.key) { v.dataset.key = u.key; v.poster = `${MEDIA}${u.key}-poster.webp`; v.src = `${MEDIA}${u.key}.mp4`; }
  try { v.currentTime = 0; } catch { /* pas encore chargée */ }
  v.muted = false;
  el.classList.toggle('muted', false);
  el.classList.add('paused');
  const p = v.play();
  if (p) p.catch(() => el.classList.add('paused'));
  const from = onScreen(P.origin);
  requestAnimationFrame(() => {
    el.classList.add('open');
    if (!RM && from) fr.animate([{ transform: flipFrom(fr, from), borderRadius: '34px' }, { transform: 'none', borderRadius: '28px' }], { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' });
    else if (!RM) fr.animate([{ opacity: 0, transform: 'translateY(30px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.16,1,.3,1)' });
  });
  pui();
  if (P.focus) setTimeout(() => { if (P.open) $('.p-x', el).focus({ preventScroll: true }); }, 80);
  requestAnimationFrame(ptick);
}
function closePlayer() {
  if (!P.open) return;
  P.open = false;
  P.closing = true;
  P.drag = null;
  closedAt = performance.now();
  const el = els.player, fr = $('.player-frame', el), v = els.pvideo;
  v.pause();
  el.classList.remove('open');
  el.classList.add('closing'); // dès cet instant, le lecteur ne reçoit plus aucun geste
  const to = RM ? null : onScreen(P.origin);
  const cur = getComputedStyle(fr).transform;
  const anim = RM ? null : fr.animate(
    to ? [{ transform: cur === 'none' ? 'none' : cur }, { transform: flipFrom(fr, to), borderRadius: '34px', opacity: .9 }]
       : [{ transform: cur === 'none' ? 'none' : cur, opacity: 1 }, { transform: 'translateY(40px) scale(.95)', opacity: 0 }],
    { duration: to ? 520 : 320, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  let ended = false;
  const done = () => {
    if (ended) return;
    ended = true;
    P.closing = false;
    el.hidden = true; el.classList.remove('closing'); anim?.cancel(); fr.style.transform = '';
    // La vidéo est déchargée : rien ne peut la relancer tant que le lecteur est fermé, et le son du téléphone est libéré.
    v.removeAttribute('src'); delete v.dataset.key;
    try { v.load(); } catch { /* rien à décharger */ }
    if (el.contains(document.activeElement)) document.activeElement.blur();
    lock(false, P.soft); mediaHold(); kick();
    if (P.focus) lastFocus?.focus?.({ preventScroll: true });
    diag('lecteur fermé');
  };
  // La fin de l'animation ferme le lecteur ; un minuteur le garantit si le navigateur ne la signale pas.
  if (anim) { anim.finished.then(done, done); setTimeout(done, (to ? 520 : 320) + 150); } else done();
}
function ptoggle() {
  const v = els.pvideo;
  if (!P.open) return;
  if (els.player.classList.contains('ended')) { replay(); return; }
  if (v.paused) v.play().catch(() => {}); else v.pause();
  pui();
}
function replay() {
  const v = els.pvideo;
  if (!P.open) return;
  els.player.classList.remove('ended');
  v.currentTime = 0; v.play().catch(() => {});
  pui();
}
function ptick() {
  if (!P.open) return;
  const v = els.pvideo, d = v.duration || 0;
  if (d) {
    $('.p-prog').style.transform = `scaleX(${v.currentTime / d})`;
    if (v.buffered.length) $('.p-buf').style.transform = `scaleX(${v.buffered.end(v.buffered.length - 1) / d})`;
    if (!P.seeking) $('.p-seek').value = Math.round(v.currentTime / d * 1000);
    $('.p-time').textContent = fmtT(d - v.currentTime);
  }
  requestAnimationFrame(ptick);
}
function wirePlayer() {
  const el = els.player, fr = $('.player-frame', el), v = els.pvideo;
  v.addEventListener('play', () => { el.classList.remove('paused'); $('[data-ptoggle].p-btn').setAttribute('aria-label', I.t('video.pause')); pui(); });
  v.addEventListener('pause', () => { el.classList.add('paused'); $('[data-ptoggle].p-btn').setAttribute('aria-label', I.t('video.resume')); pui(); });
  v.addEventListener('ended', () => { el.classList.add('ended'); clearTimeout(P.hideT); });
  v.addEventListener('volumechange', () => { el.classList.toggle('muted', v.muted); $('[data-pmute]').setAttribute('aria-label', I.t(v.muted ? 'video.unmute' : 'video.mute')); });
  $$('[data-ptoggle]', el).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); ptoggle(); }));
  $('[data-pmute]', el).addEventListener('click', e => { e.stopPropagation(); v.muted = !v.muted; pui(); });
  $('[data-preplay]', el).addEventListener('click', e => { e.stopPropagation(); replay(); });
  $$('[data-pclose]', el).forEach(b => b.addEventListener('click', closePlayer));
  const seek = $('.p-seek', el);
  seek.addEventListener('pointerdown', e => e.stopPropagation());
  seek.addEventListener('input', () => { P.seeking = true; if (v.duration) v.currentTime = seek.value / 1000 * v.duration; pui(); });
  seek.addEventListener('change', () => { P.seeking = false; });
  $('.p-ui', el).addEventListener('pointerdown', e => e.stopPropagation());
  $('.p-end', el).addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') pui(); });

  // toucher : un appui affiche les commandes ou met en pause ; glisser vers le bas ferme
  fr.addEventListener('pointerdown', e => {
    if (!P.open || e.target.closest('button')) return;
    P.drag = { y0: e.clientY, x0: e.clientX, dy: 0, id: e.pointerId, moved: false };
    fr.setPointerCapture(e.pointerId);
  });
  fr.addEventListener('pointermove', e => {
    const d = P.drag;
    if (!d || d.id !== e.pointerId) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    if (d.dy > 8 || Math.abs(e.clientX - d.x0) > 8) d.moved = true;
    if (d.moved && !RM) {
      fr.style.transform = `translateY(${d.dy}px) scale(${1 - Math.min(d.dy, 400) / 2200})`;
      $('.player-bg', el).style.opacity = String(1 - Math.min(d.dy, 300) / 420);
    }
  });
  const end = e => {
    const d = P.drag;
    if (!d || d.id !== e.pointerId) return;
    P.drag = null;
    if (!P.open) return;
    $('.player-bg', el).style.opacity = '';
    if (d.moved && d.dy > 110) { closePlayer(); return; }
    if (d.moved) { fr.animate([{ transform: fr.style.transform }, { transform: 'none' }], { duration: 400, easing: 'cubic-bezier(.16,1,.3,1)' }); fr.style.transform = ''; return; }
    fr.style.transform = '';
    if (e.pointerType !== 'mouse' && !el.classList.contains('ui') && !v.paused) pui(); else ptoggle();
  };
  fr.addEventListener('pointerup', end);
  fr.addEventListener('pointercancel', end);

  document.addEventListener('keydown', e => {
    if (!P.open) return;
    if (e.key === 'Escape') closePlayer();
    else if (e.key === ' ' || e.key === 'k') { if (e.target.closest?.('button, input')) return; e.preventDefault(); ptoggle(); }
    else if (e.key === 'm') { v.muted = !v.muted; pui(); }
    else if (e.key === 'ArrowRight' && !e.target.closest?.('input')) { v.currentTime = Math.min(v.duration || 0, v.currentTime + 5); pui(); }
    else if (e.key === 'ArrowLeft' && !e.target.closest?.('input')) { v.currentTime = Math.max(0, v.currentTime - 5); pui(); }
  });
}

/* ---------- questions : ouverture en douceur ---------- */
function wireFaq() {
  for (const d of $$('.qa')) {
    const s = $('summary', d);
    s.addEventListener('click', e => {
      e.preventDefault();
      if (d._a) return;
      const h0 = d.offsetHeight;
      if (d.open) {
        d.classList.remove('is-open');
        d._a = d.animate({ height: [`${h0}px`, `${s.offsetHeight}px`] }, { duration: RM ? 1 : 380, easing: 'cubic-bezier(.4,0,.2,1)' });
        d._a.onfinish = () => { d.open = false; d._a = null; };
      } else {
        d.open = true;
        const h1 = d.offsetHeight;
        d.classList.add('is-open');
        d._a = d.animate({ height: [`${h0}px`, `${h1}px`] }, { duration: RM ? 1 : 480, easing: 'cubic-bezier(.16,1,.3,1)' });
        d._a.onfinish = () => { d._a = null; };
      }
    });
  }
}

/* ---------- petits effets à la souris (ordinateur) ---------- */
function wireDesktop() {
  if (!FINE || RM) return;
  for (const b of $$('.btn-p')) {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.translate = `${((e.clientX - r.left) / r.width - .5) * 8}px ${((e.clientY - r.top) / r.height - .5) * 6}px`; });
    b.addEventListener('pointerleave', () => { b.style.translate = ''; });
  }
  for (const c of $$('[data-tilt]')) {
    c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); c.style.setProperty('--tx', `${((e.clientX - r.left) / r.width - .5) * 7}deg`); c.style.setProperty('--ty', `${-((e.clientY - r.top) / r.height - .5) * 7}deg`); });
    c.addEventListener('pointerleave', () => { c.style.setProperty('--tx', '0deg'); c.style.setProperty('--ty', '0deg'); });
  }
  for (const c of $$('[data-spot]')) c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', `${e.clientX - r.left}px`); c.style.setProperty('--my', `${e.clientY - r.top}px`); });
  const hero = $('.hero');
  hero.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = hero.getBoundingClientRect();
    fx.tx = clamp((e.clientX - (r.left + r.width / 2)) / (innerWidth / 2), -1, 1);
    fx.ty = clamp((e.clientY - (r.top + r.height / 2)) / (innerHeight / 2), -1, 1);
    kick();
  });
  hero.addEventListener('pointerleave', () => { fx.tx = fx.ty = 0; kick(); });
}

/* ---------- démarrage ---------- */
function wire() {
  Object.assign(els, {
    top: $('[data-top]'), wallIn: $('.wall-in'), hero: $('.hero'), steps: $('[data-steps]'), quote: $('[data-quote]'),
    sticky: $('[data-sticky]'), sheet: $('#sheet'), form: $('[data-checkout]'), player: $('#player'), pvideo: $('.pvideo'),
  });
  els.stepItems = $$('.step');
  watchGestures();
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { kick(); sizeRot(); });
  document.fonts?.ready.then(sizeRot);
  document.addEventListener('visibilitychange', mediaHold);
  const sio = new IntersectionObserver(es => { for (const e of es) e.isIntersecting ? seen.add(e.target) : seen.delete(e.target); updSticky(); });
  $$('[data-hide-sticky]').forEach(el => sio.observe(el));
  document.addEventListener('click', e => {
    const kind = kindOf(e);
    // un vrai bouton de lecture ouvre une vidéo ; à la souris seulement, toute la carte d'un univers est cliquable
    const play = e.target.closest('[data-play]') || (kind === 'mouse' ? e.target.closest('.rt')?.querySelector('[data-play]') : null);
    const book = e.target.closest('[data-book]');
    const cap = e.target.closest('[data-cap]');
    if (cap) { e.preventDefault(); if (kind !== 'ghost') openCap(cap.dataset.cap); return; }
    const go = e.target.closest('[data-go-offers]');
    if (e.target.closest('[data-open-compare]')) { e.preventDefault(); openCompare(); return; }
    if (e.target.closest('[data-cmp-close]')) { e.preventDefault(); closeCompare(); return; }
    if (go || book?.dataset.book === 'creation') { e.preventDefault(); if (P.open) { closePlayer(); setTimeout(goOffers, 450); } else goOffers(); }
    else if (book && book.closest('#cmpbox')) { e.preventDefault(); closeCompare(() => openSheet(book.dataset.book)); }
    else if (book) { e.preventDefault(); openSheet(book.dataset.book); }
    else if (play) {
      e.preventDefault();
      if (!mayOpen(e)) { diag(`ouverture refusée (${kind})`); return; }
      const k = U.findIndex(u => u.key === play.dataset.play), card = play.closest('.rt');
      openPlayer(Math.max(0, k), card || null, kind);
    } else if (e.target.closest('#sheet [data-close]')) closeSheet();
  });
  document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (!els.sheet.hidden) closeSheet(); else if (!$('#cmpbox').hidden) closeCompare(); });
  els.form.addEventListener('submit', checkout);
  // « Plutôt apprendre… » / « Plutôt une création… » : on passe d'un récapitulatif à l'autre
  $('[data-sheet-other]').addEventListener('click', e => {
    const to = e.currentTarget.dataset.to;
    if (to === 'guide') { offer = 'guide'; sheetText(); }
    else if (to) { offer = to; sheetText(); }
  });
  els.form.consent.addEventListener('change', () => { $('.check').classList.remove('err'); $('[data-sheet-err]').textContent = ''; });
  // réponse sur TikTok : un rappel indique où donner son pseudo
  for (const r of $$('input[name="chan"]', els.form)) r.addEventListener('change', () => {
    const help = $('[data-chan-help]'), panel = $('.sheet-panel', els.sheet);
    help.hidden = els.form.elements.chan.value !== 'tiktok';
    if (!help.hidden) requestAnimationFrame(() => { const over = $('[data-pay]').getBoundingClientRect().bottom - (panel.getBoundingClientRect().bottom - 14); if (over > 0) panel.scrollBy({ top: over, behavior: RM ? 'auto' : 'smooth' }); });
  });
  for (const r of $$('input[name="kind"]', els.form)) r.addEventListener('change', () => { kindTouched = true; kindSpec(); });
  // la formule se change sur place, dans le récapitulatif
  for (const r of $$('input[name="offer"]', els.form)) r.addEventListener('change', () => {
    offer = OFFERS.includes(els.form.elements.offer.value) ? els.form.elements.offer.value : 'guide';
    $('[data-sheet-err]').textContent = '';
    $('.check').classList.remove('err');
    sheetText();
  });
  // comment ça se passe : un onglet par formule
  $('[data-tabs]')?.addEventListener('click', e => {
    const b = e.target.closest('[data-tab]');
    if (!b || b.dataset.tab === howTab || !HOW_TABS.includes(b.dataset.tab)) return;
    howTab = b.dataset.tab;
    buildHow(true);
    setTimeout(kick, 260);
  });
  addEventListener('pageshow', e => { if (e.persisted) $('[data-pay]').classList.remove('loading'); });
  wirePlayer();
  wireFaq();
  wireDesktop();
}

async function boot() {
  try {
    await I.init();
  } catch {
    root.classList.remove('is-welcome', 'is-tt');
    $$('[data-h], [data-r], [data-split]').forEach(el => el.classList.add('in'));
    return;
  }
  const known = I.urlLang() || I.stored();
  // sans langue choisie (adresse ou choix précédent), le site s'ouvre en français ; « EN » en haut pour l'anglais
  await I.set(known || 'fr', { persist: !!known });
  wire();
  langSwitch($('[data-langswitch]'), code => swapLang(code, () => { pageText(); replayVisible(); kick(); }));
  pageText();
  if (fromTikTok()) reveal($('#welcome'), await ttHint());
  else { root.classList.remove('is-welcome'); start(); }
}
boot();

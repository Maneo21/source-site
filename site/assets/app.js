// Page de vente : accueil de langue, animations, vidéos des trois univers, récapitulatif avant paiement.
import { I, esc, langSwitch, syncSwitch, swapLang } from './i18n.js';
import { pick } from './vars.js';

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

// Les trois univers, dans l'ordre d'affichage. Fichiers : <key>-teaser.mp4 (extrait muet), <key>.mp4 (vidéo complète), <key>-poster.webp.
// « kind » est le type de projet présélectionné dans le récapitulatif et transmis à Stripe.
const U = [
  { key: 'sites', kind: 'site', dur: '0:22' },
  { key: 'pub', kind: 'pub', dur: '0:15' },
  { key: 'motion', kind: 'motion', dur: '0:18' },
];
const KINDS = ['site', 'pub', 'motion', 'autre'];

const els = {};
let started = false, overlays = 0;
let lastKind = null, kindTouched = false;

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
  $$('[data-split]').forEach(split);
  buildMarquee();
  buildPrice();
  buildExample();
  buildSig();
  buildDeckText();
  syncSwitch($('[data-langswitch]'));
  if ($('[data-tt-lang]')?.childElementCount) syncSwitch($('[data-tt-lang]'));
  modeTag();
}

function buildMarquee() {
  const items = I.raw('marquee') || [];
  const one = items.map(s => `<span class="mq-i">${esc(s)}</span><span class="mq-s"></span>`).join('');
  $('[data-marquee]').innerHTML = `<div class="mq-g">${one}</div><div class="mq-g">${one}</div>`;
}

function buildPrice() {
  const el = $('[data-roll]');
  if (!el) return;
  const s = I.vars.price;
  let k = 0;
  el.innerHTML = `<span class="sr">${esc(s)}</span>` + [...s].map(ch => {
    if (/\d/.test(ch)) return `<span class="dg" aria-hidden="true"><span class="dg-col" style="--v:${ch};--k:${k++}">${Array.from({ length: 20 }, (_, n) => `<span>${n % 10}</span>`).join('')}</span></span>`;
    if (/\s/.test(ch)) return '<span class="sp" aria-hidden="true"></span>';
    if (/[.,]/.test(ch)) return `<span class="pt" aria-hidden="true">${ch}</span>`;
    return `<span class="cur" aria-hidden="true">${esc(ch)}</span>`;
  }).join('');
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
    line.hidden = !items.length;
    $('span', line).textContent = items.slice(0, 2).map(p => `${p.value} ${p.label}`).join(' · ');
  }
}

// Les repères de l'offre comptent jusqu'à leur valeur quand ils arrivent à l'écran.
function countUp(box) {
  if (RM) return;
  for (const el of $$('[data-count]', box)) {
    const full = el.textContent, m = full.match(/^(\D*)(\d+)([\s\S]*)$/);
    if (!m) continue;
    const n = Number(m[2]), t0 = performance.now(), dur = 700 + Math.min(n, 30) * 22;
    let shown = full;
    const tick = now => {
      if (el.textContent !== shown) return; // le texte a changé entre-temps (autre langue) : on n'y touche plus
      const p = clamp((now - t0) / dur);
      shown = p < 1 ? m[1] + Math.round(n * (1 - Math.pow(1 - p, 3))) + m[3] : full;
      el.textContent = shown;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

// Le mot qui tourne dans le titre, le nom des onglets et les étiquettes autour des vidéos.
function buildDeckText() {
  const items = I.raw('uni.items') || [], words = I.raw('hero.words') || [];
  const rot = $('[data-rot]');
  if (rot) rot.innerHTML = words.map((w, k) => `<span class="rot-w${k === D.i ? ' on' : ''}">${esc(w)}</span>`).join('');
  $$('.sg').forEach((b, k) => b.setAttribute('aria-label', items[k]?.t || ''));
  setChips(D.i);
}
function setChips(i) {
  const it = (I.raw('uni.items') || [])[i];
  if (!it) return;
  const n = $('[data-chip-n]');
  if (n) n.textContent = `0${i + 1}`;
  for (const el of $$('[data-chip]')) { const k = Number(el.dataset.chip); el.textContent = k === 0 ? it.short : it.chips?.[k - 1] || ''; }
  for (const el of $$('[data-dur]')) el.textContent = U[i].dur;
}

// Lien de paiement Stripe (site/config.json). Un lien de test contient « /test_ ».
const payLink = () => String(I.config.paymentLink || '').trim();
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
// d'ouvrir le site dans le vrai navigateur. « Rester ici » continue normalement ; le choix est gardé 24 h.
// C'est le seul écran avant le site : la langue est détectée, et se change sur place si besoin.
const fromTikTok = () => root.classList.contains('is-tt');
function ttHint() {
  return new Promise(resolve => {
    const w = $('#welcome'), stay = $('[data-tt-stay]', w);
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
    const go = () => {
      if (!stay.isConnected || w.classList.contains('out')) return;
      try { localStorage.setItem('tt', String(Date.now())); } catch { /* navigation privée */ }
      I.remember(I.lang);
      document.removeEventListener('keydown', onKey);
      resolve(stay);
    };
    const onKey = e => { if (e.key === 'Escape') go(); };
    stay.addEventListener('click', go, { once: true });
    document.addEventListener('keydown', onKey);
  });
}

function start() {
  if (started) return;
  started = true;
  for (const el of [$('main'), $('[data-top]'), $('.foot')]) el.inert = false;
  requestAnimationFrame(() => $$('.hero [data-h]').forEach(el => el.classList.add('in')));
  $$('[data-r], [data-split]').forEach(el => { if (!el.closest('.hero')) io.observe(el); });
  setTimeout(() => { initDeck(); initUni(); }, RM ? 0 : 450);
  const brief = $('.brief');
  if (brief) new IntersectionObserver((es, o) => { if (es.some(e => e.isIntersecting)) { o.disconnect(); setTimeout(() => countUp(brief), 250); } }, { threshold: .5 }).observe(brief);
  setTimeout(updSticky, RM ? 0 : 1700);
  kick();
}

/* ---------- accroche : les trois vidéos en éventail ---------- */
// La carte de devant joue son extrait ; à la fin, la suivante passe devant (comme des stories).
const autoplay = !RM && !SAVE;
const STILL = 6000;   // sans lecture automatique, durée d'affichage d'une carte (ms)
const STALL = 10000;  // si une vidéo ne démarre pas, on passe quand même à la suivante (ms)
const D = { i: 0, cards: [], sg: [], vis: false, busy: false, drag: false, used: false, raf: 0, t0: 0, n: 0, swiped: 0 };
const MID = {
  in: ['translate3d(58%,-3%,0) rotate(13deg) scale(.9)', 'translate3d(-58%,-3%,0) rotate(-13deg) scale(.9)'],
  out: ['translate3d(-34%,1%,0) rotate(-7deg) scale(.93)', 'translate3d(34%,1%,0) rotate(7deg) scale(.93)'],
};
const teaserSrc = k => `${MEDIA}${U[k].key}-teaser.mp4`;

function deckPlay() {
  const on = D.vis && autoplay && !P.open;
  D.cards.forEach((c, k) => {
    const v = c.video;
    if (k === D.i && on) {
      if (!v.getAttribute('src')) { v.muted = true; v.src = teaserSrc(k); }
      v.play().catch(() => {});
    } else if (!v.paused) v.pause();
  });
  if (D.vis && !P.open && !D.raf) D.raf = requestAnimationFrame(deckTick);
}
function paintAmbi() {
  const c = D.cards[D.i];
  if (!c || !D.g) return;
  const src = c.video.readyState >= 2 && c.el.classList.contains('playing') ? c.video : c.img.complete && c.img.naturalWidth ? c.img : null;
  if (src) { try { D.g.drawImage(src, 0, 0, D.cv.width, D.cv.height); } catch { /* image pas encore prête */ } }
}
function deckTick() {
  D.raf = 0;
  if (!D.vis || P.open || !D.cards.length) return;
  const v = D.cards[D.i].video, now = performance.now();
  let p = 0;
  if (autoplay) {
    if (v.duration) p = v.currentTime / v.duration;
    if (v.ended && !D.busy && !D.drag) deckGo(D.i + 1);
    if (v.readyState < 2 && now - D.t0 > STALL && !D.busy) { deckGo(D.i + 1); }
    // la vidéo suivante commence à charger pendant que celle-ci joue
    const next = D.cards[(D.i + 1) % U.length].video;
    if (p > .6 && !next.getAttribute('src')) { next.preload = 'auto'; next.muted = true; next.src = teaserSrc((D.i + 1) % U.length); }
  } else if (!RM) {
    p = (now - D.t0) / STILL;
    if (p >= 1 && !D.busy) deckGo(D.i + 1);
  }
  D.sg[D.i]?.style.setProperty('--p', clamp(p).toFixed(3));
  if (D.n++ % 3 === 0) paintAmbi();
  D.raf = requestAnimationFrame(deckTick);
}
function rotTo(i) {
  $$('.rot-w').forEach((w, k) => {
    if (k === i) {
      w.style.transition = 'none'; w.classList.remove('on', 'off'); void w.offsetWidth; w.style.transition = '';
      w.classList.add('on');
    } else if (w.classList.contains('on')) w.classList.replace('on', 'off');
  });
}
function deckSync() {
  D.sg.forEach((b, k) => {
    b.classList.toggle('on', k === D.i);
    b.classList.toggle('done', k < D.i);
    b.setAttribute('aria-selected', String(k === D.i));
    if (k !== D.i) b.style.removeProperty('--p');
  });
}
// Passe la carte i devant. Emplacements : 0 = devant, 1 = la suivante (à droite), 2 = la précédente (à gauche).
function deckGo(i, user = false) {
  i = ((i % U.length) + U.length) % U.length;
  if (i === D.i || D.busy || !D.cards.length || els.deck.classList.contains('fanning')) return;
  const deck = els.deck, prev = D.i, fwd = (i - prev + U.length) % U.length === 1;
  const from = D.cards.map(c => getComputedStyle(c.el).transform);
  for (const c of D.cards) c.el.style.transform = '';
  D.i = i;
  D.t0 = performance.now();
  D.cards.forEach((c, k) => { c.el.dataset.slot = (k - i + U.length) % U.length; });
  if (!RM) {
    const to = D.cards.map(c => getComputedStyle(c.el).transform), dur = 900;
    D.busy = true;
    D.cards.forEach((c, k) => {
      const kf = [{ transform: from[k] }, { transform: to[k] }];
      // la carte qui arrive sort d'abord sur le côté, puis se pose devant ; celle qui part s'écarte de l'autre côté
      if (k === i) kf.splice(1, 0, { transform: MID.in[fwd ? 0 : 1], offset: .45 });
      else if (k === prev) kf.splice(1, 0, { transform: MID.out[fwd ? 0 : 1], offset: .45 });
      c.el.style.zIndex = k === prev ? 3 : k === i ? 2 : 1;
      c.el.animate(kf, { duration: dur, easing: 'cubic-bezier(.45,0,.2,1)' });
    });
    setTimeout(() => { D.cards[i].el.style.zIndex = 4; }, dur * .42);
    setTimeout(() => { for (const c of D.cards) c.el.style.zIndex = ''; D.busy = false; }, dur + 30);
    deck.classList.add('shuf', 'swap');
    setTimeout(() => { setChips(i); deck.classList.remove('swap'); }, 240);
    setTimeout(() => deck.classList.remove('shuf'), 560);
  } else setChips(i);
  const v = D.cards[i].video;
  if (v.getAttribute('src')) { try { v.currentTime = 0; } catch { /* pas encore chargée */ } }
  rotTo(i);
  deckSync();
  paintAmbi();
  if (user) { lastKind = U[i].kind; deckUsed(); }
  deckPlay();
}
// Dès que le visiteur a navigué lui-même, les invitations à le faire s'arrêtent.
function deckUsed() { if (!D.used) { D.used = true; els.deck.classList.add('used'); } }
// Au premier affichage, la carte de devant s'écarte un instant : on devine la suivante.
function deckHint() {
  if (RM || D.used || D.busy || D.drag || !D.vis || P.open) return;
  const a = D.cards[D.i].el, b = D.cards[(D.i + 1) % U.length].el, tb = getComputedStyle(b).transform;
  const o = { duration: 1300, easing: 'cubic-bezier(.45,0,.2,1)' };
  a.animate([{ transform: 'none' }, { transform: 'translate3d(-9%,0,0) rotate(-3.5deg)', offset: .42 }, { transform: 'none' }], o);
  b.animate([{ transform: tb }, { transform: 'translate3d(36%,1%,0) rotate(10deg) scale(.9)', offset: .42 }, { transform: tb }], o);
}
// Un appui au doigt sur l'image n'ouvre rien : la pastille de lecture se signale.
function nudgePlay() {
  const b = $('.vplay', els.deck);
  b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge');
}
function initDeck() {
  const deck = els.deck;
  if (!deck) return;
  D.cv = $('.ambi', deck);
  D.g = D.cv.getContext('2d');
  D.sg = $$('.sg', deck);
  D.cards = $$('.dcard', deck).map(el => ({ el, video: $('video', el), img: $('img', el) }));
  D.cards.forEach((c, k) => {
    c.video.addEventListener('ended', () => { if (k === D.i && !D.drag) deckGo(D.i + 1); });
    c.video.addEventListener('playing', () => c.el.classList.add('playing'), { once: true });
    c.img.addEventListener('load', () => { if (k === D.i) paintAmbi(); });
    c.el.addEventListener('click', e => {
      const kind = kindOf(e);
      if (performance.now() - D.swiped < 450 || !ACT.has(kind)) return;
      if (k !== D.i) { deckGo(k, true); return; }
      // seule la souris ouvre la vidéo en cliquant sur l'image ; au doigt, la pastille de lecture se signale
      if (kind === 'mouse' && mayOpen(e)) openPlayer(k, c.el, kind); else if (kind === 'tap') nudgePlay();
    });
  });
  D.sg.forEach((b, k) => b.addEventListener('click', e => {
    e.stopPropagation();
    if (!ACT.has(kindOf(e))) return;
    if (k !== D.i) { deckGo(k, true); return; }
    const v = D.cards[k].video;
    D.t0 = performance.now();
    if (v.getAttribute('src')) { try { v.currentTime = 0; } catch { /* pas encore chargée */ } }
  }));
  // flèches de chaque côté, et touches fléchées quand le bloc a le focus
  for (const b of $$('[data-step]', deck)) b.addEventListener('click', e => { e.stopPropagation(); if (ACT.has(kindOf(e))) deckGo(D.i + Number(b.dataset.step), true); });
  deck.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    deckGo(D.i + (e.key === 'ArrowRight' ? 1 : -1), true);
  });
  // Au doigt : la carte de devant suit un glissement horizontal ; lâchée assez loin, elle laisse sa place.
  // Un geste vertical n'est jamais retenu : le navigateur fait défiler la page (touch-action: pan-y).
  let sw = null;
  const settle = () => {
    const el = D.cards[D.i].el, cur = el.style.transform;
    el.style.transform = '';
    if (cur && !RM) el.animate([{ transform: cur }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
  };
  deck.addEventListener('pointerdown', e => {
    sw = e.pointerType === 'mouse' || D.busy || e.target.closest('button') ? null : { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, lock: false, t: performance.now() };
  });
  deck.addEventListener('pointermove', e => {
    if (!sw || sw.id !== e.pointerId) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (!sw.lock) {
      if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) { sw = null; return; }
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      sw.lock = true; D.drag = true;
      try { deck.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
    }
    sw.dx = dx;
    D.swiped = performance.now();
    if (!RM) D.cards[D.i].el.style.transform = `translate3d(${(dx * .8).toFixed(1)}px,0,0) rotate(${(dx * .035).toFixed(2)}deg)`;
  });
  const drop = e => {
    if (!sw || sw.id !== e.pointerId) return;
    const s = sw;
    sw = null;
    if (!s.lock) return;
    D.drag = false;
    D.swiped = performance.now();
    const far = Math.abs(s.dx) > Math.max(44, deck.offsetWidth * .22);
    const fast = Math.abs(s.dx) > 24 && Math.abs(s.dx) / Math.max(1, performance.now() - s.t) > .45;
    const was = D.i;
    if (e.type === 'pointerup' && (far || fast)) deckGo(D.i + (s.dx < 0 ? 1 : -1), true);
    if (D.i === was) settle();
  };
  deck.addEventListener('pointerup', drop);
  deck.addEventListener('pointercancel', drop);
  new IntersectionObserver(([e]) => { D.vis = e.isIntersecting; D.t0 = performance.now(); deckPlay(); }, { threshold: .2 }).observe(deck);
  paintAmbi();
  deckSync();
  // les deux cartes de derrière s'écartent, puis les étiquettes deviennent réactives
  deck.classList.add('fanning', 'fan');
  setTimeout(() => deck.classList.remove('fanning'), RM ? 0 : 1500);
  setTimeout(() => deck.classList.add('ready'), RM ? 0 : 2300);
  setTimeout(deckHint, 3100);
  setTimeout(deckUsed, 24000);
}

/* ---------- les trois univers ---------- */
// Une seule carte joue à la fois : celle qui arrive à l'écran (téléphone) ou celle que l'on survole (ordinateur).
const V = { cards: [], on: -1, hover: -1, wrap: null };
function uniSet(k) {
  V.on = k;
  for (const c of V.cards) {
    c.el.classList.toggle('is-on', c.k === k);
    if (c.k === k && autoplay && !P.open) {
      if (!c.video.getAttribute('src')) { c.video.muted = true; c.video.src = teaserSrc(c.k); }
      c.video.play().catch(() => {});
    } else if (!c.video.paused) c.video.pause();
  }
}
function uniFrame(vh) {
  if (!V.cards.length) return;
  const r0 = V.wrap.getBoundingClientRect();
  if (r0.bottom < -40 || r0.top > vh + 40) { if (V.on >= 0) uniSet(-1); return; }
  if (WIDE.matches) {
    for (const c of V.cards) { c.inner.style.transform = ''; c.shade.style.opacity = ''; }
    if (V.on < 0 && r0.top < vh * .75) uniSet(Math.max(0, V.hover));
    return;
  }
  // téléphone : les cartes se recouvrent ; celle du dessous recule et s'assombrit
  let on = -1;
  V.cards.forEach((c, k) => {
    const r = c.el.getBoundingClientRect();
    if (r.top < vh * .62) on = k;
    const next = V.cards[k + 1];
    const p = next && !RM ? clamp((r.bottom - next.el.getBoundingClientRect().top) / r.height) : 0;
    c.inner.style.transform = p > .001 ? `scale(${(1 - p * .07).toFixed(4)})` : '';
    c.shade.style.opacity = p > .001 ? (p * .72).toFixed(3) : '';
  });
  if (on !== V.on) uniSet(on);
}
function initUni() {
  V.wrap = $('[data-ucards]');
  if (!V.wrap) return;
  V.cards = $$('.ucard', V.wrap).map((el, k) => ({ el, k, video: $('video', el), inner: $('.u-in', el), shade: $('.u-shade', el) }));
  for (const c of V.cards) {
    c.video.addEventListener('playing', () => c.el.classList.add('playing'), { once: true });
    c.video.addEventListener('ended', () => {
      if (c.k !== V.on) return;
      if (WIDE.matches && V.hover < 0) { uniSet((c.k + 1) % V.cards.length); return; }
      c.video.currentTime = 0; c.video.play().catch(() => {});
    });
    if (FINE) {
      c.el.addEventListener('pointerenter', () => { V.hover = c.k; if (WIDE.matches && V.on !== c.k) uniSet(c.k); });
      c.el.addEventListener('pointerleave', () => { V.hover = -1; });
    }
  }
  WIDE.addEventListener('change', kick);
  kick();
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
  if (!RM && els.mq) {
    fx.rate = lerp(fx.rate, 1 + clamp(Math.abs(y - fx.y0) / 24, 0, 3.4), .16);
    const a = els.mqAnim || (els.mqAnim = els.mq.getAnimations?.()[0]);
    if (a) a.playbackRate = Math.abs(fx.rate - 1) < .02 ? 1 : fx.rate;
    if (Math.abs(fx.rate - 1) >= .02) kick();
  }
  fx.y0 = y;

  const tilt = els.tilt;
  if (tilt && y < vh * 1.6) {
    fx.cx = lerp(fx.cx, fx.tx, .1);
    fx.cy = lerp(fx.cy, fx.ty, .1);
    const sp = RM ? 0 : clamp(y / (vh * .9));
    const flat = Math.min(1, sp * 1.4 + Math.hypot(fx.cx, fx.cy) * 1.5);
    tilt.style.transform = `translate3d(0,${(-sp * 34).toFixed(1)}px,0) rotateX(${(-fx.cy * 7 + sp * 9).toFixed(2)}deg) rotateY(${(fx.cx * 9).toFixed(2)}deg) rotate(${lerp(-2.5, 0, flat).toFixed(2)}deg) scale(${(1 - sp * .05).toFixed(3)})`;
    if (Math.abs(fx.cx - fx.tx) + Math.abs(fx.cy - fx.ty) > .002) kick();
  }

  uniFrame(vh);

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
function openSheet() {
  const sheet = els.sheet;
  if (!sheet.hidden) return;
  if (P.open) { closePlayer(); setTimeout(openSheet, 420); return; }
  lastFocus = document.activeElement;
  $('[data-sheet-err]').textContent = '';
  $('.check').classList.remove('err');
  $('[data-pay]').classList.remove('loading');
  // le type de projet suit la dernière vidéo regardée, tant que le visiteur n'a pas choisi lui-même
  if (!kindTouched && lastKind) els.form.elements.kind.value = lastKind;
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
  // le type de projet et le canal de réponse choisis : elle revient dans la commande, donc dans les e-mails.
  const kind = form.elements.kind.value, chan = form.elements.chan.value === 'tiktok' ? 'tiktok' : 'mail';
  url.searchParams.set('locale', I.info.stripe);
  url.searchParams.set('client_reference_id', `site_${I.lang}_cgv-${I.config.termsVersion}_retractation-ok${KINDS.includes(kind) ? `_type-${kind}` : ''}_rep-${chan}`);
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
function openPlayer(k = D.i, origin = null, kind = 'key') {
  if (P.open || P.closing) return;
  if (!els.sheet.hidden) closeSheet();
  const el = els.player, fr = $('.player-frame', el), v = els.pvideo, u = U[k] || U[0];
  P.open = true;
  P.k = k;
  P.origin = origin || D.cards[D.i]?.el || null;
  lastKind = u.kind;
  // le focus n'est déplacé (puis rendu) que pour le clavier et la souris : au doigt, il reste où il est
  P.focus = kind !== 'tap';
  P.soft = COARSE;
  lastFocus = document.activeElement;
  el.hidden = false;
  el.classList.remove('ended', 'closing');
  lock(true, P.soft);
  diag(`lecteur ouvert (${u.key}, ${kind})`);
  deckPlay();
  uniSet(V.on);
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
    lock(false, P.soft); D.t0 = performance.now(); deckPlay(); uniSet(V.on); kick();
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
    const r = els.deck.getBoundingClientRect();
    fx.tx = clamp((e.clientX - (r.left + r.width / 2)) / (innerWidth / 2), -1, 1);
    fx.ty = clamp((e.clientY - (r.top + r.height / 2)) / (innerHeight / 2), -1, 1);
    kick();
  });
  hero.addEventListener('pointerleave', () => { fx.tx = fx.ty = 0; kick(); });
}

/* ---------- démarrage ---------- */
function wire() {
  Object.assign(els, {
    top: $('[data-top]'), mq: $('[data-marquee]'), deck: $('[data-deck]'), tilt: $('.deck-tilt'), steps: $('[data-steps]'), quote: $('[data-quote]'),
    sticky: $('[data-sticky]'), sheet: $('#sheet'), form: $('[data-checkout]'), player: $('#player'), pvideo: $('.pvideo'),
  });
  els.stepItems = $$('.step');
  watchGestures();
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  const sio = new IntersectionObserver(es => { for (const e of es) e.isIntersecting ? seen.add(e.target) : seen.delete(e.target); updSticky(); });
  $$('[data-hide-sticky]').forEach(el => sio.observe(el));
  document.addEventListener('click', e => {
    const kind = kindOf(e);
    // un vrai bouton de lecture ouvre une vidéo ; à la souris seulement, toute la carte d'un univers est cliquable
    const play = e.target.closest('[data-play]') || (kind === 'mouse' ? e.target.closest('.ucard')?.querySelector('[data-play]') : null);
    if (e.target.closest('[data-book]')) { e.preventDefault(); openSheet(); }
    else if (play) {
      e.preventDefault();
      if (!mayOpen(e)) { diag(`ouverture refusée (${kind})`); return; }
      const k = U.findIndex(u => u.key === play.dataset.play), card = play.closest('.ucard');
      openPlayer(k < 0 ? D.i : k, card ? $('.u-in', card) : null, kind);
    } else if (e.target.closest('#sheet [data-close]')) closeSheet();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !els.sheet.hidden) closeSheet(); });
  els.form.addEventListener('submit', checkout);
  els.form.consent.addEventListener('change', () => { $('.check').classList.remove('err'); $('[data-sheet-err]').textContent = ''; });
  // réponse sur TikTok : un rappel indique où donner son pseudo
  for (const r of $$('input[name="chan"]', els.form)) r.addEventListener('change', () => {
    const help = $('[data-chan-help]'), panel = $('.sheet-panel', els.sheet);
    help.hidden = els.form.elements.chan.value !== 'tiktok';
    if (!help.hidden) requestAnimationFrame(() => { const over = $('[data-pay]').getBoundingClientRect().bottom - (panel.getBoundingClientRect().bottom - 14); if (over > 0) panel.scrollBy({ top: over, behavior: RM ? 'auto' : 'smooth' }); });
  });
  for (const r of $$('input[name="kind"]', els.form)) r.addEventListener('change', () => { kindTouched = true; });
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
  await I.set(known || I.browser(), { persist: !!known });
  wire();
  langSwitch($('[data-langswitch]'), code => swapLang(code, () => { pageText(); replayVisible(); kick(); }));
  pageText();
  if (fromTikTok()) reveal($('#welcome'), await ttHint());
  else if (!known) welcome();
  else { root.classList.remove('is-welcome'); start(); }
}
boot();

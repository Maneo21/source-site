// Page de vente : accueil de langue, animations, vidéo, récapitulatif avant paiement.
import { I, esc, langSwitch, syncSwitch, swapLang } from './i18n.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const SAVE = !!(navigator.connection && navigator.connection.saveData);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const wait = ms => new Promise(r => setTimeout(r, ms));
const MEDIA = '/assets/media/';

const els = {};
let started = false, overlays = 0;

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
  syncSwitch($('[data-langswitch]'));
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
  const name = I.config.creator?.name || '';
  const ini = $('[data-initial]');
  if (ini) ini.textContent = /^\[/.test(name) || !name ? '✦' : name.trim()[0].toUpperCase();
  const tt = (I.config.creator?.tiktok || '').replace(/^@/, '');
  const a = $('[data-tiktok]');
  if (a && tt) { a.href = `https://www.tiktok.com/@${encodeURIComponent(tt)}`; a.hidden = false; }
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
    const r = (btn || box).getBoundingClientRect();
    w.style.setProperty('--x', `${r.left + r.width / 2}px`);
    w.style.setProperty('--y', `${r.top + r.height / 2}px`);
    await wait(RM ? 0 : 170);
    w.classList.add('out');
    start();
    setTimeout(() => { root.classList.remove('is-welcome'); w.hidden = true; }, RM ? 0 : 1150);
  };
  // Le choix peut avoir été fait avant le chargement de ce script (bouton déjà actif dans la page).
  window.__onPick = () => { const p = window.__pick; if (p) choose(p.code, p.el); };
  if (window.__pick) window.__onPick();
  box.addEventListener('click', e => { const b = e.target.closest('[data-code]'); if (b) choose(b.dataset.code, b); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !done) { const b = $('.is-sug', box); choose(b.dataset.code, b); } });
}

function start() {
  if (started) return;
  started = true;
  for (const el of [$('main'), $('[data-top]'), $('.foot')]) el.inert = false;
  requestAnimationFrame(() => $$('.hero [data-h]').forEach(el => el.classList.add('in')));
  $$('[data-r], [data-split]').forEach(el => { if (!el.closest('.hero')) io.observe(el); });
  setTimeout(initTeaser, RM ? 0 : 450);
  setTimeout(updSticky, RM ? 0 : 1700);
  kick();
}

/* ---------- vidéo d'accroche + halo coloré ---------- */
let teaserVis = false;
const autoplay = !RM && !SAVE;
function playTeaser() {
  const v = els.teaser;
  if (!v) return;
  if (teaserVis && autoplay && !P.open) {
    if (!v.getAttribute('src')) { v.muted = true; v.src = MEDIA + 'teaser.mp4'; }
    v.play().catch(() => {});
  } else if (!v.paused) v.pause();
}
function initTeaser() {
  const v = els.teaser, cv = $('.ambi');
  if (!v || !cv) return;
  const g = cv.getContext('2d');
  const poster = new Image();
  poster.onload = () => g.drawImage(poster, 0, 0, cv.width, cv.height);
  poster.src = v.poster;
  new IntersectionObserver(([e]) => { teaserVis = e.isIntersecting; playTeaser(); }, { threshold: .2 }).observe(v);
  let n = 0;
  const paint = () => { if (!v.paused && v.readyState >= 2 && n++ % 3 === 0) g.drawImage(v, 0, 0, cv.width, cv.height); };
  if ('requestVideoFrameCallback' in v) {
    const cb = () => { paint(); v.requestVideoFrameCallback(cb); };
    v.requestVideoFrameCallback(cb);
  } else {
    const loop = () => { if (teaserVis) paint(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
}

/* ---------- effets liés au défilement et au pointeur ---------- */
const fx = { tx: 0, ty: 0, cx: 0, cy: 0 };
let ticking = false;
function kick() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
function frame() {
  ticking = false;
  const vh = innerHeight, y = scrollY;
  els.top.classList.toggle('scrolled', y > 8);

  const card = els.card;
  if (card && y < vh * 1.6) {
    fx.cx = lerp(fx.cx, fx.tx, .1);
    fx.cy = lerp(fx.cy, fx.ty, .1);
    const sp = RM ? 0 : clamp(y / (vh * .9));
    const flat = Math.min(1, sp * 1.4 + Math.hypot(fx.cx, fx.cy) * 1.5);
    card.style.transform = `translate3d(0,${(-sp * 34).toFixed(1)}px,0) rotateX(${(-fx.cy * 7 + sp * 9).toFixed(2)}deg) rotateY(${(fx.cx * 9).toFixed(2)}deg) rotate(${lerp(-2.5, 0, flat).toFixed(2)}deg) scale(${(1 - sp * .05).toFixed(3)})`;
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
  els.sticky?.classList.toggle('on', started && seen.size === 0 && overlays === 0 && !root.classList.contains('is-welcome'));
}

function lock(on) {
  overlays = Math.max(0, overlays + (on ? 1 : -1));
  root.classList.toggle('is-locked', overlays > 0);
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
  sheet.hidden = false;
  lock(true);
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('open')));
  const panel = $('.sheet-panel', sheet);
  panel.tabIndex = -1;
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
    return;
  }
  let url;
  try { url = new URL(payLink()); } catch { url = null; }
  if (!url || url.protocol !== 'https:') { err.textContent = I.t('sheet.unavailable'); return; }
  err.textContent = '';
  btn.classList.add('loading');
  // Page Stripe dans la langue du visiteur ; la référence garde la langue et l'acceptation des CGV (version) avec la case cochée.
  url.searchParams.set('locale', I.info.stripe);
  url.searchParams.set('client_reference_id', `site_${I.lang}_cgv-${I.config.termsVersion}_retractation-ok`);
  location.assign(url.href);
}

/* ---------- lecteur vidéo ---------- */
const P = { open: false, hideT: 0, drag: null };
const fmtT = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function pui(show = true) {
  const el = els.player;
  clearTimeout(P.hideT);
  if (show) el.classList.add('ui');
  if (!els.pvideo.paused) P.hideT = setTimeout(() => el.classList.remove('ui'), 2600);
}
function flipFrom(fr, from) {
  const to = fr.getBoundingClientRect();
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
}
function openPlayer() {
  if (P.open) return;
  if (!els.sheet.hidden) closeSheet();
  const el = els.player, fr = $('.player-frame', el), v = els.pvideo;
  P.open = true;
  lastFocus = document.activeElement;
  el.hidden = false;
  el.classList.remove('ended');
  lock(true);
  els.teaser?.pause();
  if (!v.getAttribute('src')) { v.poster = v.dataset.poster; v.src = MEDIA + 'video.mp4'; }
  try { v.currentTime = 0; } catch { /* pas encore chargée */ }
  v.muted = false;
  el.classList.toggle('muted', false);
  el.classList.add('paused');
  const p = v.play();
  if (p) p.catch(() => el.classList.add('paused'));
  const from = els.card.getBoundingClientRect();
  const visible = from.bottom > 0 && from.top < innerHeight;
  requestAnimationFrame(() => {
    el.classList.add('open');
    if (!RM && visible) fr.animate([{ transform: flipFrom(fr, from), borderRadius: '34px' }, { transform: 'none', borderRadius: '28px' }], { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' });
    else if (!RM) fr.animate([{ opacity: 0, transform: 'translateY(30px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.16,1,.3,1)' });
  });
  pui();
  setTimeout(() => $('.p-x', el).focus({ preventScroll: true }), 80);
  requestAnimationFrame(ptick);
}
function closePlayer() {
  if (!P.open) return;
  P.open = false;
  const el = els.player, fr = $('.player-frame', el), v = els.pvideo;
  v.pause();
  el.classList.remove('open');
  const to = els.card.getBoundingClientRect();
  const back = !RM && to.bottom > 0 && to.top < innerHeight;
  const cur = getComputedStyle(fr).transform;
  const anim = RM ? null : fr.animate(
    back ? [{ transform: cur === 'none' ? 'none' : cur }, { transform: flipFrom(fr, to), borderRadius: '34px', opacity: .9 }]
         : [{ transform: cur === 'none' ? 'none' : cur, opacity: 1 }, { transform: 'translateY(40px) scale(.95)', opacity: 0 }],
    { duration: back ? 520 : 320, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  const done = () => {
    el.hidden = true; anim?.cancel(); fr.style.transform = '';
    lock(false); playTeaser(); lastFocus?.focus?.({ preventScroll: true });
  };
  if (anim) anim.finished.then(done, done); else done();
}
function ptoggle() {
  const v = els.pvideo;
  if (els.player.classList.contains('ended')) { replay(); return; }
  if (v.paused) v.play().catch(() => {}); else v.pause();
  pui();
}
function replay() {
  const v = els.pvideo;
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
    if (e.target.closest('button')) return;
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

/* ---------- bandeaux ---------- */
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
    const r = els.card.getBoundingClientRect();
    fx.tx = clamp((e.clientX - (r.left + r.width / 2)) / (innerWidth / 2), -1, 1);
    fx.ty = clamp((e.clientY - (r.top + r.height / 2)) / (innerHeight / 2), -1, 1);
    kick();
  });
  hero.addEventListener('pointerleave', () => { fx.tx = fx.ty = 0; kick(); });
}

/* ---------- démarrage ---------- */
function wire() {
  Object.assign(els, {
    top: $('[data-top]'), card: $('.vcard-in'), teaser: $('.teaser'), steps: $('[data-steps]'), quote: $('[data-quote]'),
    sticky: $('[data-sticky]'), sheet: $('#sheet'), player: $('#player'), pvideo: $('.pvideo'),
  });
  els.stepItems = $$('.step');
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  const sio = new IntersectionObserver(es => { for (const e of es) e.isIntersecting ? seen.add(e.target) : seen.delete(e.target); updSticky(); });
  $$('[data-hide-sticky]').forEach(el => sio.observe(el));
  document.addEventListener('click', e => {
    if (e.target.closest('[data-book]')) { e.preventDefault(); openSheet(); }
    else if (e.target.closest('[data-play]')) { e.preventDefault(); openPlayer(); }
    else if (e.target.closest('#sheet [data-close]')) closeSheet();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !els.sheet.hidden) closeSheet(); });
  $('[data-checkout]').addEventListener('submit', checkout);
  $('[data-checkout]').consent.addEventListener('change', () => { $('.check').classList.remove('err'); $('[data-sheet-err]').textContent = ''; });
  addEventListener('pageshow', e => { if (e.persisted) $('[data-pay]').classList.remove('loading'); });
  wirePlayer();
  wireFaq();
  wireDesktop();
}

async function boot() {
  try {
    await I.init();
  } catch {
    root.classList.remove('is-welcome');
    $$('[data-h], [data-r], [data-split]').forEach(el => el.classList.add('in'));
    return;
  }
  const known = I.urlLang() || I.stored();
  await I.set(known || I.browser(), { persist: !!known });
  wire();
  langSwitch($('[data-langswitch]'), code => swapLang(code, () => { pageText(); replayVisible(); kick(); }));
  pageText();
  if (known) { root.classList.remove('is-welcome'); start(); } else welcome();
}
boot();

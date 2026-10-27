// Page des publicités TikTok (/pub) : titre, trois formules, récapitulatif, quelques réalisations et les avis, sur une seule page.
// Elle s'ouvre directement dans le navigateur intégré de TikTok. Ce qui y posait problème sur l'accueil (lecteur plein écran,
// fenêtres par-dessus la page, « clics » envoyés à la fin d'un défilement) n'existe pas ici : les vidéos se lisent dans la page,
// et une vidéo ne démarre qu'après un vrai toucher (doigt posé puis levé sans défiler).
// Le paiement suit exactement le récapitulatif de l'accueil : même case à cocher, même référence Stripe, même page de remerciement.
import { I, esc, langSwitch, swapLang } from './i18n.js?v=2f48bb3464';
import { pick } from './vars.js?v=79753bb137';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MEDIA = '/assets/media/';
const TIERS = ['studio', 'pro', 'essentielle'];
const KINDS = { studio: ['pub', 'motion', 'site'], pro: ['pub', 'motion', 'site'], essentielle: ['pub', 'motion'] };
// Navigateur intégré de TikTok (même repère que l'accueil). Il lit les vidéos en plein écran, et une fois qu'une vidéo a été
// touchée, il laisse les autres démarrer seules : un extrait lancé au défilement se rouvrait alors en plein écran.
// Dans TikTok, aucune vidéo ne démarre donc sans un toucher dessus : les extraits restent des images.
const TT = /BytedanceWebview|musical_ly|trill_|TikTok/i.test(navigator.userAgent) || /[?&]tiktok=1(&|$)/.test(location.search);
// dernier défilement, et période de calme après la fermeture d'une vidéo : aucun toucher n'y compte
let lastScroll = -1e9, calmUntil = 0;
addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true, capture: true });

// Les vidéos de la page : aucune n'affiche d'ancien prix. « client » : réalisée pour un vrai client.
const V = [
  { key: 'bmw', wide: true, label: { fr: 'Pub auto · 3D', en: 'Car ad · 3D' } },
  { key: 'digi', client: true, label: { fr: 'E-commerce', en: 'E-commerce' } },
  { key: 'tacnaan', client: true, label: { fr: 'Restaurant', en: 'Restaurant' } },
  { key: 'code', wide: true, label: { fr: 'Produit · 3D', en: 'Product · 3D' } },
];
// les quelques textes propres à cette page
const T = {
  fr: { client: 'Pour un client', again: 'Choisir ma formule' },
  en: { client: 'For a client', again: 'Choose my package' },
};
const tx = k => (T[I.lang] || T.fr)[k];

let tier = 'pro';

// mots découpés pour l'animation du titre (même découpage que l'accueil)
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
// « *mot* » dans un titre : le mot passe en citron
const accent = s => esc(s).replace(/\*([^*]+)\*/g, '<em class="acc">$1</em>');

/* ---------- un vrai toucher, jamais un « clic » de fin de défilement ---------- */
// Dans TikTok, un clic peut arriver à la fin d'un défilement. Ici, une action ne part que si le doigt (ou la souris)
// a été posé puis levé au même endroit juste avant. strict (vidéos) : en plus, aucun défilement pendant le geste ni dans le quart
// de seconde avant (un doigt posé pour arrêter la page qui glisse n'est pas un toucher), et rien juste après la fermeture d'une vidéo.
// keys : un clic sans doigt ni souris (Entrée ou Espace sur un bouton) compte aussi ; pas sur une vidéo, qui a sa propre touche.
function onTap(el, fn, { keys = true, strict = false } = {}) {
  let start = null, armed = 0;
  el.addEventListener('pointerdown', e => {
    const now = performance.now();
    start = e.button || (strict && (now - lastScroll < 250 || now < calmUntil)) ? null : { x: e.clientX, y: e.clientY, t: now, id: e.pointerId };
  });
  el.addEventListener('pointercancel', () => { start = null; });
  el.addEventListener('pointerup', e => {
    const now = performance.now();
    const ok = start && e.pointerId === start.id && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 10 && now - start.t < 800 && (!strict || (lastScroll < start.t && now >= calmUntil));
    start = null;
    armed = ok ? now : 0;
  });
  el.addEventListener('click', e => {
    const now = performance.now();
    const real = (!strict || now >= calmUntil) && ((keys && e.detail === 0) || (armed && now - armed < 600 && (!strict || lastScroll < armed)));
    armed = 0;
    if (real) fn(e); else { e.preventDefault(); e.stopPropagation(); }
  });
}

/* ---------- formules ---------- */
function pickTier(id) {
  tier = id;
  for (const b of $$('[data-pick]')) { const on = b.dataset.pick === id; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', String(on)); }
  const v = { ...I.vars.tiers?.[id] };
  $('[data-sum]').innerHTML = I.t(`offers.${id}.sum`, v).split(' · ').map((x, k) => `<span${k ? '' : ' class="on"'}>${esc(x)}</span>`).join('');
  $('[data-go-label]').textContent = I.t('hero.choose', { name: I.t(`offers.${id}.name`), price: I.vars.prices?.[id] });
  orderText();
}
function orderText() {
  const f = $('[data-checkout]'), tv = { ...I.vars.tiers?.[tier], tierName: I.t(`offers.${tier}.name`) };
  for (const el of $$('[data-o]', f)) el.textContent = I.t(`sheet.creation.${el.dataset.o}`, tv);
  const items = [];
  for (let k = 0; k < 8; k++) { const x = I.t(`offers.${tier}.items.${k}`, tv); if (!x) break; items.push(x); }
  $('[data-o-items]', f).innerHTML = items.map(x => `<li>${esc(x)}</li>`).join('');
  $('[data-o-ship]', f).textContent = I.t('sheet.creation.ship', tv);
  $('[data-o-price]', f).textContent = I.vars.prices?.[tier] || '';
  // le site web est dans Pro et Studio, pas dans l'Essentielle
  const kinds = $('[data-kinds]', f);
  for (const l of $$('.kind', kinds)) l.hidden = !KINDS[tier].includes($('input', l).value);
  kinds.classList.toggle('two', KINDS[tier].length === 2); kinds.classList.toggle('three', KINDS[tier].length === 3);
  if (!KINDS[tier].includes(f.elements.kind.value)) f.elements.kind.value = 'pub';
  kindSpec();
}
function kindSpec() {
  const k = $('[data-checkout]').elements.kind.value;
  $('[data-kind-spec]').textContent = I.t(k === 'site' ? `sheet.creation.specs.site.${tier}` : `sheet.creation.specs.${k}`, I.vars.tiers?.[tier]);
}
function openOrder() {
  const f = $('[data-checkout]');
  f.hidden = false;
  $('[data-o-err]', f).textContent = '';
  requestAnimationFrame(() => f.scrollIntoView({ block: 'start', behavior: RM ? 'auto' : 'smooth' }));
}
// Lien de paiement Stripe de la formule (site/config.json), avec l'offre de lancement tant qu'elle dure.
function payLink(o) {
  const c = I.config, L = c.launch || {};
  if (I.vars.launchOn && L[o]?.paymentLink) return String(L[o].paymentLink).trim();
  return String(c.creation?.tiers?.[o]?.paymentLink || '').trim();
}
function checkout(e) {
  e.preventDefault();
  const f = e.currentTarget, err = $('[data-o-err]', f), chk = $('.check', f), btn = $('[data-pay]', f);
  if (!f.consent.checked) {
    err.textContent = I.t('sheet.consentRequired');
    chk.classList.remove('err'); void chk.offsetWidth; chk.classList.add('err');
    chk.scrollIntoView({ block: 'center', behavior: RM ? 'auto' : 'smooth' });
    return;
  }
  let url;
  try { url = new URL(payLink(tier)); } catch { url = null; }
  if (!url || url.protocol !== 'https:') { err.textContent = I.t('sheet.unavailable'); return; }
  err.textContent = '';
  btn.classList.add('loading');
  // même référence que l'accueil : langue, version des CGV acceptée, formule, type de projet ; une création répond par e-mail
  const kind = KINDS[tier].includes(f.elements.kind.value) ? f.elements.kind.value : 'pub';
  url.searchParams.set('locale', I.info.stripe);
  url.searchParams.set('client_reference_id', `site_${I.lang}_cgv-${I.config.termsVersion}_retractation-ok_offre-${tier}_type-${kind}_rep-mail`);
  try { localStorage.setItem('offre', JSON.stringify({ o: tier, t: Date.now() })); } catch { /* navigation privée */ }
  location.assign(url.href);
}
// retour depuis Stripe (bouton précédent) : le bouton n'attend plus
addEventListener('pageshow', () => $('[data-pay]')?.classList.remove('loading'));

/* ---------- vidéos : extrait muet (hors TikTok), puis la vidéo complète avec le son ---------- */
// Un toucher lance la vidéo complète, un autre la met en pause. Pas de commandes natives dans la page : un toucher égaré
// dessus relançait la vidéo. Quand une vidéo se ferme (plein écran quitté), elle reste en pause et la page reste calme un instant.
function buildVideos() {
  const box = $('[data-videos]');
  box.innerHTML = V.map((v, k) => `
    <figure class="pv${v.wide ? ' pv-wide' : ''}" data-v="${k}">
      <div class="pv-media" role="button" tabindex="0">
        <video muted loop playsinline webkit-playsinline preload="none" poster="${MEDIA}${v.key}-poster.webp" data-teaser="${MEDIA}${v.key}-teaser.mp4"></video>
        <span class="pv-play"><i><svg class="pv-ic-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg><svg class="pv-ic-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 5.5h3v13h-3zM13.5 5.5h3v13h-3z"/></svg></i><span data-play-label></span></span>
        ${v.client ? '<em class="pv-client" data-client-label></em>' : ''}
      </div>
      <figcaption data-label></figcaption>
    </figure>`).join('');
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(seen, { threshold: [0, .35] }) : null;
  for (const fig of $$('.pv', box)) {
    const video = $('video', fig), media = $('.pv-media', fig);
    io?.observe(fig);
    onTap(media, () => toggle(fig), { keys: false, strict: true });
    media.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(fig); } });
    video.addEventListener('play', () => fig.classList.toggle('playing', fig.classList.contains('full')));
    video.addEventListener('pause', () => fig.classList.remove('playing'));
    video.addEventListener('ended', () => { fig.classList.remove('playing'); video.currentTime = 0; });
    // plein écran quitté (iPhone) : la vidéo reste en pause, et rien ne compte pendant un instant
    const quit = () => { video.pause(); calmUntil = performance.now() + 900; };
    video.addEventListener('webkitendfullscreen', quit);
    video.addEventListener('webkitfullscreenchange', () => { if (!document.webkitFullscreenElement) quit(); });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && fig.classList.contains('full')) quit(); });
  }
}
// l'extrait ne tourne que visible ; la vidéo complète s'arrête quand on la quitte
function seen(entries) {
  for (const en of entries) {
    const fig = en.target, video = $('video', fig), on = en.intersectionRatio >= .35;
    if (fig.classList.contains('full')) { if (!en.isIntersecting) video.pause(); continue; }
    if (on && !RM && !TT) {
      if (!video.src) video.src = video.dataset.teaser;
      video.play().catch(() => { /* lecture auto refusée : l'affiche reste */ });
    } else video.pause();
  }
}
function toggle(fig) {
  const v = V[+fig.dataset.v], video = $('video', fig);
  if (fig.classList.contains('full') && !video.paused) { video.pause(); return; }
  for (const other of $$('.pv.full')) if (other !== fig) $('video', other).pause();
  if (!fig.classList.contains('full')) {
    fig.classList.add('full');
    video.loop = false;
    video.muted = false;
    video.preload = 'auto';
    video.src = `${MEDIA}${v.key}.mp4`;
  }
  video.play().catch(() => { /* lecture refusée : l'image reste, un nouveau toucher réessaie */ });
}

/* ---------- avis : les vraies captures, côte à côte ---------- */
function buildReviews() {
  const list = (Array.isArray(I.config.reviews) ? I.config.reviews : []).filter(r => r?.consent && r.capture);
  const bar = r => I.t(r.source === 'email' ? 'reviews.barMailShort' : 'reviews.barDmShort');
  $('[data-reviews]').innerHTML = list.map(r => `
    <figure class="pr">
      <span class="pr-bar">${esc(bar(r))}<b>${esc(I.t('reviews.authentic'))}</b></span>
      <img src="${esc(r.capture)}" alt="${esc(I.t('reviews.alt'))}" loading="lazy" decoding="async">
      <figcaption>${esc(pick(r.name, I.lang) || '')}</figcaption>
    </figure>`).join('');
  $('#avis').hidden = !list.length;
}

/* ---------- textes qui dépendent de la langue ---------- */
function proofLine() {
  const raw = (Array.isArray(I.config.proof) ? I.config.proof : []).filter(p => String(pick(p?.value, I.lang) ?? '').trim());
  const line = $('[data-proofline]');
  const ico = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.9-3 3-4.6 5.5-4.6s4.6 1.6 5.5 4.6"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.6c1.5.6 2.5 2.1 3 4.4"/></svg>';
  line.hidden = !raw.length;
  line.innerHTML = raw.slice(0, 2).map(p => `<span class="hp-i">${p.icon === 'users' ? ico : ''}<b>${esc(pick(p.value, I.lang))}</b> ${esc(pick(p.label, I.lang))}</span>`).join('');
}
function texts() {
  document.title = I.t('meta.title');
  const h = $('.h-hero');
  h.classList.remove('in');
  for (const l of $$('[data-split]', h)) { l.textContent = I.t(l.dataset.i18n); split(l); }
  requestAnimationFrame(() => requestAnimationFrame(() => h.classList.add('in')));
  for (const el of $$('[data-acc]')) el.innerHTML = accent(I.t(el.dataset.acc));
  for (const el of $$('[data-mini]')) el.textContent = I.t(`offers.${el.dataset.mini}.mini`, I.vars.tiers?.[el.dataset.mini]);
  for (const fig of $$('.pv')) {
    const v = V[+fig.dataset.v];
    $('[data-label]', fig).textContent = pick(v.label, I.lang);
    $('[data-play-label]', fig).textContent = I.t('work.play');
    const c = $('[data-client-label]', fig);
    if (c) c.textContent = tx('client');
  }
  $('[data-again-label]').textContent = tx('again');
  proofLine();
  buildReviews();
  pickTier(tier);
}

async function boot() {
  await I.init();
  await I.set(I.urlLang() || I.stored() || I.browser(), { persist: false });
  buildVideos();
  texts();
  langSwitch($('[data-langswitch]'), code => swapLang(code, texts));
  for (const b of $$('[data-pick]')) onTap(b, () => pickTier(b.dataset.pick));
  onTap($('[data-go]'), openOrder);
  onTap($('[data-again]'), () => $('#offres').scrollIntoView({ block: 'center', behavior: RM ? 'auto' : 'smooth' }));
  const f = $('[data-checkout]');
  f.addEventListener('submit', checkout);
  f.addEventListener('change', e => {
    if (e.target.name === 'kind') kindSpec();
    if (e.target.name === 'consent' && e.target.checked) { $('[data-o-err]', f).textContent = ''; $('.check', f).classList.remove('err'); }
  });
}
boot();

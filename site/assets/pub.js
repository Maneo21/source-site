// Page des publicités TikTok (/pub) : c'est l'accueil à l'identique (pub.html est fabriquée depuis index.html par
// outils/pub-depuis-accueil.mjs, et app.js fait tourner la page), sans l'écran « Ouvrez dans votre navigateur ».
// Ce script s'exécute avant app.js et ne règle qu'une chose : les vidéos.
// Sur ordinateur : il rend le mur et les réalisations à app.js, qui les anime exactement comme sur l'accueil.
// Sur téléphone (donc dans le navigateur de TikTok) : aucune vidéo ne tourne seule, les vignettes sont des images. Un vrai toucher
// crée la vidéo complète avec le son et la lance dans la page (TikTok l'ouvre en plein écran) ; dès qu'elle se ferme ou se termine,
// elle est retirée de la page. Il ne reste rien qui puisse se relancer en défilant (le bug vu dans TikTok le 27 oct.).

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const MEDIA = '/assets/media/';
// Navigateur intégré de TikTok (même repère que l'accueil). Mais TikTok ne se nomme pas toujours (lien ouvert depuis un message privé :
// « TikTok : non » sur l'iPhone d'Evan, 27 oct.) : sur tout téléphone, on suit donc la voie sûre.
const TT = /BytedanceWebview|musical_ly|trill_|TikTok/i.test(navigator.userAgent) || /[?&]tiktok=1(&|$)/.test(location.search);
const SAFE = TT || matchMedia('(hover: none) and (pointer: coarse)').matches;

// Journal à l'écran, seulement avec « ?diag=1 » dans l'adresse (en haut ; celui d'app.js est en bas).
const DIAG = /[?&]diag=1(&|$)/.test(location.search), T0 = performance.now(), diagLines = [];
let diagEl = null;
function diag(msg) {
  if (!DIAG) return;
  if (!diagEl) { diagEl = document.createElement('pre'); diagEl.className = 'pub-diag'; document.body.append(diagEl); }
  diagLines.push(`${((performance.now() - T0) / 1000).toFixed(2)}  ${msg}`);
  if (diagLines.length > 14) diagLines.shift();
  diagEl.textContent = diagLines.join('\n');
}

// dernier défilement, et période de calme après la fermeture d'une vidéo : aucun toucher n'y compte
let lastScroll = -1e9, calmUntil = 0;
addEventListener('scroll', () => { const now = performance.now(); if (now - lastScroll > 300) diag('défilement'); lastScroll = now; }, { passive: true, capture: true });

/* ---------- un vrai toucher, jamais un « clic » de fin de défilement ---------- */
// Une vidéo ne part que si le doigt a été posé puis levé au même endroit juste avant, sans défilement pendant le geste ni dans
// le quart de seconde avant (un doigt posé pour arrêter la page qui glisse n'est pas un toucher), et rien juste après une fermeture.
function onTap(el, fn, tag) {
  let start = null, armed = 0;
  el.addEventListener('pointerdown', e => {
    const now = performance.now();
    start = e.button || now - lastScroll < 250 || now < calmUntil ? null : { x: e.clientX, y: e.clientY, t: now, id: e.pointerId };
    diag(`${tag} doigt posé (${e.pointerType})${start ? '' : now < calmUntil ? ' · ignoré : calme' : ' · ignoré : défilement'}`);
  });
  el.addEventListener('pointercancel', () => { start = null; diag(`${tag} geste annulé`); });
  el.addEventListener('pointerup', e => {
    const now = performance.now();
    const ok = start && e.pointerId === start.id && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 10 && now - start.t < 800 && lastScroll < start.t && now >= calmUntil;
    if (start) diag(`${tag} doigt levé · ${ok ? 'toucher' : 'refusé'} (${Math.round(now - start.t)} ms)`);
    start = null;
    armed = ok ? now : 0;
  });
  el.addEventListener('click', e => {
    const now = performance.now();
    const real = now >= calmUntil && armed && now - armed < 600 && lastScroll < armed;
    diag(`${tag} clic ${real ? 'accepté' : 'IGNORÉ'}`);
    armed = 0;
    e.preventDefault(); e.stopPropagation();
    if (real) fn();
  });
}

/* ---------- téléphone : une seule vidéo à la fois, créée au toucher, retirée dès qu'elle se ferme ---------- */
let cur = null;
function play(fig) {
  if (cur?.fig === fig) { close('toucher sur la vidéo en cours'); return; }
  close('autre vidéo touchée');
  const key = fig.dataset.k, video = document.createElement('video');
  video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');
  video.preload = 'auto';
  video.poster = `${MEDIA}${key}-poster.webp`;
  video.src = `${MEDIA}${key}.mp4`;
  const c = cur = { fig, video, key, fs: false, asked: performance.now() };
  const ev = (type, fn) => video.addEventListener(type, () => { if (cur === c) { diag(`${key} ${type}`); fn?.(); } });
  ev('play', () => { if (performance.now() - c.asked > 2500 && !c.fs) close('lecture non demandée, arrêtée'); else fig.classList.add('playing'); });
  ev('pause', () => { fig.classList.remove('playing'); if (!c.fs) close('pause'); });
  ev('ended', () => close('fin de la vidéo'));
  ev('webkitbeginfullscreen', () => { c.fs = true; });
  ev('webkitendfullscreen', () => { c.fs = false; close('plein écran quitté'); });
  ev('error', () => close('erreur de lecture'));
  fig.classList.add('full');
  fig.prepend(video);
  diag(`${key} lancée`);
  video.play().catch(err => { diag(`${key} lecture refusée (${err.name})`); close('lecture refusée'); });
}
function close(why) {
  const c = cur;
  if (!c) return;
  cur = null;
  diag(`${c.key} retirée · ${why}`);
  calmUntil = performance.now() + 900;
  try { c.video.pause(); } catch { /* déjà arrêtée */ }
  try { if (c.fs) c.video.webkitExitFullscreen?.(); } catch { /* pas en plein écran */ }
  c.video.removeAttribute('src');
  try { c.video.load(); } catch { /* rien à décharger */ }
  c.video.remove();
  c.fig.classList.remove('full', 'playing');
}

if (!SAFE) {
  // ordinateur : exactement l'accueil (mur animé, extraits muets, lecteur)
  $('[data-pub-wall]')?.setAttribute('data-wall', '');
  $('[data-pub-reel]')?.setAttribute('data-reel', '');
} else {
  const tiles = $$('.rt');
  for (const fig of tiles) {
    $$('video', fig).forEach(v => v.remove());
    const btn = $('[data-play]', fig);
    if (btn) { btn.dataset.pv = btn.dataset.play; delete btn.dataset.play; }   // app.js n'ouvre plus son lecteur
    onTap(fig, () => play(fig), fig.dataset.k);
    btn?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); play(fig); } });
  }
  // la vignette apparaît en entrant à l'écran (comme sur l'accueil) ; une vidéo qui en sort, hors plein écran, est retirée
  const io = new IntersectionObserver(es => {
    for (const e of es) {
      if (e.isIntersecting) e.target.classList.add('in');
      else if (cur?.fig === e.target && !cur.fs) close('vignette sortie de l’écran');
    }
  }, { threshold: [0, .15] });
  tiles.forEach(t => io.observe(t));
  diag(`page prête · TikTok : ${TT ? 'oui' : 'non'} · voie sûre : oui · ${tiles.length} vidéos`);
  diag(navigator.userAgent.slice(0, 150));
}

/* ---------- invitation à ouvrir le site dans le vrai navigateur (téléphone, page TikTok) ---------- */
// Une petite carte en haut à droite, avec une flèche vers le ••• de TikTok (sa barre est au-dessus de la page, centre à ~26 px du
// bord droit, mesuré sur la capture d'Evan du 22 oct.). Elle ne bloque rien : « Plus tard » la ferme pour la visite. Elle revient une
// fois, au moment de choisir une formule (le paiement est plus simple dans Safari ou Chrome).
if (SAFE) {
  const EN = /^en/i.test(document.documentElement.lang || '');
  const T = EN
    ? { t: 'Open the site in your browser', d: 'For a better experience and an easier checkout.', pt: 'To pay, open the site in your browser', pd: 'Checkout is easier in Safari or Chrome.', s: 'Tap <b class="ttb-k"><i>•</i><i>•</i><i>•</i></b> at the top right, then <b>“Open in browser”</b>.', copy: 'Copy link', copied: 'Link copied ✓', later: 'Later', fail: 'Long-press to copy' }
    : { t: 'Ouvrez le site dans votre navigateur', d: 'Pour une meilleure expérience et un paiement plus simple.', pt: 'Pour payer, ouvrez le site dans votre navigateur', pd: 'Le paiement est plus simple dans Safari ou Chrome.', s: 'Touchez <b class="ttb-k"><i>•</i><i>•</i><i>•</i></b> en haut à droite, puis <b>« Ouvrir dans le navigateur »</b>.', copy: 'Copier le lien', copied: 'Lien copié ✓', later: 'Plus tard', fail: 'Appui long pour copier' };
  const box = document.createElement('div');
  box.className = 'ttb'; box.hidden = true;
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-live', 'polite');
  box.innerHTML = `<span class="ttb-ar" aria-hidden="true"><svg viewBox="0 0 24 40"><path d="M12 38V4M4 12l8-8 8 8"/></svg></span>
    <div class="ttb-in">
      <p class="ttb-t" data-ttb-t></p>
      <p class="ttb-d" data-ttb-d></p>
      <p class="ttb-s">${T.s}</p>
      <div class="ttb-b"><button type="button" class="ttb-copy" data-ttb-copy>${T.copy}</button><button type="button" class="ttb-x" data-ttb-x>${T.later}</button></div>
    </div>`;
  document.body.append(box);
  const KEY = 'ttb-ferme';
  let closed = false, payShown = false;
  try { closed = sessionStorage.getItem(KEY) === '1'; } catch { /* navigation privée */ }
  const show = pay => {
    $('[data-ttb-t]', box).textContent = pay ? T.pt : T.t;
    $('[data-ttb-d]', box).textContent = pay ? T.pd : T.d;
    box.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('on')));
    diag(`invitation navigateur${pay ? ' (paiement)' : ''}`);
  };
  const hide = () => {
    box.classList.remove('on');
    try { sessionStorage.setItem(KEY, '1'); } catch { /* navigation privée */ }
    setTimeout(() => { if (!box.classList.contains('on')) box.hidden = true; }, 450);
  };
  if (!closed) setTimeout(() => show(false), 1500);
  $('[data-ttb-x]', box).addEventListener('click', hide);
  $('[data-ttb-copy]', box).addEventListener('click', async e => {
    const b = e.currentTarget, url = location.origin + '/';
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch {
      const ta = document.createElement('textarea'); ta.value = url; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0';
      document.body.append(ta); ta.select(); try { ok = document.execCommand('copy'); } catch { ok = false; } ta.remove();
    }
    b.textContent = ok ? T.copied : T.fail;
  });
  // au moment de choisir une formule : rappel, une seule fois
  document.addEventListener('click', e => {
    if (payShown || !e.target.closest('[data-book]')) return;
    payShown = true;
    setTimeout(() => show(true), 650);
  }, true);
}

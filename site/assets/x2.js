// Ajouts à la page : vidéos des nouveaux blocs (Métiers, Pubs studio, fin) et coordonnées tirées de config.json.
// Accueil (index.html) : les extraits se chargent à l'approche et tournent seulement à l'écran ; un toucher ouvre le lecteur du site.
// Page TikTok (pub.html, corps « pub ») sur téléphone : même voie sûre que assets/pub.js — aucune vidéo dans la page, des images ;
// un vrai toucher crée la vidéo complète dans sa carte, et elle est retirée dès qu'elle se ferme, se termine ou sort de l'écran.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NB = ' ', MEDIA = '/assets/media/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TT = /BytedanceWebview|musical_ly|trill_|TikTok/i.test(navigator.userAgent) || /[?&]tiktok=1(&|$)/.test(location.search);
  const SAFE = document.body.classList.contains('pub') && (TT || matchMedia('(hover: none) and (pointer: coarse)').matches);
  const player = document.getElementById('player');
  const playerOpen = () => player && !player.hidden;

  if (SAFE) safePath(); else autoPath();

  /* ---------- accueil : extraits muets à l'écran ---------- */
  function autoPath() {
    const vids = $$('.x2 video[data-lazy]');
    const load = v => { if (v.dataset.poster && !v.poster) v.poster = v.dataset.poster; if (!v.getAttribute('src') && v.dataset.src) { v.src = v.dataset.src; v.load(); } };
    const play = v => { load(v); if (RM) return; const p = v.play(); if (p) p.catch(() => {}); };
    const shown = new Set();
    const near = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { load(e.target); near.unobserve(e.target); } }), { rootMargin: '700px 0px' });
    const vis = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { shown.add(e.target); if (!playerOpen()) play(e.target); }
      else { shown.delete(e.target); e.target.pause(); }
    }), { threshold: .2 });
    vids.forEach(v => { near.observe(v); vis.observe(v); });
    if (player) new MutationObserver(() => { if (playerOpen()) vids.forEach(v => v.pause()); else shown.forEach(play); }).observe(player, { attributes: true, attributeFilter: ['hidden'] });
    document.addEventListener('visibilitychange', () => { if (document.hidden) vids.forEach(v => v.pause()); else if (!playerOpen()) shown.forEach(play); });
  }

  /* ---------- page TikTok sur téléphone : la voie sûre ---------- */
  function safePath() {
    // les extraits deviennent des images fixes
    $$('.x2 video[data-lazy]').forEach(v => {
      const img = document.createElement('img');
      img.src = v.dataset.poster || ''; img.alt = ''; img.decoding = 'async'; img.loading = 'lazy'; img.className = 'xposter';
      v.replaceWith(img);
    });
    let lastScroll = -1e9, calmUntil = 0, cur = null;
    addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true, capture: true });
    // un vrai toucher : doigt posé puis levé au même endroit, sans défilement pendant le geste ni juste avant
    function onTap(el, fn) {
      let start = null, armed = 0;
      el.addEventListener('pointerdown', e => { const now = performance.now(); start = e.button || now - lastScroll < 250 || now < calmUntil ? null : { x: e.clientX, y: e.clientY, t: now, id: e.pointerId }; });
      el.addEventListener('pointercancel', () => { start = null; });
      el.addEventListener('pointerup', e => {
        const now = performance.now();
        const ok = start && e.pointerId === start.id && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 10 && now - start.t < 800 && lastScroll < start.t && now >= calmUntil;
        start = null; armed = ok ? now : 0;
      });
      el.addEventListener('click', e => {
        const now = performance.now(), real = now >= calmUntil && armed && now - armed < 600 && lastScroll < armed;
        armed = 0; e.preventDefault(); e.stopPropagation();
        if (real) fn();
      });
    }
    function close() {
      const c = cur;
      if (!c) return;
      cur = null; calmUntil = performance.now() + 900;
      try { c.video.pause(); } catch { /* déjà arrêtée */ }
      try { if (c.fs) c.video.webkitExitFullscreen?.(); } catch { /* pas en plein écran */ }
      c.video.removeAttribute('src');
      try { c.video.load(); } catch { /* rien à décharger */ }
      c.video.remove();
      c.card.classList.remove('xfull');
    }
    function play(card, key) {
      if (cur?.card === card) { close(); return; }
      close();
      const video = document.createElement('video');
      video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');
      video.preload = 'auto'; video.className = 'xpv';
      video.poster = `${MEDIA}${key === 'etages' ? 'etages-poster-src' : key + '-poster'}.webp`;
      video.src = `${MEDIA}${key}.mp4`;
      const c = cur = { card, video, fs: false, asked: performance.now() };
      const on = (t, fn) => video.addEventListener(t, () => { if (cur === c) fn(); });
      on('play', () => { if (performance.now() - c.asked > 2500 && !c.fs) close(); });
      on('pause', () => { if (!c.fs) close(); });
      on('ended', close);
      on('webkitbeginfullscreen', () => { c.fs = true; });
      on('webkitendfullscreen', () => { c.fs = false; close(); });
      on('error', close);
      card.classList.add('xfull');
      card.prepend(video);
      video.play().catch(close);
    }
    const cards = $$('.x2 [data-play]');
    for (const card of cards) {
      const key = card.dataset.play;
      card.dataset.xpv = key; delete card.dataset.play;   // le lecteur d'app.js ne s'ouvre pas
      onTap(card, () => play(card, key));
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); play(card, key); } });
    }
    // une vidéo dont la carte sort de l'écran (hors plein écran) est retirée
    const io = new IntersectionObserver(es => { for (const e of es) if (!e.isIntersecting && cur?.card === e.target && !cur.fs) close(); }, { threshold: [0, .15] });
    cards.forEach(c => io.observe(c));
  }

  /* ---------- e-mail, TikTok, téléphone et prix de départ : les mêmes réglages que le reste du site ---------- */
  fetch('/config.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(c => {
    if (!c) return;
    const mail = c.contactEmail, tk = c.creator?.tiktok, ph = c.seller?.phone?.fr;
    if (mail) { $$('[data-contact-mail]').forEach(a => { a.href = 'mailto:' + mail; }); $$('[data-contact-mail-text]').forEach(el => { el.textContent = mail; }); }
    if (tk) { $$('[data-tiktok-link], [data-x-tiktok]').forEach(a => { a.href = 'https://www.tiktok.com/@' + tk; }); $$('[data-tiktok-text]').forEach(el => { el.textContent = '@' + tk; }); }
    if (ph) { $$('[data-phone-text]').forEach(el => { el.textContent = ph.replace(/ /g, NB); }); $$('[data-phone-link]').forEach(a => { a.href = 'tel:+33' + ph.replace(/\D/g, '').replace(/^0/, ''); }); }
    const tiers = c.creation?.tiers || {}, amounts = Object.values(tiers).map(t => t.amount).filter(Boolean);
    if (amounts.length) { const m = Math.min(...amounts); $$('[data-price-from]').forEach(el => { el.textContent = `dès ${m % 100 ? (m / 100).toFixed(2).replace('.', ',') : m / 100}${NB}€`; }); }
  }).catch(() => {});
})();

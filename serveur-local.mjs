// Aperçu local du site, sur ton Mac et ton téléphone (même Wi-Fi). Rien n'est publié.
// Le paiement passe par un lien de paiement Stripe (site/config.json).
// Les e-mails de commande (dossier emails/) ne partent jamais d'ici : l'aperçu les affiche seulement.
import { createServer } from 'node:http';
import { readFileSync, statSync, createReadStream } from 'node:fs';
import { join, extname, resolve, dirname, sep } from 'node:path';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { qrSvg, qrTerminal } from './outils/qr.mjs';
import { clientMail, adminMail } from './emails/modeles.mjs';
import { readOrder, contextFrom } from './emails/webhook.mjs';
import { exempleEvenement } from './emails/exemple.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, 'site');
const APERCU = join(HERE, 'apercu');
const PORT = Number(process.env.PORT || 4820);

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
const LANGS = JSON.parse(readFileSync(join(SITE, 'i18n', 'languages.json'), 'utf8')).map(l => l.code);
const BADGE = '<script src="/apercu/badge.js" defer></script>';

function lanIp() {
  for (const list of Object.values(networkInterfaces())) for (const n of list || []) if (n.family === 'IPv4' && !n.internal && !n.address.startsWith('169.254')) return n.address;
  return null;
}
const paymentMode = () => {
  try {
    const link = JSON.parse(readFileSync(join(SITE, 'config.json'), 'utf8')).paymentLink || '';
    return !link ? 'aucun' : /\/test_/.test(link) ? 'test' : 'reel';
  } catch { return 'aucun'; }
};

// Aperçu des e-mails de commande, construits avec une fausse commande.
const EMAILS = [['client-fr', 'Client · français'], ['client-en', 'Client · anglais'], ['vendeur-fr', 'Pour toi · commande en français'], ['vendeur-en', 'Pour toi · commande en anglais']];
function emailPreview(id, origin) {
  const [kind, lang] = id.split('-');
  const ctx = contextFrom(JSON.parse(readFileSync(join(SITE, 'config.json'), 'utf8')), origin);
  const ev = exempleEvenement({ lang, live: true, created: Math.floor(Date.now() / 1000) }), order = readOrder(ev.data.object, ev);
  const mail = kind === 'vendeur' ? adminMail(order, ctx) : clientMail(order, ctx);
  return { ...mail, from: `${ctx.brand} <${ctx.contact}>`, to: kind === 'vendeur' ? ctx.contact : order.email };
}

function sendFile(req, res, file, status = 200) {
  const ext = extname(file), st = statSync(file);
  const base = { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': /\.(mp4|webp|jpg|png|svg|woff2)$/.test(ext) ? 'public, max-age=3600' : 'no-store', 'x-content-type-options': 'nosniff' };
  if (ext === '.html') {
    let html = readFileSync(file, 'utf8');
    if (!file.startsWith(APERCU)) html = html.replace('</body>', `${BADGE}\n</body>`);
    res.writeHead(status, { ...base, 'content-length': Buffer.byteLength(html) });
    return res.end(req.method === 'HEAD' ? undefined : html);
  }
  const range = req.headers.range;
  if (range && /^bytes=\d*-\d*$/.test(range)) {
    const [a, b] = range.slice(6).split('-');
    let start = a === '' ? st.size - Number(b) : Number(a);
    let end = a !== '' && b !== '' ? Number(b) : st.size - 1;
    start = Math.max(0, start); end = Math.min(st.size - 1, end);
    if (start > end) { res.writeHead(416, { 'content-range': `bytes */${st.size}` }); return res.end(); }
    res.writeHead(206, { ...base, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${st.size}`, 'content-length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    return createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(status, { ...base, 'accept-ranges': 'bytes', 'content-length': st.size });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
}

function resolveStatic(rootDir, pathname) {
  let p;
  try { p = decodeURIComponent(pathname); } catch { return null; }
  const full = resolve(rootDir, '.' + p);
  if (full !== rootDir && !full.startsWith(rootDir + sep)) return null;
  for (const f of [full, full + '.html', join(full, 'index.html')]) { try { if (statSync(f).isFile()) return f; } catch { /* suivant */ } }
  return null;
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`), p = url.pathname;
  try {
    if (p === '/apercu/api/info') {
      const ip = lanIp(), phone = ip ? `http://${ip}:${PORT}/` : null;
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(JSON.stringify({ payment: paymentMode(), phone, qr: phone ? qrSvg(phone) : null }));
    }
    if (p === '/apercu/api/emails') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(JSON.stringify(EMAILS.map(([id, nom]) => { const m = emailPreview(id, url.origin); return { id, nom, objet: m.subject, de: m.from, a: m.to }; })));
    }
    if (p.startsWith('/apercu/email/') && EMAILS.some(e => e[0] === p.slice(14))) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(emailPreview(p.slice(14), url.origin).html);
    }
    if (p === '/favicon.ico') return sendFile(req, res, join(SITE, 'assets', 'favicon.svg'));
    if (p === '/apercu' || p.startsWith('/apercu/')) {
      const f = resolveStatic(APERCU, p.replace(/^\/apercu/, '') || '/');
      if (f) return sendFile(req, res, f);
    } else {
      const seg = p.split('/').filter(Boolean);
      const f = p === '/' || (seg.length === 1 && LANGS.includes(seg[0])) ? join(SITE, 'index.html') : resolveStatic(SITE, p);
      if (f) return sendFile(req, res, f);
    }
    return sendFile(req, res, join(SITE, '404.html'), 404);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') { console.log(`\n  L’aperçu tourne déjà sur le port ${PORT}.\n`); process.exit(0); }
  throw e;
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = lanIp(), phone = ip ? `http://${ip}:${PORT}/` : null, pm = paymentMode();
  console.log('\n  ─────────────────────────────────────────────');
  console.log('   Aperçu local · page de vente « AI Web Studio »');
  console.log('  ─────────────────────────────────────────────');
  console.log(`   Sur ce Mac        http://localhost:${PORT}/`);
  console.log(`   Outils d’aperçu   http://localhost:${PORT}/apercu`);
  if (phone) console.log(`   Sur ton téléphone ${phone}   (même Wi-Fi)`);
  console.log(`   Paiement          ${pm === 'aucun' ? 'lien Stripe pas encore branché' : pm === 'test' ? 'lien Stripe de TEST (aucun vrai paiement)' : 'lien Stripe RÉEL'}`);
  console.log('   Rien n’est publié. Ferme cette fenêtre pour arrêter.\n');
  if (phone) { console.log('   Scanne avec l’appareil photo de ton téléphone :\n'); console.log(qrTerminal(phone)); }
});

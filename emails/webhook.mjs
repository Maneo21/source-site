// Reçoit les événements de Stripe et envoie les deux e-mails d'une commande payée.
// Rien ne part sans signature Stripe valide ni sans paiement réellement encaissé.
// Aucune clé n'est écrite ici : tout vient des variables secrètes de Cloudflare.
import { clientMail, adminMail } from './modeles.mjs';

const TYPES = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);
const TOLERANCE = 300;            // secondes : une signature plus ancienne est refusée
const KEEP = 60 * 60 * 24 * 180;  // l'état « déjà envoyé » est gardé 180 jours
const TIMEOUT = 6000;             // millisecondes laissées à Postmark pour répondre
const RECIPIENT = new Set([300, 406]);
const KINDS = ['site', 'pub', 'motion', 'autre']; // types de projet proposés dans le récapitulatif du site // refus liés à l'adresse du destinataire
const DEFAULTS = { brand: 'AI Web Studio', contactEmail: 'contact@maneo-ai.fr', offer: { replyHours: 24 }, seller: {} };
const POSTMARK = {
  10: 'Jeton Postmark refusé : la variable POSTMARK_TOKEN est incorrecte.',
  300: 'Adresse e-mail refusée par Postmark (adresse invalide).',
  400: 'Expéditeur inconnu de Postmark : l’adresse d’envoi n’est pas une signature validée du compte.',
  401: 'Expéditeur pas encore confirmé dans Postmark.',
  405: 'Quota Postmark épuisé : plus aucun envoi possible ce mois-ci.',
  406: 'Adresse désactivée chez Postmark (rebond ou plainte lors d’un envoi précédent).',
  412: 'Compte Postmark en attente d’approbation : l’envoi est limité au domaine de l’expéditeur.'
};

const enc = new TextEncoder();
const clean = v => String(v ?? '').trim();
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const json = (status, body, headers = {}) => new Response(JSON.stringify(body, null, 1), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers } });

/* ---------- signature Stripe ---------- */

function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function sign(secret, payload) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payload)))].map(x => x.toString(16).padStart(2, '0')).join('');
}

async function verify(raw, header, secrets, now) {
  const parts = clean(header).split(',').map(p => p.trim().split('='));
  const t = parts.find(p => p[0] === 't')?.[1], sigs = parts.filter(p => p[0] === 'v1' && p[1]).map(p => p[1]);
  if (!t || !/^\d+$/.test(t) || !sigs.length || Math.abs(now - Number(t)) > TOLERANCE) return false;
  for (const secret of secrets) {
    const mac = await sign(secret, `${t}.${raw}`);
    if (sigs.some(s => same(s, mac))) return true;
  }
  return false;
}

/* ---------- lecture de la commande ---------- */

const langOf = v => { const s = norm(v); return /^(en\b|eng|anglais)/.test(s) ? 'en' : /^(fr\b|fra|french)/.test(s) ? 'fr' : null; };

function tiktokOf(value) {
  const raw = clean(value);
  const handle = (raw.match(/tiktok\.com\/@([\w.]+)/i)?.[1] || raw).replace(/^@+/, '');
  const ok = /^[\w.]{2,24}$/.test(handle);
  return { tiktok: raw ? (ok ? `@${handle}` : raw) : '', tiktokUrl: ok ? `https://www.tiktok.com/@${handle}` : '' };
}

// Les champs sont reconnus par leur type et leur libellé : ils restent lus même si un libellé change dans Stripe.
export function readOrder(session, event) {
  const o = { lang: null, tiktok: '', tiktokUrl: '', project: '', others: [] };
  for (const f of session.custom_fields || []) {
    const label = clean(f.label?.custom) || clean(f.key), id = norm(`${f.key} ${label}`);
    let value = '';
    if (f.type === 'dropdown') value = (f.dropdown?.options || []).find(x => x.value === f.dropdown?.value)?.label || f.dropdown?.value || '';
    else value = f[f.type]?.value ?? '';
    value = clean(value);
    if (f.type === 'dropdown' && !o.lang && (langOf(value) || /lang|idiom/.test(id))) o.lang = langOf(value) || langOf(f.dropdown?.value);
    else if (/tiktok|pseudo|handle|username/.test(id)) Object.assign(o, tiktokOf(value));
    else if (!o.project && /projet|project|site|description|idee|idea/.test(id)) o.project = value;
    else o.others.push({ label, value });
  }
  // Référence posée par le site : langue, version des CGV acceptée, puis type de projet s'il a été choisi.
  const ref = clean(session.client_reference_id).match(/^site_([a-z]{2})_cgv-([\d-]+)_retractation-ok(?:_type-([a-z]+))?$/);
  const email = clean(session.customer_details?.email || session.customer_email).replace(/[\r\n]/g, '');
  return {
    ...o,
    lang: o.lang || langOf(ref?.[1]) || langOf(session.locale) || 'fr',
    email: email.length <= 254 && /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email) ? email : '',
    ref: `AWS-${clean(session.id).replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase()}`,
    sessionId: clean(session.id),
    paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : clean(session.payment_intent?.id),
    live: session.livemode === true,
    amount: session.amount_total,
    currency: session.currency,
    at: event.created || session.created || Math.floor(Date.now() / 1000),
    consent: !!ref,
    cgv: ref?.[2] || null,
    kind: KINDS.includes(ref?.[3]) ? ref[3] : null
  };
}

export function contextFrom(cfg, origin) {
  const c = { ...DEFAULTS, ...(cfg || {}) };
  return { brand: clean(c.brand) || DEFAULTS.brand, contact: clean(c.contactEmail) || DEFAULTS.contactEmail, replyHours: Number(c.offer?.replyHours) || 24, seller: c.seller || {}, origin };
}

// Les réglages du site (nom, délai, vendeur) sont lus dans site/config.json, déjà publié avec le site.
async function context(request, env) {
  const origin = new URL(request.url).origin;
  try {
    const r = await env.ASSETS.fetch(new URL('/config.json', origin).href);
    if (r.ok) return contextFrom(await r.json(), origin);
  } catch { /* réglages par défaut */ }
  return contextFrom(null, origin);
}

/* ---------- envoi par Postmark ---------- */

async function postmark(send, env, mail) {
  let res, data = {};
  try {
    res = await send('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: { 'x-postmark-server-token': clean(env.POSTMARK_TOKEN), accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ ...mail, MessageStream: clean(env.POSTMARK_STREAM) || 'outbound', TrackOpens: false, TrackLinks: 'None' }),
      signal: AbortSignal.timeout(TIMEOUT)
    });
    data = await res.json().catch(() => ({}));
  } catch (e) {
    return { ok: false, kind: 'transient', reason: `Postmark injoignable (${e?.name || 'erreur réseau'}).` };
  }
  const code = Number(data.ErrorCode) || 0;
  if (res.ok && code === 0) return { ok: true, id: data.MessageID || null };
  const kind = RECIPIENT.has(code) ? 'recipient' : res.status === 429 || res.status >= 500 ? 'transient' : 'config';
  return { ok: false, kind, code, reason: POSTMARK[code] || `Postmark a refusé l’envoi (${res.status}${code ? `, code ${code}` : ''}) : ${clean(data.Message) || 'sans précision'}` };
}

/* ---------- mémoire anti-doublons (Cloudflare KV) ---------- */

const load = async (env, key) => { try { return (await env.COMMANDES.get(key, 'json')) || {}; } catch { return {}; } };
const save = async (env, key, state) => { try { await env.COMMANDES.put(key, JSON.stringify(state), { expirationTtl: KEEP }); } catch { console.warn('Anti-doublons non enregistré : espace KV « COMMANDES » absent ou indisponible.'); } };

/* ---------- réponses ---------- */

function status(env) {
  const r = { STRIPE_WEBHOOK_SECRET: !!clean(env.STRIPE_WEBHOOK_SECRET), POSTMARK_TOKEN: !!clean(env.POSTMARK_TOKEN), COMMANDES: typeof env.COMMANDES?.get === 'function' };
  const say = v => (v ? 'ok' : 'manquant');
  return json(200, {
    service: 'E-mails de commande',
    pret: r.STRIPE_WEBHOOK_SECRET && r.POSTMARK_TOKEN && r.COMMANDES,
    reglages: {
      'STRIPE_WEBHOOK_SECRET (signature Stripe)': say(r.STRIPE_WEBHOOK_SECRET),
      'POSTMARK_TOKEN (envoi des e-mails)': say(r.POSTMARK_TOKEN),
      'COMMANDES (anti-doublons)': say(r.COMMANDES),
      'STRIPE_WEBHOOK_SECRET_TEST (facultatif, pour les essais)': clean(env.STRIPE_WEBHOOK_SECRET_TEST) ? 'ok' : 'absent'
    }
  });
}

const ignored = why => json(200, { ok: true, ignore: why });

/* ---------- traitement ---------- */

export async function handle(request, env = {}, deps = {}) {
  const send = deps.fetch || fetch, now = Math.floor((deps.now || Date.now()) / 1000);
  if (request.method === 'GET' || request.method === 'HEAD') return status(env);
  if (request.method !== 'POST') return json(405, { ok: false, erreur: 'Méthode non acceptée.' }, { allow: 'GET, POST' });

  const secrets = [env.STRIPE_WEBHOOK_SECRET, env.STRIPE_WEBHOOK_SECRET_TEST].map(clean).filter(Boolean);
  if (!secrets.length) return json(500, { ok: false, erreur: 'Variable STRIPE_WEBHOOK_SECRET manquante dans Cloudflare.' });

  const raw = await request.text();
  if (raw.length > 262144) return json(413, { ok: false, erreur: 'Message trop volumineux.' });
  if (!(await verify(raw, request.headers.get('stripe-signature'), secrets, now))) return json(400, { ok: false, erreur: 'Signature Stripe invalide.' });

  let event;
  try { event = JSON.parse(raw); } catch { return json(400, { ok: false, erreur: 'Message illisible.' }); }
  // Stripe propose deux formats. Le format « léger » ne contient pas la commande : il est refusé clairement, pour être vu dans Stripe.
  if (event?.object === 'v2.core.event' || (event?.related_object && !event?.data)) return json(422, { ok: false, erreur: 'Format « léger » reçu. Dans Stripe, recrée la destination avec le format « Instantané ».' });
  const session = event?.data?.object;
  if (!TYPES.has(event?.type) || session?.object !== 'checkout.session') return ignored('événement non concerné');
  // Seul le lien de paiement de ce site compte : les abonnements et autres ventes du compte Stripe sont laissés de côté.
  const wanted = clean(env.STRIPE_PAYMENT_LINK);
  if (session.mode !== 'payment' || !session.payment_link || (wanted && session.payment_link !== wanted)) return ignored('autre produit');
  if (session.payment_status !== 'paid') return ignored('paiement pas encore encaissé');
  if (!clean(env.POSTMARK_TOKEN)) return json(500, { ok: false, erreur: 'Variable POSTMARK_TOKEN manquante dans Cloudflare.' });

  const ctx = await context(request, env), order = readOrder(session, event);
  const from = clean(env.MAIL_FROM) || `${ctx.brand} <${ctx.contact}>`, owner = clean(env.ADMIN_EMAIL) || ctx.contact;
  const key = `commande:${order.sessionId}`, state = await load(env, key);
  const meta = { commande: order.ref, session: order.sessionId.slice(0, 80) };
  const stamp = new Date(now * 1000).toISOString();
  const fail = (step, r) => {
    console.error(`Commande ${order.ref} : e-mail ${step} non envoyé. ${r.reason}`);
    return json(500, { ok: false, commande: order.ref, etape: step, erreur: r.reason, suite: 'Stripe renverra automatiquement cet événement.' });
  };

  // 1. La confirmation du client. Un refus lié à son adresse n'arrête pas la suite : le vendeur en est averti.
  let refused = null;
  if (!state.client) {
    if (!order.email) refused = 'Adresse e-mail absente ou invalide dans la commande Stripe.';
    else {
      const m = clientMail(order, ctx);
      const r = await postmark(send, env, { From: from, To: order.email, ReplyTo: ctx.contact, Subject: m.subject, HtmlBody: m.html, TextBody: m.text, Tag: 'commande-client', Metadata: meta });
      if (r.ok) { state.client = { sent: stamp, id: r.id }; await save(env, key, state); }
      else if (r.kind === 'recipient') refused = r.reason;
      else return fail('client', r);
    }
  }

  // 2. La fiche de commande pour le vendeur. « Répondre » écrit directement au client.
  if (!state.admin) {
    const m = adminMail(order, ctx, refused ? { failed: refused } : { sent: true });
    const r = await postmark(send, env, { From: from, To: owner, ...(order.email ? { ReplyTo: order.email } : {}), Subject: m.subject, HtmlBody: m.html, TextBody: m.text, Tag: 'commande-vendeur', Metadata: meta });
    if (!r.ok) return fail('vendeur', r);
    state.admin = { sent: stamp, id: r.id };
    if (refused) state.client = { failed: refused, at: stamp };
    await save(env, key, state);
  }

  console.log(`Commande ${order.ref} : client ${state.client?.sent ? 'envoyé' : 'non envoyé'}, vendeur ${state.admin?.sent ? 'envoyé' : 'non envoyé'}.`);
  return json(200, { ok: true, commande: order.ref, client: state.client?.sent ? 'envoyé' : 'non envoyé', vendeur: 'envoyé' });
}

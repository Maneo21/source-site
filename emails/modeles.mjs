// Modèles des deux e-mails envoyés après un paiement confirmé par Stripe :
// la confirmation du client (FR ou EN) et la fiche de commande pour le vendeur.
// Aucune image ni police externe : l'e-mail s'affiche partout sans rien charger.

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Les couleurs du site (site/assets/site.css), en valeurs pleines pour les messageries.
const C = { bg: '#09090A', card: '#111113', line: '#252527', ink: '#F2EFE9', ink2: '#B4B1AC', ink3: '#86847F', acc: '#D2FF4D', accInk: '#0B0D04', accBg: '#282E1A', warn: '#FF8A70', warnBg: '#2B1713' };
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
const MONTHS = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
};

const T = {
  fr: {
    subject: b => `Votre commande est confirmée — ${b}`,
    pre: h => `Merci\u00A0! Votre réponse personnalisée arrive très vite, sous ${h}\u00A0h maximum.`,
    chip: 'Paiement confirmé',
    title: 'Votre commande est confirmée',
    hello: 'Bonjour 👋',
    thanks: 'Merci pour votre confiance\u00A0!',
    confirmed: (b, p) => [`Votre commande d’accompagnement personnalisé ${b} à `, p, ' a bien été confirmée.'],
    received: 'J’ai bien reçu votre demande et vais prendre connaissance de votre projet.',
    reply: (h, handle) => ['Vous recevrez une réponse personnalisée très rapidement, ', `sous ${h}\u00A0h maximum`, handle ? `, en message privé sur TikTok (${handle}).` : ', directement par e-mail.'],
    dm: 'Pensez à regarder vos demandes de messages sur TikTok. Si le message privé ne peut pas vous être remis, je vous répondrai par e-mail.',
    via: handle => (handle ? `En message privé sur TikTok (${handle})` : 'Par e-mail'),
    bye: 'À très bientôt,',
    recap: 'Votre commande',
    k: { product: 'Prestation', amount: 'Montant', ref: 'Référence', date: 'Date', via: 'Réponse', kind: 'Type de projet', project: 'Votre projet' },
    kinds: { site: 'Site web', pub: 'Vidéo publicitaire', motion: 'Motion design', autre: 'Autre projet' },
    product: 'Accompagnement personnalisé — Création avec l’IA',
    once: 'paiement unique',
    help: 'Une question\u00A0? Répondez simplement à cet e-mail.',
    waived: 'Comme vous l’avez demandé lors de votre commande, la prestation commence immédiatement. Vous avez reconnu perdre votre droit de rétractation une fois celle-ci entièrement exécutée.',
    right: 'Vous disposez d’un droit de rétractation de 14 jours, dans les conditions prévues par les conditions générales de vente.',
    cgv: 'Conditions générales de vente',
    withdrawal: 'Droit de rétractation',
    why: b => `Vous recevez cet e-mail à la suite de votre commande sur ${b}.`,
    test: 'Commande de test\u00A0: aucun paiement réel.',
    quote: s => `«\u00A0${s}\u00A0»`
  },
  en: {
    subject: b => `Your order is confirmed — ${b}`,
    pre: h => `Thank you! Your personalised reply will reach you very soon, within ${h} hours at most.`,
    chip: 'Payment confirmed',
    title: 'Your order is confirmed',
    hello: 'Hi 👋',
    thanks: 'Thank you for your order!',
    confirmed: (b, p) => [`Your ${b} personal coaching order for `, p, ' is confirmed.'],
    received: 'I’ve received your request and will now read through your project.',
    reply: (h, handle) => ['You’ll receive a personalised reply very soon, ', `within ${h} hours at most`, handle ? `, as a direct message on TikTok (${handle}).` : ', by email.'],
    dm: 'Remember to check your message requests on TikTok. If I can’t reach you there, I’ll reply by email.',
    via: handle => (handle ? `Direct message on TikTok (${handle})` : 'By email'),
    bye: 'Speak soon,',
    recap: 'Your order',
    k: { product: 'Service', amount: 'Amount', ref: 'Reference', date: 'Date', via: 'Reply', kind: 'Project type', project: 'Your project' },
    kinds: { site: 'Website', pub: 'Video ad', motion: 'Motion design', autre: 'Other project' },
    product: 'Personal coaching — Creating with AI',
    once: 'one-time payment',
    help: 'Any questions? Just reply to this email.',
    waived: 'As you requested when ordering, the service starts immediately. You acknowledged that you lose your right of withdrawal once it has been fully performed.',
    right: 'You have a 14-day right of withdrawal, under the conditions set out in the terms of sale.',
    cgv: 'Terms of sale',
    withdrawal: 'Right of withdrawal',
    why: b => `You’re receiving this email because you placed an order on ${b}.`,
    test: 'Test order: no real payment.',
    quote: s => `“${s}”`
  }
};

const dict = lang => T[lang] || T.fr;
const pick = (v, lang) => (v && typeof v === 'object' ? v[lang] ?? v.fr ?? '' : v ?? '');
const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function money(amount, currency, lang) {
  const cur = String(currency || 'eur').toUpperCase(), n = ((Number(amount) || 0) / 100).toFixed(2);
  if (lang === 'fr') return `${n.replace('.', ',')}\u00A0${cur === 'EUR' ? '€' : cur}`;
  return cur === 'EUR' ? `€${n}` : `${n} ${cur}`;
}

// Date à l'heure de Paris, écrite à la main : le résultat ne dépend pas des langues connues du serveur.
export function when(ts, lang) {
  const d = new Date(Number(ts) * 1000), l = lang === 'fr' ? 'fr' : 'en';
  let p, zone = l === 'fr' ? 'heure de Paris' : 'Paris time';
  try {
    p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(x => [x.type, x.value]));
  } catch {
    p = { day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear(), hour: String(d.getUTCHours()).padStart(2, '0'), minute: String(d.getUTCMinutes()).padStart(2, '0') };
    zone = 'UTC';
  }
  const day = Number(p.day), month = MONTHS[l][Number(p.month) - 1];
  if (l === 'fr') return `${day === 1 ? '1er' : day} ${month} ${p.year} à ${p.hour}\u00A0h\u00A0${p.minute} (${zone})`;
  return `${day} ${month} ${p.year} at ${p.hour}:${p.minute} (${zone})`;
}

function sellerLine(seller = {}, lang) {
  const who = [seller.name, pick(seller.status, lang)].filter(Boolean).join(', ');
  return [who, seller.registration, pick(seller.address, lang), pick(seller.vat, lang)].filter(Boolean).join(' · ');
}

/* ---------- briques HTML ---------- */

function shell({ lang, title, preheader, brand, body, footer }) {
  return `<!doctype html>
<html lang="${esc(lang)}" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
<title>${esc(title)}</title>
<style>
:root{color-scheme:dark}
body{margin:0;padding:0;background:${C.bg}}
a{color:${C.acc}}
@media (max-width:540px){
.out{padding:18px 10px 34px!important}
.px{padding-left:22px!important;padding-right:22px!important}
.h1{font-size:29px!important}
.k{display:block!important;width:auto!important;padding:12px 0 0!important;border-bottom:0!important}
.v{display:block!important;width:auto!important;padding:3px 0 12px!important}
.btn{display:block!important;margin:0 0 10px!important;text-align:center!important}
}
</style>
</head>
<body style="margin:0;padding:0;background:${C.bg};color:${C.ink};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${esc(preheader)}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="width:100%;background:${C.bg};">
<tr><td class="out" align="center" style="padding:30px 14px 44px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;border-collapse:separate;">
<tr><td class="px" style="padding:4px 34px 20px;font:700 21px/1 ${FONT};letter-spacing:-.04em;color:${C.ink};">${esc(brand)}<span style="display:inline-block;width:10px;height:3px;margin-left:3px;border-radius:2px;background:${C.acc};"></span></td></tr>
<tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-radius:24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
${body}
</table>
</td></tr>
<tr><td class="px" style="padding:24px 34px 0;font:400 12.5px/1.6 ${FONT};color:${C.ink3};">
${footer}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const chip = (label, warn) => `<span style="display:inline-block;padding:7px 12px;border-radius:999px;background:${warn ? C.warnBg : C.accBg};color:${warn ? C.warn : C.acc};font:600 11.5px/1 ${FONT};letter-spacing:.06em;text-transform:uppercase;">${esc(label)}</span>`;
const head = (chips, title) => `<tr><td class="px" style="padding:34px 34px 0;">${chips}<h1 class="h1" style="margin:18px 0 0;font:700 35px/1.07 ${FONT};letter-spacing:-.035em;color:${C.ink};">${title}</h1></td></tr>`;
const para = (html, strong) => `<p style="margin:0 0 14px;${strong ? `color:${C.ink};` : ''}">${html}</p>`;
const b = s => `<strong style="font-weight:600;color:${C.ink};">${s}</strong>`;
const nb = html => html.replace(/e-mail/g, '<span style="white-space:nowrap;">e-mail</span>');
const link = (href, label, color = C.ink2) => `<a href="${esc(href)}" style="color:${color};text-decoration:underline;">${label}</a>`;

function rows(list) {
  return list.map(([k, v], i) => {
    const edge = i === list.length - 1 ? '' : `border-bottom:1px solid ${C.line};`;
    return `<tr><td class="k" valign="top" style="width:128px;padding:13px 14px 13px 0;font:500 13px/1.5 ${FONT};color:${C.ink3};${edge}">${esc(k)}</td><td class="v" valign="top" style="padding:13px 0;font:400 15px/1.5 ${FONT};color:${C.ink};word-break:break-word;${edge}">${v}</td></tr>`;
  }).join('\n');
}
const card = (label, list) => `<tr><td class="px" style="padding:26px 34px 0;">
<p style="margin:0 0 4px;font:600 11.5px/1 ${MONO};letter-spacing:.1em;text-transform:uppercase;color:${C.acc};">${esc(label)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
${rows(list)}
</table>
</td></tr>`;

/* ---------- e-mail du client ---------- */

export function clientMail(order, ctx) {
  const lang = T[order.lang] ? order.lang : 'fr', t = dict(lang), brand = ctx.brand, h = ctx.replyHours;
  const price = money(order.amount, order.currency, lang), date = when(order.at, lang);
  const project = order.project ? cut(order.project, 600) : '';
  // réponse sur TikTok seulement si le client l'a choisie ET a donné son pseudo ; sinon par e-mail
  const handle = order.channel === 'tiktok' && order.tiktok ? order.tiktok : '';
  const [c1, c2, c3] = t.confirmed(brand, price), [r1, r2, r3] = t.reply(h, handle);
  const legal = order.consent ? t.waived : t.right;
  const cgv = `${ctx.origin}/legal#cgv`, wd = `${ctx.origin}/legal#retractation`;
  const subject = `${order.live ? '' : '[TEST] '}${t.subject(brand)}`;

  const list = [[t.k.product, esc(t.product)], [t.k.amount, `${b(esc(price))} · ${esc(t.once)}`], [t.k.ref, `<span style="font-family:${MONO};font-size:14px;">${esc(order.ref)}</span>`], [t.k.date, esc(date)]];
  const kind = t.kinds[order.kind] || '';
  list.push([t.k.via, esc(t.via(handle))]);
  if (kind) list.push([t.k.kind, esc(kind)]);
  if (project) list.push([t.k.project, esc(t.quote(project)).replace(/\n/g, '<br>')]);

  const body = `${head(chip(`✓ ${t.chip}`) + (order.live ? '' : ` ${chip('Test', true)}`), esc(t.title))}
<tr><td class="px" style="padding:24px 34px 0;font:400 16px/1.62 ${FONT};color:${C.ink2};">
${para(esc(t.hello), true)}
${para(esc(t.thanks))}
${para(`${esc(c1)}${b(esc(price))}${esc(c3)}`)}
${para(esc(t.received))}
${para(nb(`${esc(r1)}${b(esc(r2))}${esc(r3)}`))}${handle ? `\n${para(nb(esc(t.dm)))}` : ''}
<p style="margin:22px 0 0;">${esc(t.bye)}<br>${b(esc(brand))}</p>
</td></tr>
${card(t.recap, list)}
<tr><td class="px" style="padding:20px 34px 32px;font:400 14px/1.55 ${FONT};color:${C.ink3};">${nb(esc(t.help))}</td></tr>`;

  const footer = `${order.live ? '' : `<p style="margin:0 0 10px;color:${C.warn};">${esc(t.test)}</p>`}<p style="margin:0 0 10px;">${esc(legal)}</p>
<p style="margin:0 0 10px;">${link(cgv, esc(t.cgv))} &nbsp;·&nbsp; ${link(wd, esc(t.withdrawal))}</p>
<p style="margin:0 0 10px;">${esc(sellerLine(ctx.seller, lang))}</p>
<p style="margin:0;">${nb(esc(t.why(brand)))}</p>`;

  const text = [
    order.live ? null : `[${t.test}]\n`,
    t.hello, '', t.thanks, '', `${c1}${price}${c3}`, '', t.received, '', `${r1}${r2}${r3}`, handle ? `\n${t.dm}` : null, '', t.bye, brand, '',
    `— ${t.recap} —`,
    `${t.k.product} : ${t.product}`,
    `${t.k.amount} : ${price} · ${t.once}`,
    `${t.k.ref} : ${order.ref}`,
    `${t.k.date} : ${date}`,
    `${t.k.via} : ${t.via(handle)}`,
    kind ? `${t.k.kind} : ${kind}` : null,
    project ? `${t.k.project} : ${t.quote(project)}` : null,
    '', t.help, '',
    legal,
    `${t.cgv} : ${cgv}`,
    `${t.withdrawal} : ${wd}`,
    '', sellerLine(ctx.seller, lang)
  ].filter(x => x !== null).join('\n').replace(/\u00A0/g, ' ').replace(/ : /g, lang === 'fr' ? ' : ' : ': ');

  return { subject, html: shell({ lang, title: subject, preheader: t.pre(h), brand, body, footer }), text };
}

/* ---------- fiche de commande pour le vendeur ---------- */

// `client` décrit l'e-mail de confirmation du client : { sent: true } ou { failed: 'raison' }.
export function adminMail(order, ctx, client = { sent: true }) {
  const brand = ctx.brand, price = money(order.amount, order.currency, 'fr');
  const date = when(order.at, 'fr'), due = when(Number(order.at) + ctx.replyHours * 3600, 'fr').replace(/ \(.*\)$/, '');
  const langName = order.lang === 'en' ? 'English · répondre en anglais' : 'Français';
  const empty = `<span style="color:${C.ink3};">Non renseigné</span>`;
  const tiktok = order.tiktok ? (order.tiktokUrl ? link(order.tiktokUrl, esc(order.tiktok), C.acc) : esc(order.tiktok)) : empty;
  const project = order.project ? esc(order.project).replace(/\n/g, '<br>') : empty;
  const mono = s => `<span style="font-family:${MONO};font-size:12.5px;color:${C.ink2};word-break:break-all;">${esc(s)}</span>`;
  const stripeUrl = order.paymentIntent ? `https://dashboard.stripe.com/${order.live ? '' : 'test/'}payments/${encodeURIComponent(order.paymentIntent)}` : '';
  const replySubject = order.lang === 'en' ? `Your ${brand} coaching` : `Votre accompagnement ${brand}`;
  const mailto = order.email ? `mailto:${encodeURIComponent(order.email).replace(/%40/g, '@')}?subject=${encodeURIComponent(replySubject)}` : '';
  const consent = order.consent ? `Renonciation acceptée sur le site${order.cgv ? ` (CGV du ${order.cgv.split('-').reverse().join('/')})` : ''}` : 'Non enregistrée : commande passée sans la case du site (lien Stripe ouvert directement)';
  const clientLine = client?.sent ? 'Confirmation envoyée ✓' : `<span style="color:${C.warn};">Non envoyée</span> · ${esc(client?.failed || 'raison inconnue')}`;
  const onTikTok = order.channel === 'tiktok';
  const via = !onTikTok ? 'Par e-mail' : order.tiktok ? `${b('Sur TikTok')} · ${tiktok}` : `<span style="color:${C.warn};">Sur TikTok demandé, mais pseudo non renseigné</span> · réponds par e-mail`;
  const viaText = !onTikTok ? 'par e-mail' : order.tiktok ? `sur TikTok (${order.tiktok})` : 'TikTok demandé, pseudo non renseigné : réponds par e-mail';
  const subject = `${order.live ? '' : '[TEST] '}Nouvelle commande · ${price} · ${order.email || 'e-mail manquant'}`;

  const list = [
    ['Client', order.email ? link(`mailto:${order.email}`, esc(order.email), C.acc) : empty],
    ['Répondre', via],
    ['Langue', esc(langName)],
    ['Pseudo TikTok', tiktok],
    ['Type de projet', T.fr.kinds[order.kind] ? esc(T.fr.kinds[order.kind]) : `<span style="color:${C.ink3};">Non précisé</span>`],
    ['Projet', project],
    ...order.others.map(o => [o.label, o.value ? esc(o.value) : empty]),
    ['Date', esc(date)],
    ['Référence', `<span style="font-family:${MONO};font-size:14px;">${esc(order.ref)}</span>`],
    ['Stripe', [order.sessionId, order.paymentIntent].filter(Boolean).map(mono).join('<br>')],
    ['Rétractation', esc(consent)],
    ['E-mail client', clientLine]
  ];

  const button = (href, label, primary) => `<a class="btn" href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:14px 20px;border-radius:999px;font:600 15px/1 ${FONT};text-decoration:none;${primary ? `background:${C.acc};color:${C.accInk};` : `background:${C.card};color:${C.ink};border:1px solid #3A3A3D;`}">${esc(label)}</a>`;
  const alert = client?.sent ? '' : `<tr><td class="px" style="padding:20px 34px 0;"><div style="padding:14px 16px;border-radius:14px;background:${C.warnBg};font:400 14.5px/1.5 ${FONT};color:${C.ink};">${b('L’e-mail de confirmation n’est pas parti chez le client.')}<br>${esc(client?.failed || '')}<br>Écris-lui directement pour confirmer sa commande.</div></td></tr>`;

  const body = `${head(chip('✓ Paiement confirmé par Stripe') + (order.live ? '' : ` ${chip('Test', true)}`), `Nouvelle commande · ${esc(price)}`)}
<tr><td class="px" style="padding:16px 34px 0;font:400 16px/1.55 ${FONT};color:${C.ink2};">À répondre dès que possible, au plus tard le ${b(esc(due))}.</td></tr>
${alert}
${card('La commande', list)}
<tr><td class="px" style="padding:22px 34px 26px;">
${onTikTok && order.tiktokUrl ? button(order.tiktokUrl, 'Ouvrir son TikTok', true) : ''}${mailto ? button(mailto, onTikTok && order.tiktokUrl ? 'Répondre par e-mail' : 'Répondre au client', !(onTikTok && order.tiktokUrl)) : ''}${stripeUrl ? button(stripeUrl, 'Voir dans Stripe', false) : ''}
<p style="margin:10px 0 0;font:400 13.5px/1.55 ${FONT};color:${C.ink3};">Le bouton « Répondre » de ta messagerie écrit aussi directement au client.</p>
</td></tr>`;

  const footer = `<p style="margin:0;">Notification automatique de ${esc(brand)}, envoyée après confirmation du paiement par Stripe.${order.live ? '' : ` <span style="color:${C.warn};">Commande de test : aucun paiement réel.</span>`}</p>`;

  const text = [
    `${order.live ? '' : '[TEST] '}Nouvelle commande · ${price}`,
    'Paiement confirmé par Stripe.',
    `À répondre dès que possible, au plus tard le ${due}.`,
    client?.sent ? null : `\nATTENTION : l’e-mail de confirmation n’est pas parti chez le client (${client?.failed || 'raison inconnue'}). Écris-lui directement.`,
    '',
    `Client : ${order.email || 'non renseigné'}`,
    `Répondre : ${viaText}`,
    `Langue : ${langName}`,
    `Pseudo TikTok : ${order.tiktok || 'non renseigné'}${order.tiktokUrl ? ` (${order.tiktokUrl})` : ''}`,
    `Type de projet : ${T.fr.kinds[order.kind] || 'non précisé'}`,
    `Projet : ${order.project || 'non renseigné'}`,
    ...order.others.map(o => `${o.label} : ${o.value || 'non renseigné'}`),
    `Date : ${date}`,
    `Référence : ${order.ref}`,
    `Stripe : ${[order.sessionId, order.paymentIntent].filter(Boolean).join(' · ')}`,
    `Rétractation : ${consent}`,
    `E-mail client : ${client?.sent ? 'confirmation envoyée' : 'non envoyée'}`,
    stripeUrl ? `\nVoir dans Stripe : ${stripeUrl}` : null
  ].filter(x => x !== null).join('\n').replace(/\u00A0/g, ' ');

  return { subject, html: shell({ lang: 'fr', title: subject, preheader: `${order.email || ''} · ${order.project || 'projet non renseigné'}`, brand, body, footer }), text };
}

// Modèles des deux e-mails envoyés après un paiement confirmé par Stripe :
// la confirmation du client (FR ou EN) et la fiche de commande pour le vendeur.
// Deux formules : « guide » (échange personnalisé, réponse écrite) et « creation » (création sur mesure, livrée par e-mail).
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
    pre: () => `Merci\u00A0! Votre réponse personnalisée arrive très vite.`,
    chip: 'Paiement confirmé',
    title: 'Votre commande est confirmée',
    hello: 'Bonjour 👋',
    thanks: 'Merci pour votre confiance\u00A0!',
    confirmed: (b, p) => [`Votre commande d’accompagnement personnalisé ${b} à `, p, ' a bien été confirmée.'],
    received: 'J’ai bien reçu votre demande et vais prendre connaissance de votre projet.',
    reply: (h, handle) => ['Vous recevrez une réponse personnalisée ', 'très rapidement', handle ? `, en message privé sur TikTok (${handle}).` : ', directement par e-mail.'],
    dm: 'Pensez à regarder vos demandes de messages sur TikTok. Si le message privé ne peut pas vous être remis, je vous répondrai par e-mail.',
    via: handle => (handle ? `En message privé sur TikTok (${handle})` : 'Par e-mail'),
    bye: 'À très bientôt,',
    recap: 'Votre commande',
    k: { product: 'Prestation', amount: 'Montant', ref: 'Référence', date: 'Date', via: 'Réponse', kind: 'Type de projet', project: 'Votre projet' },
    kinds: { site: 'Site web', pub: 'Vidéo publicitaire', motion: 'Motion design', autre: 'Autre projet' },
    product: 'Accompagnement personnalisé — Création avec l’IA',
    creation: {
      pre: h => `Merci\u00A0! Votre création est lancée\u00A0: livraison sous ${h}\u00A0h maximum.`,
      confirmed: (b, p, n) => [`Votre création ${n ? n + ' ' : 'sur mesure '}${b} à `, p, ' a bien été confirmée.'],
      received: what => `J’ai bien reçu votre demande et je commence la réalisation de ${what}.`,
      what: { site: 'votre site web', pub: 'votre vidéo publicitaire', motion: 'votre animation motion design', other: 'votre projet' },
      deliver: h => ['Vous recevrez votre création ', `sous ${h}\u00A0h maximum`, ', directement par e-mail.'],
      assets: `Vous avez un logo, des textes, des images ou des exemples que vous aimez\u00A0? Répondez simplement à cet e-mail pour me les transmettre.`,
      after: (n, d) => `Après la livraison, ${n} retouche${n > 1 ? 's sont incluses' : ' est incluse'} pour ajuster un détail, sous ${d} jours.`,
      via: h => `Par e-mail, sous ${h}\u00A0h maximum`,
      // commande arrivée sans description du projet : c'est la première chose demandée au client
      preNoBrief: () => `Merci\u00A0! Dernière étape\u00A0: décrivez-moi votre projet en répondant à cet e-mail.`,
      receivedNoBrief: what => `J’ai bien reçu votre commande pour ${what}.`,
      brief: `Pour que je puisse commencer, répondez simplement à cet e-mail en décrivant votre projet\u00A0: votre activité, ce que vous voulez montrer et le style que vous aimez. Joignez votre logo, vos textes et vos images si vous en avez.`,
      deliverNoBrief: h => ['Vous recevrez votre création ', `sous ${h}\u00A0h maximum après votre réponse`, ', directement par e-mail.'],
      product: n => n ? `Création ${n} — réalisée pour vous` : 'Création sur mesure — réalisée pour vous',
      k: { via: 'Livraison', kind: 'Création' }
    },
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
    pre: () => `Thank you! Your personalised reply will reach you very soon.`,
    chip: 'Payment confirmed',
    title: 'Your order is confirmed',
    hello: 'Hi 👋',
    thanks: 'Thank you for your order!',
    confirmed: (b, p) => [`Your ${b} personal coaching order for `, p, ' is confirmed.'],
    received: 'I’ve received your request and will now read through your project.',
    reply: (h, handle) => ['You’ll receive a personalised reply ', 'very soon', handle ? `, as a direct message on TikTok (${handle}).` : ', by email.'],
    dm: 'Remember to check your message requests on TikTok. If I can’t reach you there, I’ll reply by email.',
    via: handle => (handle ? `Direct message on TikTok (${handle})` : 'By email'),
    bye: 'Speak soon,',
    recap: 'Your order',
    k: { product: 'Service', amount: 'Amount', ref: 'Reference', date: 'Date', via: 'Reply', kind: 'Project type', project: 'Your project' },
    kinds: { site: 'Website', pub: 'Video ad', motion: 'Motion design', autre: 'Other project' },
    product: 'Personal coaching — Creating with AI',
    creation: {
      pre: h => `Thank you! Your creation is under way: delivery within ${h} hours.`,
      confirmed: (b, p, n) => [`Your ${b} ${n ? n + ' ' : 'made-to-order '}creation order for `, p, ' is confirmed.'],
      received: what => `I’ve received your request and I’m starting work on ${what}.`,
      what: { site: 'your website', pub: 'your video ad', motion: 'your motion design animation', other: 'your project' },
      deliver: h => ['You’ll receive your creation ', `within ${h} hours`, ', by email.'],
      assets: 'Do you have a logo, copy, images or examples you like? Just reply to this email to send them over.',
      after: (n, d) => `After delivery, ${n} revision${n > 1 ? 's are' : ' is'} included to adjust a detail, within ${d} days.`,
      via: h => `By email, within ${h} hours`,
      preNoBrief: () => `Thank you! One last step: tell me about your project by replying to this email.`,
      receivedNoBrief: what => `I’ve received your order for ${what}.`,
      brief: 'So that I can get started, just reply to this email and describe your project: what you do, what you want to show and the style you like. Attach your logo, copy and images if you have any.',
      deliverNoBrief: h => ['You’ll receive your creation ', `within ${h} hours of your reply`, ', by email.'],
      product: n => n ? `${n} creation — made for you` : 'Made-to-order creation — built for you',
      k: { via: 'Delivery', kind: 'Creation' }
    },
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
  const cur = String(currency || 'eur').toUpperCase(), v = Number(amount) || 0, n = (v / 100).toFixed(v % 100 ? 2 : 0);   // 99 €, 19,90 €
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

// Le nom de chaque formule de création, dans la langue du client.
const TIER_NAMES = { fr: { studio: 'Studio', pro: 'Pro', essentielle: 'Essentielle' }, en: { studio: 'Studio', pro: 'Pro', essentielle: 'Essential' } };

/* ---------- e-mail du client ---------- */

export function clientMail(order, ctx) {
  const lang = T[order.lang] ? order.lang : 'fr', t = dict(lang), brand = ctx.brand, h = ctx.replyHours;
  const price = money(order.amount, order.currency, lang), date = when(order.at, lang);
  const project = order.project ? cut(order.project, 600) : '';
  // création sur mesure : livrée par e-mail, dans le délai de livraison de la formule
  const creation = order.offer === 'creation', tc = t.creation, tv = creation ? ctx.tiers?.[order.tier] || {} : {}, dh = tv.deliveryHours || ctx.deliveryHours || 24;
  const tierName = creation ? TIER_NAMES[lang]?.[order.tier] || '' : '';
  // réponse sur TikTok seulement si le client l'a choisie ET a donné son pseudo ; sinon par e-mail
  const handle = !creation && order.channel === 'tiktok' && order.tiktok ? order.tiktok : '';
  // création arrivée sans description : le client est invité à la donner, et le délai court à partir de sa réponse
  const noBrief = creation && !project, what = creation ? tc.what[order.kind] || tc.what.other : '';
  const [c1, c2, c3] = (creation ? tc.confirmed : t.confirmed)(brand, price, tierName), [r1, r2, r3] = noBrief ? tc.deliverNoBrief(dh) : creation ? tc.deliver(dh) : t.reply(h, handle);
  const received = noBrief ? tc.receivedNoBrief(what) : creation ? tc.received(what) : t.received;
  const more = creation ? [noBrief ? tc.brief : tc.assets, tc.after(tv.revisions ?? ctx.revisions ?? 1, ctx.revisionDays || 7)] : handle ? [t.dm] : [];
  const product = creation ? tc.product(tierName) : t.product, viaLabel = creation ? tc.k.via : t.k.via, kindLabel = creation ? tc.k.kind : t.k.kind, via = creation ? tc.via(dh) : t.via(handle);
  const legal = order.consent ? t.waived : t.right;
  const cgv = `${ctx.origin}/legal#cgv`, wd = `${ctx.origin}/legal#retractation`;
  const subject = `${order.live ? '' : '[TEST] '}${t.subject(brand)}`;

  const list = [[t.k.product, esc(product)], [t.k.amount, `${b(esc(price))} · ${esc(t.once)}`], [t.k.ref, `<span style="font-family:${MONO};font-size:14px;">${esc(order.ref)}</span>`], [t.k.date, esc(date)]];
  const kind = t.kinds[order.kind] || '';
  list.push([viaLabel, esc(via)]);
  if (kind) list.push([kindLabel, esc(kind)]);
  if (project) list.push([t.k.project, esc(t.quote(project)).replace(/\n/g, '<br>')]);

  const body = `${head(chip(`✓ ${t.chip}`) + (order.live ? '' : ` ${chip('Test', true)}`), esc(t.title))}
<tr><td class="px" style="padding:24px 34px 0;font:400 16px/1.62 ${FONT};color:${C.ink2};">
${para(esc(t.hello), true)}
${para(esc(t.thanks))}
${para(`${esc(c1)}${b(esc(price))}${esc(c3)}`)}
${para(esc(received))}${noBrief ? `\n${para(nb(esc(more[0])), true)}` : ''}
${para(nb(`${esc(r1)}${b(esc(r2))}${esc(r3)}`))}${more.slice(noBrief ? 1 : 0).map(x => `\n${para(nb(esc(x)))}`).join('')}
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
    t.hello, '', t.thanks, '', `${c1}${price}${c3}`, '', received, ...(noBrief ? ['', more[0]] : []), '', `${r1}${r2}${r3}`, ...more.slice(noBrief ? 1 : 0).map(x => `\n${x}`), '', t.bye, brand, '',
    `— ${t.recap} —`,
    `${t.k.product} : ${product}`,
    `${t.k.amount} : ${price} · ${t.once}`,
    `${t.k.ref} : ${order.ref}`,
    `${t.k.date} : ${date}`,
    `${viaLabel} : ${via}`,
    kind ? `${kindLabel} : ${kind}` : null,
    project ? `${t.k.project} : ${t.quote(project)}` : null,
    '', t.help, '',
    legal,
    `${t.cgv} : ${cgv}`,
    `${t.withdrawal} : ${wd}`,
    '', sellerLine(ctx.seller, lang)
  ].filter(x => x !== null).join('\n').replace(/\u00A0/g, ' ').replace(/ : /g, lang === 'fr' ? ' : ' : ': ');

  return { subject, html: shell({ lang, title: subject, preheader: noBrief ? tc.preNoBrief() : creation ? tc.pre(dh) : t.pre(h), brand, body, footer }), text };
}

/* ---------- fiche de commande pour le vendeur ---------- */

// `client` décrit l'e-mail de confirmation du client : { sent: true } ou { failed: 'raison' }.
export function adminMail(order, ctx, client = { sent: true }) {
  const brand = ctx.brand, price = money(order.amount, order.currency, 'fr'), creation = order.offer === 'creation';
  const tv = creation ? ctx.tiers?.[order.tier] || {} : {}, hours = tv.deliveryHours || ctx.deliveryHours || 24, tierName = creation ? TIER_NAMES.fr[order.tier] || '' : '';
  const date = when(order.at, 'fr'), due = when(Number(order.at) + (creation ? hours : ctx.replyHours) * 3600, 'fr').replace(/ \(.*\)$/, '');
  const offerName = creation ? `Création ${tierName || 'sur mesure'} · ${tv.revisions ?? 1} retouche${(tv.revisions ?? 1) > 1 ? 's' : ''} · à livrer en ${hours} h` : 'Je te guide · échange personnalisé';
  // création sans description : rien à livrer tant que le client n'a pas décrit son projet
  const noBrief = creation && !order.project;
  const headline = creation ? `Création ${tierName ? tierName + ' ' : ''}à livrer` : 'Nouvelle commande', todo = creation ? 'À livrer par e-mail au plus tard le' : 'À répondre dès que possible, au plus tard le';
  const todoLine = noBrief ? `À livrer par e-mail sous ${hours} h après la description du client.` : `${todo} ${due}.`;
  const briefAlert = 'Aucune description du projet dans la commande. Le client a été invité à te la donner en répondant à sa confirmation : attends sa réponse, ou écris-lui.';
  const kindLabel = creation ? 'À créer' : 'Type de projet';
  const langName = order.lang === 'en' ? 'English · répondre en anglais' : 'Français';
  const empty = `<span style="color:${C.ink3};">Non renseigné</span>`;
  const tiktok = order.tiktok ? (order.tiktokUrl ? link(order.tiktokUrl, esc(order.tiktok), C.acc) : esc(order.tiktok)) : empty;
  const project = order.project ? esc(order.project).replace(/\n/g, '<br>') : empty;
  const mono = s => `<span style="font-family:${MONO};font-size:12.5px;color:${C.ink2};word-break:break-all;">${esc(s)}</span>`;
  const stripeUrl = order.paymentIntent ? `https://dashboard.stripe.com/${order.live ? '' : 'test/'}payments/${encodeURIComponent(order.paymentIntent)}` : '';
  const replySubject = creation ? (order.lang === 'en' ? `Your ${brand} creation` : `Votre création ${brand}`) : order.lang === 'en' ? `Your ${brand} coaching` : `Votre accompagnement ${brand}`;
  const mailto = order.email ? `mailto:${encodeURIComponent(order.email).replace(/%40/g, '@')}?subject=${encodeURIComponent(replySubject)}` : '';
  const [cy, cm, cd, cv] = String(order.cgv || '').split('-');
  const consent = order.consent ? `Renonciation acceptée sur le site${order.cgv ? ` (CGV du ${cd}/${cm}/${cy}${cv ? `, version ${cv}` : ''})` : ''}` : 'Non enregistrée : commande passée sans la case du site (lien Stripe ouvert directement)';
  const clientLine = client?.sent ? 'Confirmation envoyée ✓' : `<span style="color:${C.warn};">Non envoyée</span> · ${esc(client?.failed || 'raison inconnue')}`;
  const onTikTok = !creation && order.channel === 'tiktok';
  const via = !onTikTok ? 'Par e-mail' : order.tiktok ? `${b('Sur TikTok')} · ${tiktok}` : `<span style="color:${C.warn};">Sur TikTok demandé, mais pseudo non renseigné</span> · réponds par e-mail`;
  const viaText = !onTikTok ? 'par e-mail' : order.tiktok ? `sur TikTok (${order.tiktok})` : 'TikTok demandé, pseudo non renseigné : réponds par e-mail';
  const subject = `${order.live ? '' : '[TEST] '}${headline} · ${price} · ${order.email || 'e-mail manquant'}`;

  const list = [
    ['Client', order.email ? link(`mailto:${order.email}`, esc(order.email), C.acc) : empty],
    ['Formule', b(esc(offerName)) + (order.offerNote ? `<br><span style="color:${C.warn};">${esc(order.offerNote)}</span>` : '')],
    [creation ? 'Livrer' : 'Répondre', creation ? 'Par e-mail' : via],
    ['Langue', esc(langName)],
    ['Pseudo TikTok', tiktok],
    [kindLabel, (T.fr.kinds[order.kind] ? esc(T.fr.kinds[order.kind]) : `<span style="color:${C.ink3};">Non précisé</span>`) + (order.kindBefore ? `<br><span style="color:${C.warn};">Sur le site, le client avait choisi « ${esc(T.fr.kinds[order.kindBefore])} ».</span>` : '')],
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

  const body = `${head(chip('✓ Paiement confirmé par Stripe') + (order.live ? '' : ` ${chip('Test', true)}`), `${headline} · ${esc(price)}`)}
<tr><td class="px" style="padding:16px 34px 0;font:400 16px/1.55 ${FONT};color:${C.ink2};">${noBrief ? esc(todoLine) : `${todo} ${b(esc(due))}.`}</td></tr>
${alert}${noBrief ? `<tr><td class="px" style="padding:20px 34px 0;"><div style="padding:14px 16px;border-radius:14px;background:${C.warnBg};font:400 14.5px/1.5 ${FONT};color:${C.ink};">${esc(briefAlert)}</div></td></tr>` : ''}
${card('La commande', list)}
<tr><td class="px" style="padding:22px 34px 26px;">
${onTikTok && order.tiktokUrl ? button(order.tiktokUrl, 'Ouvrir son TikTok', true) : ''}${mailto ? button(mailto, onTikTok && order.tiktokUrl ? 'Répondre par e-mail' : creation ? 'Écrire au client' : 'Répondre au client', !(onTikTok && order.tiktokUrl)) : ''}${stripeUrl ? button(stripeUrl, 'Voir dans Stripe', false) : ''}
<p style="margin:10px 0 0;font:400 13.5px/1.55 ${FONT};color:${C.ink3};">Le bouton « Répondre » de ta messagerie écrit aussi directement au client.</p>
</td></tr>`;

  const footer = `<p style="margin:0;">Notification automatique de ${esc(brand)}, envoyée après confirmation du paiement par Stripe.${order.live ? '' : ` <span style="color:${C.warn};">Commande de test : aucun paiement réel.</span>`}</p>`;

  const text = [
    `${order.live ? '' : '[TEST] '}${headline} · ${price}`,
    'Paiement confirmé par Stripe.',
    todoLine,
    noBrief ? `\nATTENTION : ${briefAlert}` : null,
    client?.sent ? null : `\nATTENTION : l’e-mail de confirmation n’est pas parti chez le client (${client?.failed || 'raison inconnue'}). Écris-lui directement.`,
    '',
    `Client : ${order.email || 'non renseigné'}`,
    `Formule : ${offerName}${order.offerNote ? ` (${order.offerNote})` : ''}`,
    `${creation ? 'Livrer' : 'Répondre'} : ${creation ? 'par e-mail' : viaText}`,
    `Langue : ${langName}`,
    `Pseudo TikTok : ${order.tiktok || 'non renseigné'}${order.tiktokUrl ? ` (${order.tiktokUrl})` : ''}`,
    `${kindLabel} : ${T.fr.kinds[order.kind] || 'non précisé'}${order.kindBefore ? ` (sur le site, le client avait choisi « ${T.fr.kinds[order.kindBefore]} »)` : ''}`,
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

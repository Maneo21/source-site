// Outils de texte partagés par le site (navigateur) et le serveur (e-mails, Stripe).
// Aucune dépendance au DOM.

export const get = (obj, path) => String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

// Une valeur de config peut être une chaîne, ou { fr: '…', en: '…' } quand elle dépend de la langue.
export const pick = (v, code) => (v && typeof v === 'object' && !Array.isArray(v) ? (v[code] ?? Object.values(v)[0]) : v);

// "{n} jour|{n} jours" → la bonne forme selon les règles de pluriel de la langue.
export function plural(str, n, locale) {
  const [one, other] = String(str).split('|');
  if (other === undefined) return one.replaceAll('{n}', n);
  const form = new Intl.PluralRules(locale).select(n) === 'one' ? one : other;
  return form.replaceAll('{n}', n);
}

export function interpolate(str, vars, esc) {
  return String(str).replace(/\{([\w.]+)\}/g, (m, k) => {
    const v = get(vars, k);
    if (v == null) return m;
    return esc ? esc(String(v)) : String(v);
  });
}

export const formatAmount = (amount, currency, locale) => new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: amount % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(amount / 100);
export const formatPrice = (config, locale) => formatAmount(config.offer.amount, config.offer.currency, locale);

export const TIER_IDS = ['studio', 'pro', 'essentielle'], OFFER_IDS = ['guide', ...TIER_IDS];
export function buildVars(config, dict, lang) {
  // « offer » est l'échange personnalisé (Je te guide) ; « creation » la création sur mesure (Je crée pour toi).
  const o = config.offer, c = config.creation || {}, loc = lang.locale, u = dict.units || {};
  // Les quatre formules : « guide » (Je te guide) et trois créations. Pendant l'offre de lancement (config.launch, jusqu'à « until »),
  // une formule qui y figure garde son ancien prix et son ancien lien de paiement.
  const T = c.tiers || {}, L = config.launch || {}, until = Date.parse(L.until || ''), launchOn = Number.isFinite(until) && Date.now() <= until;
  const reg = { guide: o.amount, ...Object.fromEntries(TIER_IDS.map(id => [id, T[id]?.amount || 0])) };
  const eff = id => (launchOn && L[id]?.amount) || reg[id] || 0, money = a => formatAmount(a || 0, o.currency, loc);
  const tierVars = id => { const t = T[id] || {}, n = t.revisions ?? 1; return { deliveryHours: t.deliveryHours || 24, revisions: plural(u.revisions || '{n}', n, loc), revisionsIncluded: plural(u.revisionsIncluded || '{n}', n, loc), revisionCount: n, videoSeconds: t.videoSeconds || 15, videoCount: t.videos || 1, videos: plural(u.videos || '{n}', t.videos || 1, loc), priceTier: money(eff(id)), priceTierRegular: money(reg[id]) }; };
  const seller = {};
  for (const [k, v] of Object.entries(config.seller || {})) seller[k] = pick(v, lang.code);
  return {
    brand: config.brand,
    creator: config.creator?.name || '',
    contact: config.contactEmail,
    tiktok: String(config.creator?.tiktok || '').replace(/^@/, ''),
    price: money(eff('guide')),
    priceCreation: money(eff('essentielle')),
    prices: Object.fromEntries(OFFER_IDS.map(id => [id, money(eff(id))])),
    pricesRegular: Object.fromEntries(OFFER_IDS.map(id => [id, money(reg[id])])),
    launchOn, launchUntil: launchOn ? new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Paris' }).format(new Date(until)) : '',
    launchUntilShort: launchOn ? new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' }).format(new Date(until)) : '',
    tiers: Object.fromEntries(TIER_IDS.map(id => [id, tierVars(id)])),
    launch: { price: money(L.essentielle?.amount), until: Number.isFinite(until) ? new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Paris' }).format(new Date(until)) : '' },
    ...tierVars('essentielle'),
    revisionDays: c.revisionDays || 7,
    delay: plural(u.delay, o.replyHours, loc),
    replyHours: o.replyHours,
    prompts: o.prompts,
    followUps: plural(u.followUps, o.followUps, loc),
    followUpCount: o.followUps,
    followUpsIncluded: plural(u.followUpsIncluded, o.followUps, loc),
    followUpDays: o.followUpDays,
    year: new Date().getFullYear(),
    termsDate: new Intl.DateTimeFormat(loc, { dateStyle: 'long', timeZone: 'Europe/Paris' }).format(new Date(String(config.termsVersion).slice(0, 10) + 'T12:00:00Z')),
    seller,
    mediator: { name: config.mediator?.name || '', url: config.mediator?.url || '' },
  };
}

// Une valeur entre crochets est un élément « à compléter » avant publication.
export const isPlaceholder = v => /^\[.*\]$/s.test(String(v).trim());

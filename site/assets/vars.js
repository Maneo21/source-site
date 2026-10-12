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

export const formatAmount = (amount, currency, locale) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100);
export const formatPrice = (config, locale) => formatAmount(config.offer.amount, config.offer.currency, locale);

export function buildVars(config, dict, lang) {
  // « offer » est l'échange personnalisé (Je te guide) ; « creation » la création sur mesure (Je crée pour toi).
  const o = config.offer, c = config.creation || {}, loc = lang.locale, u = dict.units || {};
  const seller = {};
  for (const [k, v] of Object.entries(config.seller || {})) seller[k] = pick(v, lang.code);
  return {
    brand: config.brand,
    creator: config.creator?.name || '',
    contact: config.contactEmail,
    price: formatPrice(config, loc),
    priceCreation: formatAmount(c.amount || 0, o.currency, loc),
    deliveryHours: c.deliveryHours || 24,
    revisions: plural(u.revisions || '{n}', c.revisions ?? 1, loc),
    revisionsIncluded: plural(u.revisionsIncluded || '{n}', c.revisions ?? 1, loc),
    revisionDays: c.revisionDays || 7,
    videoSeconds: c.videoSeconds || 15,
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

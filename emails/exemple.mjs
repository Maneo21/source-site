// Fausse commande Stripe, pour l'aperçu local des e-mails et pour les tests. Aucune donnée réelle.
const FIELDS = {
  fr: { label: 'Français', value: 'franais', tiktok: '@camille.studio', project: 'Un portfolio pour mes photos de mariage, avec une ambiance cinéma. Je débute complètement.' },
  en: { label: 'English', value: 'english', tiktok: '@noah.builds', project: 'A 15-second TikTok ad for my coffee brand, with smooth transitions. I’m a complete beginner.' }
};

export function exempleEvenement({ lang = 'fr', email, tiktok, project, live = false, paid = true, type = 'checkout.session.completed', id, viaSite = true, kind = 'site', mode = 'payment', created = 1791659640 } = {}) {
  const f = FIELDS[lang] || FIELDS.fr, sid = id || `cs_${live ? 'live' : 'test'}_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6${lang}7k3f9Qz`;
  return {
    id: `evt_${sid.slice(-18)}`, object: 'event', api_version: '2025-09-30.clover', created, livemode: live, type,
    data: { object: {
      id: sid, object: 'checkout.session', mode, livemode: live, created: created - 95,
      payment_status: paid ? 'paid' : 'unpaid', status: 'complete', amount_total: 790, amount_subtotal: 790, currency: 'eur',
      payment_link: mode === 'payment' ? 'plink_1ExempleAiWebStudio' : null, payment_intent: mode === 'payment' ? `pi_3Exemple${sid.slice(-10)}` : null,
      client_reference_id: viaSite ? `site_${lang}_cgv-2026-10-11_retractation-ok${kind ? `_type-${kind}` : ''}` : null, locale: lang,
      customer_details: { email: email ?? (lang === 'en' ? 'noah@example.com' : 'camille@example.com'), name: null },
      custom_fields: [
        { key: 'pseudotiktok', label: { custom: 'Pseudo TikTok', type: 'custom' }, optional: true, type: 'text', text: { default_value: null, maximum_length: null, minimum_length: null, value: tiktok === undefined ? f.tiktok : tiktok } },
        { key: 'languesouhaite', label: { custom: 'Langue souhaitée', type: 'custom' }, optional: false, type: 'dropdown', dropdown: { default_value: null, options: [{ label: 'Français', value: 'franais' }, { label: 'English', value: 'english' }], value: f.value } },
        { key: 'queltypedesitesouhaitezvouscrer', label: { custom: 'Quel type de site souhaitez-vous créer ?', type: 'custom' }, optional: true, type: 'text', text: { default_value: null, maximum_length: null, minimum_length: null, value: project === undefined ? f.project : project } }
      ]
    } }
  };
}

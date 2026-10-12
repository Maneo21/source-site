// Page de remerciement (après le lien de paiement Stripe).
// Purement informative : le paiement n'est confirmé que par Stripe (reçu + tableau de bord).
import { I, langSwitch, swapLang } from './i18n.js';

// La suite affichée dépend de la formule : « ?offre=creation » dans l'adresse de retour réglée dans Stripe,
// ou, à défaut, la formule choisie sur le site dans les trois dernières heures.
const OFFER = (() => {
  const q = new URLSearchParams(location.search).get('offre');
  if (q === 'creation' || q === 'guide') return q;
  try {
    const s = JSON.parse(localStorage.getItem('offre') || 'null');
    if (s && s.o === 'creation' && Date.now() - s.t < 3 * 3600e3) return 'creation';
  } catch { /* navigation privée */ }
  return 'guide';
})();

function texts() {
  document.title = I.t('meta.merciTitle');
  for (const el of document.querySelectorAll('[data-m]')) el.textContent = I.t(`merci.${OFFER}.${el.dataset.m}`);
  // création : un bouton ouvre un e-mail déjà préparé pour envoyer logo, textes et images
  const send = document.querySelector('[data-send]');
  send.hidden = OFFER !== 'creation';
  if (OFFER === 'creation') send.href = `mailto:${I.config.contactEmail}?subject=${encodeURIComponent(I.t('merci.creation.mailSubject'))}&body=${encodeURIComponent(I.t('merci.creation.mailBody'))}`;
}

async function boot() {
  await I.init();
  await I.set(I.urlLang() || I.stored() || I.browser(), { persist: false });
  texts();
  langSwitch(document.querySelector('[data-langswitch]'), code => swapLang(code, texts));
}
boot();

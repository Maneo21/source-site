// Page de remerciement (après le lien de paiement Stripe).
// Purement informative : le paiement n'est confirmé que par Stripe (reçu + tableau de bord).
import { I, langSwitch, swapLang } from './i18n.js';

const texts = () => { document.title = I.t('meta.merciTitle'); };

async function boot() {
  await I.init();
  await I.set(I.urlLang() || I.stored() || I.browser(), { persist: false });
  texts();
  langSwitch(document.querySelector('[data-langswitch]'), code => swapLang(code, texts));
}
boot();

// Cloudflare Pages Function, appelée par Stripe : https://<adresse du site>/api/stripe-webhook
// Toute la logique est dans emails/webhook.mjs.
import { handle } from '../../emails/webhook.mjs';

export async function onRequest({ request, env }) {
  try {
    return await handle(request, env);
  } catch (e) {
    // Une erreur inattendue renvoie un code 500 : Stripe réessaiera plus tard.
    console.error(e);
    return new Response(JSON.stringify({ ok: false, erreur: 'Erreur interne.' }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  }
}

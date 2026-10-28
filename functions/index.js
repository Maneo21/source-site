// Cloudflare Pages Function de l'adresse « / » (ia-motionstudio.fr).
// Le navigateur intégré de TikTok (lien en bio) reçoit la page des pubs (pub.html, fabriquée depuis index.html par
// outils/pub-depuis-accueil.mjs) : le même site, sans l'écran « Ouvrez dans votre navigateur », avec les vidéos lues au toucher.
// L'adresse reste ia-motionstudio.fr. Safari, Chrome et les autres navigateurs reçoivent l'accueil, inchangé.

// même repère que index.html et assets/pub.js (« ?tiktok=1 » permet de l'essayer depuis un autre navigateur)
const TIKTOK = /BytedanceWebview|musical_ly|trill_|TikTok/i;

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  let res = null;
  if (TIKTOK.test(request.headers.get('user-agent') || '') || /[?&]tiktok=1(&|$)/.test(url.search)) {
    url.pathname = '/pub';
    url.search = '';
    const pub = await env.ASSETS.fetch(new Request(url, request));
    if (pub.ok || pub.status === 304) res = pub;   // sinon (page des pubs introuvable), l'accueil normal
  }
  res = res ?? await next();
  // la même adresse sert deux pages selon le navigateur : aucun cache ne doit les mélanger
  res = new Response(res.body, res);
  res.headers.append('Vary', 'User-Agent');
  return res;
}

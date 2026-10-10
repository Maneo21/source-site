// Pastille « aperçu local » ajoutée par le serveur d'aperçu (jamais publiée).
(() => {
  const a = document.createElement('a');
  a.href = '/apercu';
  a.textContent = 'Aperçu local';
  a.setAttribute('aria-label', 'Outils de l’aperçu local');
  a.style.cssText = 'position:fixed;z-index:99;bottom:calc(env(safe-area-inset-bottom) + 92px);left:12px;padding:5px 9px;border-radius:999px;border:1px dashed rgba(210,255,77,.55);background:rgba(9,9,10,.8);color:#D2FF4D;font:500 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)';
  document.body.append(a);
})();

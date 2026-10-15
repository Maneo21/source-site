# AI Web Studio · page de vente (« Je te guide » 7,90 € · « Je crée pour toi » 19,90 €)

Mini-site **indépendant de MANEO**. Les pages sont statiques : pas de base de données.
Il présente trois univers, chacun avec sa vidéo : sites web, vidéos publicitaires IA, motion design premium.
Il vend deux formules : **« Je te guide »** (échange personnalisé, 7,90 €) et **« Je crée pour toi »** (création sur mesure livrée en 24 h, 19,90 €).
Le paiement passe par un **lien de paiement Stripe** par formule. Après chaque paiement confirmé, deux e-mails partent automatiquement (un au client, un à toi).
Aucune clé secrète n’est dans ce dossier : elles sont rangées dans Cloudflare.

- **Aperçu sur le Mac** : double-clique sur « Aperçu page TikTok » (Bureau) ou sur `OUVRIR-APERCU.command`. Laisse la fenêtre Terminal ouverte pendant la visite.
- **Aperçu sur le téléphone** : même Wi-Fi, puis scanne le QR code affiché dans le Terminal ou sur `http://localhost:4820/apercu`.
- **Mise en ligne** : `PUBLIER.md` (GitHub, Cloudflare Pages, Stripe, domaine).
- **E-mails automatiques** : `EMAILS.md` (fonctionnement, réglages Stripe / Postmark / Cloudflare, tests).
- **Gérer une commande** : `COMMANDES.md`.

## Où modifier quoi

| Quoi | Fichier |
|---|---|
| Liens de paiement Stripe, prix, délais, contenu des deux formules, vendeur, contact | `site/config.json` (voir « Les deux formules ») |
| Textes du site (FR / EN) | `site/i18n/fr.json`, `site/i18n/en.json` |
| Mentions légales, CGV, confidentialité | `site/i18n/legal.fr.json`, `site/i18n/legal.en.json` |
| Titres et étiquettes des trois univers | `site/i18n/fr.json` et `en.json`, bloc `uni` |
| Vidéos des trois univers, image de partage | `site/assets/media/` (voir ci-dessous) |
| Ton compte TikTok, ta photo, tes chiffres réels | `site/config.json` (voir « Preuves et confiance ») |
| Textes et mise en page des e-mails automatiques | `emails/modeles.mjs` |
| Règles d’envoi (signature Stripe, anti-doublons, pannes) | `emails/webhook.mjs` |

Le nom du site, l’adresse de contact, le délai de réponse et l’identité du vendeur affichés dans les e-mails viennent de `site/config.json`.

## Les deux formules

Tout se règle dans `site/config.json`.

| Formule | Bloc | Ce qu’on y règle |
|---|---|---|
| « Je te guide » (échange) | `paymentLink` et `offer` | lien Stripe, prix en centimes (`amount`), nombre de prompts, relance |
| « Je crée pour toi » (création) | `creation` | lien Stripe (`paymentLink`), prix en centimes (`amount`), délai de livraison en heures (`deliveryHours`), nombre de retouches (`revisions`) et leur délai (`revisionDays`), durée maximale d’une vidéo en secondes (`videoSeconds`) |

- **Tant que `creation.paymentLink` est vide**, le site public annonce la création « Bientôt disponible » et personne ne peut la commander. Dans l’aperçu sur le Mac, elle reste active pour que tu voies tout le parcours. Pour voir l’aperçu comme un visiteur : ajoute `?public=1` à l’adresse.
- Créer le lien Stripe de la création : `PUBLIER.md`, section « Formule Je crée pour toi ».
- Si tu changes un prix, change-le **aux deux endroits** : dans Stripe et dans `config.json` (`1990` = 19,90 €).
- Si tu changes ce que comprend une formule (durée, retouches, délai), relis aussi l’article 2 des CGV (`site/i18n/legal.fr.json` et `legal.en.json`) : les chiffres suivent `config.json`, pas les phrases.

## Preuves et confiance

Quatre réglages de `site/config.json` sont vides par défaut. Tant qu’ils le restent, rien ne s’affiche : le site ne montre jamais de chiffre ou d’avis inventé.

| Réglage | Effet |
|---|---|
| `"tiktok": "tonpseudo"` (dans `creator`) | affiche le lien « Me suivre sur TikTok » sous ta signature |
| `"photo": "/assets/media/evan.webp"` (dans `creator`) | remplace l’initiale par ta photo |
| `"proof": [{ "value": "120 k", "label": { "fr": "vues sur TikTok", "en": "views on TikTok" } }]` | affiche tes vrais chiffres sous ta signature |
| `"reviews": [{ "name": "Prénom N.", "project": { "fr": "Pub TikTok", "en": "TikTok ad" }, "text": { "fr": "…", "en": "…" }, "consent": true }]` | affiche la section « Avis clients ». Uniquement de vrais avis, recopiés mot pour mot, avec l’accord écrit du client (`"consent": true`) ; sans ce mot, l’avis ne s’affiche pas |

## Arrivée depuis TikTok

Quand le site est ouvert dans le navigateur intégré de TikTok, un écran propose de l’ouvrir dans le vrai navigateur, avec un bouton « Rester ici ».
Cet écran revient **à chaque clic sur le lien de ta bio**. Après « Rester ici », il ne revient pas tant que le visiteur reste sur le site (changement de page, rechargement, retour arrière).

- Voir cet écran sans passer par TikTok : ajoute `?tiktok=1` à l’adresse.
- Comprendre un comportement étrange dans un navigateur intégré : ajoute `?diag=1`. Un petit journal s’affiche en bas de l’écran ; une capture suffit pour le diagnostic.

## Remplacer une vidéo

Chaque univers a trois fichiers dans `site/assets/media/`, nommés avec sa clé (`sites`, `pub` ou `motion`) :

| Fichier | Rôle |
|---|---|
| `<clé>-teaser.mp4` | extrait muet de 8 à 9 secondes, joué automatiquement (720 × 1280, environ 1 à 2 Mo) |
| `<clé>.mp4` | vidéo complète avec le son, ouverte au clic (720 × 1280) |
| `<clé>-poster.webp` | image affichée avant la lecture |

Les vidéos sont au format vertical 9:16. Pour en changer une, envoie-moi le nouveau fichier : je prépare les trois versions.
La durée affichée sur les boutons se règle en haut de `site/assets/app.js` (liste `U`).

## Ajouter une langue

1. Copier `en.json` et `legal.en.json` en version `xx`, puis traduire.
2. Ajouter une ligne dans `site/i18n/languages.json`.
3. Ajouter un drapeau dans `site/assets/flags/`.

L’écran d’accueil, le sélecteur de langue et la page de remerciement suivent automatiquement.
Pour les e-mails, ajouter la langue dans `emails/modeles.mjs` (bloc `T`). Sans cela, le client reçoit la version française.

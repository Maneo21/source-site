# AI Web Studio · page de vente de l’accompagnement personnalisé (7,90 €)

Mini-site **indépendant de MANEO**. Les pages sont statiques : pas de base de données.
Le paiement passe par un **lien de paiement Stripe**. Après chaque paiement confirmé, deux e-mails partent automatiquement (un au client, un à toi).
Aucune clé secrète n’est dans ce dossier : elles sont rangées dans Cloudflare.

- **Aperçu sur le Mac** : double-clique sur « Aperçu page TikTok » (Bureau) ou sur `OUVRIR-APERCU.command`. Laisse la fenêtre Terminal ouverte pendant la visite.
- **Aperçu sur le téléphone** : même Wi-Fi, puis scanne le QR code affiché dans le Terminal ou sur `http://localhost:4820/apercu`.
- **Mise en ligne** : `PUBLIER.md` (GitHub, Cloudflare Pages, Stripe, domaine).
- **E-mails automatiques** : `EMAILS.md` (fonctionnement, réglages Stripe / Postmark / Cloudflare, tests).
- **Gérer une commande** : `COMMANDES.md`.

## Où modifier quoi

| Quoi | Fichier |
|---|---|
| Lien de paiement Stripe, prix, délai, contenu de l’offre, vendeur, contact | `site/config.json` |
| Textes du site (FR / EN) | `site/i18n/fr.json`, `site/i18n/en.json` |
| Mentions légales, CGV, confidentialité | `site/i18n/legal.fr.json`, `site/i18n/legal.en.json` |
| Vidéo, affiches, image de partage | `site/assets/media/` |
| Textes et mise en page des e-mails automatiques | `emails/modeles.mjs` |
| Règles d’envoi (signature Stripe, anti-doublons, pannes) | `emails/webhook.mjs` |

Le nom du site, l’adresse de contact, le délai de réponse et l’identité du vendeur affichés dans les e-mails viennent de `site/config.json`.

## Ajouter une langue

1. Copier `en.json` et `legal.en.json` en version `xx`, puis traduire.
2. Ajouter une ligne dans `site/i18n/languages.json`.
3. Ajouter un drapeau dans `site/assets/flags/`.

L’écran d’accueil, le sélecteur de langue et la page de remerciement suivent automatiquement.
Pour les e-mails, ajouter la langue dans `emails/modeles.mjs` (bloc `T`). Sans cela, le client reçoit la version française.

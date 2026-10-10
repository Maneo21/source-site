# Mettre le site en ligne : étapes et clics

Les pages du site sont **statiques** : pas de base de données, et aucune clé secrète dans ce dossier.
Le paiement passe par un **lien de paiement Stripe** : son adresse se colle dans `site/config.json` (ligne `"paymentLink"`).
Les **e-mails automatiques** envoyés après chaque paiement se règlent à part : voir `EMAILS.md`.
Rien ne touche à MANEO : nouveau dépôt GitHub, nouveau projet Cloudflare, et un lien Stripe à part.

---

## Étape 1 · GitHub : un nouveau dépôt (5 min)

1. Va sur **github.com** → bouton **New** (ou « + » en haut à droite → **New repository**).
2. Nom : `source-site`. Coche **Private**. Ne coche rien d’autre. Clique sur **Create repository**.
3. Sur la page du dépôt vide, clique sur le lien **uploading an existing file**.
4. Dans le Finder, ouvre `Documents/echange-ia`, sélectionne **tout son contenu** et glisse-le dans la page GitHub :
   - les dossiers `site`, `emails`, `functions`, `apercu`, `outils` ;
   - les fichiers `.md`, `.mjs` et `.command`.
5. Attends la fin de l’envoi, puis clique sur **Commit changes**.

## Étape 2 · Cloudflare Pages : l’adresse pages.dev (5 min)

> À la fin de cette étape, le site est visible à l’adresse `….pages.dev`, qui n’est annoncée nulle part. Le bouton « Réserver » affiche « paiement pas encore ouvert » tant que le lien Stripe n’est pas branché.

1. Va sur **dash.cloudflare.com** et crée un compte gratuit.
2. Menu de gauche : **Workers & Pages** → **Create application** → onglet **Pages** → **Connect to Git**.
3. **GitHub** → **Install & Authorize** → choisis **Only select repositories** → `source-site` → **Install & Authorize**.
4. Sélectionne `source-site` → **Begin setup**.
5. Réglages :
   - **Project name** : `source-site` (l’adresse sera `https://source-site.pages.dev`) ;
   - **Production branch** : `main` ;
   - **Framework preset** : `None` ;
   - **Build command** : `exit 0` ;
   - **Build output directory** : `site`.
6. **Save and Deploy**. Après environ une minute, note l’adresse affichée (par exemple `https://source-site.pages.dev`).

## Étape 3 · Stripe : un compte à part et un lien de paiement de TEST (10 min)

**Recommandé : un compte Stripe séparé de MANEO.** En haut à gauche du tableau de bord, clique sur le nom du compte → **Nouveau compte**, et nomme-le `source`.
- Les réglages ci-dessous (nom public, reçus, conditions) ne changent alors rien pour MANEO.
- Le vendeur reste toi, Evan Cotte EI : mêmes informations d’entreprise et même IBAN.

Active le **mode test** (interrupteur « Environnement de test » ou « Mode test »), puis :

1. **Paramètres → Informations publiques** :
   - nom public `source` ;
   - e-mail d’assistance `contact@maneo-ai.fr` ;
   - **Conditions d’utilisation** : `https://source-site.pages.dev/legal#cgv` ;
   - **Politique de confidentialité** : `https://source-site.pages.dev/legal#confidentialite`.
2. **Paramètres → E-mails clients** : active **Paiements réussis** (le client reçoit un reçu).
3. **Paramètres → Informations personnelles → Notifications** : coche **Paiements réussis** pour recevoir un e-mail à chaque vente.
   Ces e-mails partent vers l’adresse de ton compte Stripe. Si ce n’est pas contact@maneo-ai.fr, ajoute cette adresse dans **Paramètres → Équipe**.
4. **Payment Links → + Nouveau**, type **Produits ou abonnements** → **Ajouter un nouveau produit** :
   - **Nom** : `Accompagnement personnalisé · Créer un site avec l’IA`
   - **Description** : `Réponse écrite personnalisée par e-mail en moins de 24 h · Personal coaching, reply by email within 24 hours`
   - **Prix** : `7,90` EUR, **Paiement unique** (pas « récurrent »)
5. Dans **Options** :
   - **Ajouter des champs personnalisés** (3 champs) :
     1. **Liste déroulante**, libellé `Langue de réponse · Reply language`, options `Français` et `English`. Champ obligatoire.
     2. **Texte**, libellé `Ton projet en une phrase · Your project`. Champ obligatoire.
     3. **Texte**, libellé `Pseudo TikTok · TikTok handle`. Champ facultatif.
   - Coche **Exiger que les clients acceptent vos conditions d’utilisation**.
   - Ne coche **pas** : quantité modifiable, codes promo, adresses, téléphone, collecte automatique des taxes.
6. Onglet **Après le paiement** → **Rediriger les clients vers votre site web** :
   `https://source-site.pages.dev/merci?session_id={CHECKOUT_SESSION_ID}`
7. **Créer le lien**, puis copie l’adresse (`https://buy.stripe.com/test_…`) et **envoie-la-moi**.

## Étape 4 · Brancher le lien sur le site (2 min)

1. Sur GitHub, dans `source-site`, ouvre `site` → `config.json` → icône **crayon** (Edit).
2. Remplace la ligne
   `"paymentLink": "",`
   par
   `"paymentLink": "https://buy.stripe.com/test_…",`
   (avec ton adresse entre les guillemets, et la virgule à la fin).
3. **Commit changes**. Cloudflare remet le site à jour tout seul en environ une minute.

## Étape 5 · Tester (sans argent réel)

Sur ton téléphone, ouvre `https://source-site.pages.dev` :
- **Réserver** → coche la case → paiement ;
- carte `4242 4242 4242 4242`, n’importe quelle date future, n’importe quel code ;
- remplis les 3 champs.

Vérifie trois choses :
- la page de remerciement ;
- le reçu de test ;
- dans Stripe (mode test) → **Paiements**, le paiement avec les champs Langue, Projet et TikTok.

Fais-le une fois en français et une fois en anglais. Je peux aussi le tester de mon côté dès que le lien est branché.

## Étape 6 · Ouvrir les vraies ventes (après ta validation)

1. Stripe → **Activer les paiements** sur le compte `source` : identité, entreprise (EI, SIREN 108 814 591) et **IBAN**.
2. Désactive le mode test, puis refais les réglages 1 à 3 et le lien de l’étape 3, à l’identique, en mode réel.
3. Remplace l’adresse du lien dans `config.json` (étape 4) par le lien réel (`https://buy.stripe.com/…`, sans `test_`).
4. Fais un premier vrai achat de 7,90 €. Tu peux te le rembourser ensuite depuis Stripe : **Paiements** → **⋯** → **Rembourser**.

## Étape 7 · Domaine personnalisé (quand tu veux)

1. Cloudflare → **Workers & Pages** → `source-site` → **Custom domains** → **Set up a custom domain**.
2. Tape le domaine, puis suis les instructions :
   - si le domaine est chez Cloudflare, la configuration est automatique ;
   - sinon, ajoute l’enregistrement **CNAME** indiqué chez ton registraire.
3. Dans Stripe, remplace `source-site.pages.dev` par le nouveau domaine dans les endroits suivants :
   - l’adresse de redirection du lien ;
   - les conditions d’utilisation ;
   - la politique de confidentialité.

---

**Médiateur de la consommation** : une fois ton adhésion réglée, ouvre `site/config.json` et remplis les deux lignes :
`"mediator": { "name": "Nom du médiateur", "url": "https://site-du-mediateur.fr" }`
Puis publie avec GitHub Desktop. Le paragraphe des CGV se complète tout seul, en français et en anglais.

**Modifier le site plus tard** : sur GitHub, ouvre le fichier, clique sur le crayon puis sur **Commit changes**. Cloudflare publie la nouvelle version tout seul.
Les textes sont dans `site/i18n/`, les réglages (prix, délais, lien, vendeur) dans `site/config.json`.

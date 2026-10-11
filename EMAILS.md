# E-mails automatiques après chaque commande

Dès que **Stripe confirme un paiement**, deux e-mails partent tout seuls :

1. **Au client** : sa confirmation de commande, en français ou en anglais selon le champ « Langue souhaitée ».
2. **À toi** (contact@maneo-ai.fr) : la fiche de la commande. Elle contient l’e-mail du client, sa langue, son pseudo TikTok, le type de projet choisi sur le site (site web, vidéo publicitaire, motion design ou autre), sa description, la date, la référence et l’heure limite de réponse. Le bouton « Répondre » de ta messagerie écrit directement au client.

Expéditeur des deux e-mails : `AI Web Studio <contact@maneo-ai.fr>`.

Pour voir les e-mails sans rien envoyer : ouvre l’aperçu (`OUVRIR-APERCU.command`), puis **Outils d’aperçu → Voir les e-mails**.

## Comment ça marche

```
Paiement réussi → Stripe prévient le site (webhook signé) → le site vérifie la signature → Postmark envoie les 2 e-mails
```

- Une visite de la page de remerciement ne déclenche rien. Seul un message **signé par Stripe** et un paiement au statut **payé** déclenchent l’envoi.
- **Pas de doublon** : chaque commande est notée comme « envoyée ». Si Stripe renvoie le même message, rien ne repart.
- **En cas de panne d’envoi** : le site répond « erreur » à Stripe, qui réessaie tout seul pendant 3 jours. Seul l’e-mail manquant repart.
- **Si l’adresse du client est refusée** : tu reçois quand même ta fiche, avec un avertissement en haut.
- Aucune clé n’est écrite dans le code. Elles sont rangées dans les variables secrètes de Cloudflare.
- MANEO n’est pas touché : même compte Postmark, mais un « serveur » Postmark à part.

Fichiers concernés : `emails/` (modèles et logique) et `functions/api/stripe-webhook.js` (l’adresse appelée par Stripe).

---

## Mise en service (environ 15 minutes)

Fais les étapes **dans cet ordre**. La publication vient en dernier.

### 1 · Postmark : un jeton pour AI Web Studio

1. Va sur **account.postmarkapp.com** → **Servers** → **Create Server**.
2. Nom : `AI Web Studio`. Type : **Live**. Valide.
3. Ouvre ce serveur → onglet **API Tokens** → copie le **Server API token**.

> Le domaine `maneo-ai.fr` est déjà validé dans ton compte : `contact@maneo-ai.fr` peut envoyer sans autre réglage.
> Si Postmark refuse de créer un nouveau serveur, prends le jeton du serveur existant : l’envoi fonctionne pareil, seules les statistiques seront mélangées avec celles de MANEO.

### 2 · Cloudflare : la mémoire anti-doublons

1. **dash.cloudflare.com** → menu **Storage & Databases** → **Workers KV** → **Create instance**.
2. Nom : `ai-web-studio-commandes` → **Create**.
3. **Workers & Pages** → projet `source-site` → **Settings** → **Bindings** → **Add** → **KV namespace**.
4. **Variable name** : `COMMANDES` (en majuscules, exactement). **KV namespace** : `ai-web-studio-commandes`. Enregistre.

### 3 · Stripe : prévenir le site à chaque paiement

1. Dans Stripe, ouvre **dashboard.stripe.com/webhooks** → **Créer une destination d’événements**.
2. Choisis **Votre compte**.
3. Format : **Instantané** (pas « léger »). Laisse la version d’API proposée.
4. Coche ces deux événements :
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
5. **Continuer** → **Endpoint de webhook** → **Continuer**.
6. **URL de l’endpoint** : `https://source-site.pages.dev/api/stripe-webhook`
7. Valide, puis clique sur **Révéler la clé secrète** et copie la valeur qui commence par `whsec_`.

> Cette destination s’ajoute à côté de celles qui existent déjà : rien n’est modifié pour MANEO.
> Les ventes d’autres produits du même compte Stripe sont ignorées par le site.

### 4 · Cloudflare : les deux clés secrètes

**Workers & Pages** → `source-site` → **Settings** → **Variables and Secrets** → **Add**.
Vérifie que l’environnement choisi est **Production**. Pour chaque ligne, coche **Encrypt** avant **Save**.

| Nom (exactement) | Valeur |
|---|---|
| `POSTMARK_TOKEN` | le jeton copié à l’étape 1 |
| `STRIPE_WEBHOOK_SECRET` | la clé `whsec_…` copiée à l’étape 3 |

### 5 · Publier

Publie avec GitHub Desktop, comme d’habitude. Cloudflare met le site à jour en une minute environ.

Si tu ajoutes ou changes une variable **après** la publication : **Deployments** → dernière ligne → **⋯** → **Retry deployment**. Une variable n’est prise en compte qu’au déploiement suivant.

### 6 · Vérifier que tout est branché

Ouvre dans ton navigateur : `https://source-site.pages.dev/api/stripe-webhook`

Tu dois lire `"pret": true` et trois lignes `"ok"`. Une ligne `"manquant"` indique le réglage à corriger. Cette page n’affiche jamais les clés.

---

## Tester

### Essai sans argent (mode test de Stripe)

1. Dans Stripe, active l’**environnement de test**.
2. Refais l’étape 3 dans cet environnement. La clé `whsec_…` obtenue est différente.
3. Dans Cloudflare, ajoute-la sous le nom `STRIPE_WEBHOOK_SECRET_TEST` (étape 4), puis **Retry deployment**.
4. Toujours en environnement de test, crée un lien de paiement avec les mêmes champs que le vrai. Ouvre-le.
5. Paie avec la carte `4242 4242 4242 4242`, une date future, un code quelconque, et **ton** adresse e-mail.

Tu reçois les deux e-mails, marqués **[TEST]** dans l’objet.

### Essai réel

Fais un achat de 7,90 € sur le site avec ton adresse personnelle. Tu dois recevoir la confirmation client sur cette adresse et la fiche sur contact@maneo-ai.fr. Rembourse-toi ensuite : Stripe → **Paiements** → **⋯** → **Rembourser**.

### Si un e-mail n’arrive pas

Stripe → **Webhooks** → ta destination → **Livraisons d’événements**. Clique sur l’événement : la réponse du site explique la cause en français (jeton refusé, quota épuisé, etc.). Après correction, clique sur **Renvoyer**.

---

## À savoir

- **Quota Postmark gratuit : 100 e-mails par mois, partagés avec MANEO.** Chaque commande en consomme 2, soit environ 50 commandes par mois si MANEO n’envoie rien. Une fois le quota atteint, Postmark bloque tous les envois du compte, y compris ceux de MANEO, jusqu’au mois suivant ou jusqu’au passage à une offre payante.
- Garde les e-mails de Stripe activés (reçu au client, « Paiements réussis » pour toi). Ils servent de filet de sécurité si Postmark est bloqué.
- **Changement d’adresse du site** (domaine personnalisé) : dans Stripe, remplace l’URL de la destination par `https://ton-domaine/api/stripe-webhook`. La clé `whsec_` ne change pas.
- **Réglages facultatifs** (Cloudflare, mêmes écrans) :
  - `STRIPE_PAYMENT_LINK` : l’identifiant `plink_…` de ton lien, si tu vends un jour autre chose par lien de paiement sur le même compte Stripe ;
  - `ADMIN_EMAIL` : une autre adresse pour recevoir les fiches ;
  - `MAIL_FROM` : un autre expéditeur.
- **Vérifier le code après une modification** : `node outils/test-emails.mjs` (rien n’est envoyé).

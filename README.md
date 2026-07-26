# Tchatelia

Version minimale gratuite d'un chat en ligne type EuropNet.

Prerequis : Node.js 24 ou plus recent.

## Ce que fait cette premiere version

- Pseudo libre, sans inscription.
- Comptes utilisateurs avec pseudo reserve et mot de passe.
- Parametres du compte : nom affiche, notifications, messages prives et blocages.
- Changement du mot de passe et suppression autonome du compte.
- Connexion invitee toujours disponible pour les pseudos non reserves.
- Gestion admin des comptes : role, activation et reinitialisation de mot de passe.
- Salons publics : `#accueil`, `#aide`, `#musique`, `#rencontres`.
- Interface responsive avec panneaux de salons et de membres adaptes au mobile.
- Themes sombre et clair, memorises localement pour les comptes et les invites.
- Centre de moderation dans une fenetre dediee.
- Messages instantanes avec Socket.IO.
- Reponses avec citation, modification par l'auteur et suppression par l'auteur ou la moderation.
- Indicateur de saisie en temps reel et reactions persistantes aux messages pour les comptes.
- Statuts de presence en temps reel : en ligne, absent ou occupe.
- Recherche par mot, phrase ou pseudo dans les messages charges du salon actuel.
- Favoris personnels persistants et annonces epinglees par les moderateurs dans chaque salon.
- Mentions avec `@pseudo`, mise en evidence et alerte cliquable.
- Compteurs de messages non lus pour chaque salon et dans l'onglet du navigateur.
- Alertes visuelles, sonores et notifications navigateur activables.
- Liste des personnes connectees dans le salon.
- Connexion admin avec mot de passe.
- Role moderateur : kick, ban et unban sans acces a la gestion complete.
- Couleurs de pseudo distinctes et persistantes pour les administrateurs et moderateurs.
- Journal de moderation persistant : exclusions, bannissements, comptes et salons.
- Profils utilisateurs : photo importee ou avatar par lien, description, role et date d'inscription.
- Blocage global des comptes : messages publics, alertes, saisie et messages prives.
- Messages prives persistants entre comptes et compteur de non-lus.
- Signalement des profils et messages publics/prives avec file de moderation.
- Reglement, conditions d'utilisation et politique de confidentialite.
- Page de contact avec messages consultables dans le panneau admin.
- Validation de l'age minimum et des regles avant l'entree dans le chat.
- Commandes de moderation : `/kick pseudo`, `/ban pseudo`, `/unban pseudo`, `/unmute pseudo`.
- Panneau admin : kick, ban, unban, creation et suppression de salons.
- Historique et bannissements sauvegardes en SQLite local ou PostgreSQL/Supabase.
- Moderation automatique : avertissement, mutes temporaires progressifs et termes configurables.
- Alertes de moderation par e-mail lorsqu'aucun admin ou moderateur n'est connecte.
- Protection publique : limites de connexion et d'inscription, verrouillage apres plusieurs echecs
  et journal de securite reserve aux administrateurs.
- En-tetes de securite du navigateur, controle des origines et taille limitee des requetes.
- Nouveaux mots de passe de 8 a 128 caracteres avec refus des choix trop previsibles.
- Verification anti-robot Cloudflare Turnstile activable gratuitement.
- Recuperation du mot de passe par e-mail avec un lien unique valable 30 minutes.
- Verification des nouvelles adresses e-mail avec un lien unique valable 24 heures.
- Connexion automatique securisee pendant 30 jours avec deconnexion par appareil ou globale.
- Commandes simples : `/me texte`, `/clear` et `/help`.

## Architecture simple

- `server.js` : serveur Node.js avec Express et Socket.IO.
- `db.js` : choisit SQLite en local ou PostgreSQL si `DATABASE_URL` existe.
- `db-sqlite.js` : base locale de developpement.
- `db-postgres.js` : base PostgreSQL pour Supabase/Render.
- `config.js` : lecture simple du fichier `.env`.
- `public/index.html` : page du chat.
- `public/app.js` : logique cote navigateur.
- `public/styles.css` : interface visuelle.
- `public/reglement.html` : reglement communautaire.
- `public/conditions.html` : conditions d'utilisation.
- `public/confidentialite.html` : politique de confidentialite.
- `public/contact.html` : formulaire de contact.

Cette architecture reste volontairement simple, mais les donnees importantes
survivent maintenant aux redemarrages.

Les sessions de compte utilisent un cookie `HttpOnly`, `SameSite=Lax` et `Secure` sur le site
HTTPS. Le navigateur ne conserve ni le mot de passe ni le jeton de session dans son stockage
JavaScript. Les jetons sont enregistres sous forme d'empreinte dans la base et expirent apres
30 jours.

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrir :

```text
http://localhost:3000
```

## Admin

Mot de passe admin local par defaut :

```text
tchatelia-admin
```

Pour changer ce mot de passe, copier `.env.example` en `.env`, puis remplacer :

```text
ADMIN_PASSWORD=change-moi
ADMIN_ALLOWED_IPS=203.0.113.8
```

Un compte cree en mode `Inscription` avec le bon mot de passe admin devient un
compte admin sauvegarde. Ensuite, il suffit de se connecter en mode `Connexion`
avec le pseudo et le mot de passe du compte.

`ADMIN_ALLOWED_IPS` limite l'affichage du champ admin, la connexion aux comptes
administrateurs et la commande `/admin` a l'adresse IP indiquee. Plusieurs
adresses peuvent etre separees par des virgules. Laisser la variable vide
desactive cette restriction. Cette valeur doit etre ajoutee dans Render et ne
doit pas etre publiee sur GitHub. Si l'adresse IP de la connexion Internet
change, il faut mettre a jour cette variable avant de pouvoir se reconnecter en
administrateur.

Pour utiliser Supabase ou PostgreSQL, ajouter aussi :

```text
DATABASE_URL=postgresql://...
DATABASE_SSL=true
```

Sans `DATABASE_URL`, Tchatelia utilise automatiquement SQLite local.

## Protection publique

La protection publique est active par defaut. Elle limite les tentatives de connexion, la creation
de comptes et le nombre de connexions simultanees depuis une meme source. Apres cinq echecs
d'authentification, l'acces est verrouille pendant 15 minutes. Les nouveaux mots de passe doivent
contenir entre 8 et 128 caracteres et ne peuvent pas reprendre le pseudo, l'adresse e-mail ou un
mot de passe trop previsible. Les comptes existants continuent de fonctionner avec leur mot de
passe actuel jusqu'a son prochain changement.

Le serveur ajoute aussi une politique de securite du contenu, interdit l'affichage du site dans une
page externe, limite les fonctions sensibles du navigateur et refuse les requetes provenant d'un
autre site. `PUBLIC_URL` doit donc contenir l'adresse publique exacte de Tchatelia.

Utiliser une valeur longue et privee pour anonymiser les sources dans le journal de securite :

```text
PUBLIC_PROTECTION=true
SECURITY_HASH_SECRET=une-longue-valeur-secrete-et-unique
```

Le CAPTCHA Cloudflare Turnstile est facultatif. Lorsqu'une cle de site et une cle secrete sont
presentes, il apparait automatiquement sur l'ecran de connexion :

```text
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

Ne jamais publier `SECURITY_HASH_SECRET` ou `TURNSTILE_SECRET_KEY` sur GitHub.

## E-mails de compte

La verification des adresses et la recuperation du mot de passe utilisent l'envoi transactionnel
Brevo. Creer une cle API Brevo et verifier l'adresse d'expedition, puis ajouter ces variables dans
Render :

```text
PUBLIC_URL=https://tchatelia.onrender.com
BREVO_API_KEY=xkeysib-...
MAIL_FROM_EMAIL=adresse-verifiee@example.com
MAIL_FROM_NAME=Tchatelia
MODERATION_ALERT_EMAIL=adresse-admin@example.com
```

`BREVO_API_KEY` doit rester secrete et ne doit jamais etre ajoutee dans GitHub. Une adresse e-mail
est obligatoire pour les nouvelles inscriptions. Le compte devient utilisable apres le clic sur le
lien de verification valable 24 heures. Les comptes deja crees avant cette fonctionnalite restent
valides. Un changement d'adresse depuis `Parametres` demande une nouvelle verification.

## Moderation automatique

La moderation automatique est activee par defaut. Le premier abus de spam declenche un
avertissement. Une recidive dans les 30 minutes applique un mute de 2 minutes, puis les durees
progressent jusqu'a une heure. Les mutes sont conserves dans la base de donnees et peuvent etre
retires avec le bouton `Demuter` ou la commande `/unmute pseudo`.

Les termes interdits sont facultatifs et se configurent dans Render, separes par des virgules :

```text
AUTO_MODERATION=true
AUTO_MODERATION_TERMS=terme1,expression interdite
MODERATION_ALERT_EMAIL=adresse-admin@example.com
```

Lorsqu'aucun membre de la moderation n'est connecte, un mute automatique ou un nouveau
signalement envoie une alerte Brevo. Sans `MODERATION_ALERT_EMAIL`, l'alerte est envoyee a
`MAIL_FROM_EMAIL`.

Il est aussi possible de le changer au lancement :

```bash
ADMIN_PASSWORD=un-mot-de-passe-solide npm start
```

Sur Windows PowerShell :

```powershell
$env:ADMIN_PASSWORD="un-mot-de-passe-solide"; npm start
```

## Mise en ligne gratuite conseillee

Pour une premiere mise en ligne gratuite :

1. Creer un compte GitHub.
2. Mettre ce dossier dans un depot GitHub.
3. Creer un projet gratuit Supabase et copier l'URL PostgreSQL.
4. Creer un service gratuit sur Render.
5. Choisir ce depot GitHub.
6. Utiliser `npm install` comme commande d'installation.
7. Utiliser `npm start` comme commande de demarrage.
8. Ajouter dans Render les variables `ADMIN_PASSWORD`, `ADMIN_ALLOWED_IPS`, `DATABASE_URL`,
   `DATABASE_SSL=true`, `PUBLIC_PROTECTION=true`, `SECURITY_HASH_SECRET`, `PUBLIC_URL`,
   `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`, `AUTO_MODERATION=true`,
   `AUTO_MODERATION_TERMS` et `MODERATION_ALERT_EMAIL`.

Important : utiliser `npm install`, pas `npm ci`, car Render doit installer la
dependance PostgreSQL `pg` a partir de `package.json`.

## Informations legales

Les pages indiquent Yonni CHOU comme editeur non professionnel et responsable du
traitement. Le point de contact publie est `contact.voltvisuel@gmail.com`.

Ces pages sont une base pratique a adapter si le site devient professionnel,
commercial ou change d'hebergeur.

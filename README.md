# Tchatelia

Version minimale gratuite d'un chat en ligne type EuropNet.

Prerequis : Node.js 24 ou plus recent.

## Ce que fait cette premiere version

- Pseudo libre, sans inscription.
- Comptes utilisateurs avec pseudo reserve et mot de passe.
- Connexion invitee toujours disponible pour les pseudos non reserves.
- Gestion admin des comptes : role, activation et reinitialisation de mot de passe.
- Salons publics : `#accueil`, `#aide`, `#musique`, `#rencontres`.
- Interface responsive avec panneaux de salons et de membres adaptes au mobile.
- Centre de moderation dans une fenetre dediee.
- Messages instantanes avec Socket.IO.
- Mentions avec `@pseudo`, mise en evidence et alerte cliquable.
- Compteurs de messages non lus pour chaque salon et dans l'onglet du navigateur.
- Alertes visuelles, sonores et notifications navigateur activables.
- Liste des personnes connectees dans le salon.
- Connexion admin avec mot de passe.
- Role moderateur : kick, ban et unban sans acces a la gestion complete.
- Journal de moderation persistant : exclusions, bannissements, comptes et salons.
- Profils utilisateurs : photo importee ou avatar par lien, description, role et date d'inscription.
- Messages prives persistants entre comptes, compteur de non-lus et blocage.
- Signalement des profils et messages publics/prives avec file de moderation.
- Reglement, conditions d'utilisation et politique de confidentialite.
- Page de contact avec messages consultables dans le panneau admin.
- Validation de l'age minimum et des regles avant l'entree dans le chat.
- Commandes de moderation : `/kick pseudo`, `/ban pseudo`, `/unban pseudo`.
- Panneau admin : kick, ban, unban, creation et suppression de salons.
- Historique et bannissements sauvegardes en SQLite local ou PostgreSQL/Supabase.
- Anti-spam simple : limite les rafales et les messages identiques repetes.
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
```

Un compte cree en mode `Inscription` avec le bon mot de passe admin devient un
compte admin sauvegarde. Ensuite, il suffit de se connecter en mode `Connexion`
avec le pseudo et le mot de passe du compte.

Pour utiliser Supabase ou PostgreSQL, ajouter aussi :

```text
DATABASE_URL=postgresql://...
DATABASE_SSL=true
```

Sans `DATABASE_URL`, Tchatelia utilise automatiquement SQLite local.

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
8. Ajouter dans Render les variables `ADMIN_PASSWORD`, `DATABASE_URL` et `DATABASE_SSL=true`.

Important : utiliser `npm install`, pas `npm ci`, car Render doit installer la
dependance PostgreSQL `pg` a partir de `package.json`.

## Informations legales

Les pages indiquent Yonni CHOU comme editeur non professionnel et responsable du
traitement. Le point de contact publie est `contact.voltvisuel@gmail.com`.

Ces pages sont une base pratique a adapter si le site devient professionnel,
commercial ou change d'hebergeur.

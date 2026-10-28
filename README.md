# MPP RDR 2026 — mise en ligne (15 min)

## 1. Backend (Google Sheet + Apps Script)
1. Crée un **nouveau Google Sheet** (nom : « MPP RDR 2026 »).
2. `Extensions > Apps Script` → supprime le contenu → colle tout `Code.gs`.
3. En haut du script, change `ADMIN_PIN` (et `ADMIN_PSEUDO` si besoin). Le code de ligue par défaut est `RHUM2026`.
4. Choisis la fonction `setup` dans la barre du haut → ▶ Exécuter → autorise l'accès.
   Les onglets Config, Users, Skippers, Picks, Ranking, Prev sont créés, avec les skippers de la liste officielle au 25 octobre.
5. `Déployer > Nouveau déploiement > Application Web` :
   - Exécuter en tant que : **moi**
   - Qui a accès : **tout le monde**
   → copie l'URL qui finit par `/exec`.

## 2. Site (GitHub Pages)
1. Nouveau repo GitHub (ex. `prono-rhum`), ajoute `index.html`.
2. Dans `index.html`, remplace `COLLE_ICI_URL_APPS_SCRIPT` par l'URL `/exec`.
3. `Settings > Pages` → Deploy from branch → `main` / root.
4. Lien à envoyer aux joueurs : `https://<ton-compte>.github.io/prono-rhum/` + le code de ligue.
5. Logo : dépose ton fichier `logo.png` à côté de `index.html`, il s'affiche tout seul dans l'en-tête et sur l'écran de connexion. Sans fichier, rien ne s'affiche.

## 3. Avant le départ (dimanche 1er nov. 13h02)
- Connecte-toi avec ton compte admin → onglet **Admin**.
- Vérifie la date de verrouillage (par défaut 13h02, heure de Paris).
- Les pronos des autres joueurs restent cachés jusqu'au verrouillage.

## 4. Classement en direct
**Manuel (marche tout de suite)** : Admin → « Classement officiel » → choisis les places → Publier. Les points et les flèches ▲▼ se mettent à jour pour tous.

**Automatique (à brancher quand le tracker publie ses données)** :
1. Repère l'URL du flux de classement du tracker officiel (onglet Réseau du navigateur sur routedurhum.com une fois la course lancée).
2. Adapte `parseSource_()` dans `Code.gs` au format réel (il gère déjà un JSON simple).
3. Admin → colle l'URL, décoche « Mode manuel uniquement ».
4. Dans Apps Script, exécute `installTrigger()` une fois : mise à jour toutes les 15 minutes.
5. Après chaque modification de `Code.gs` : `Déployer > Gérer les déploiements > ✎ > Nouvelle version`.

## Barème (modifiable en haut de `Code.gs`)
- Bon skipper à la bonne place : **5 pts**
- Skipper dans le top mais mal placé : **2 pts**
- Bonus vainqueur de la classe trouvé : **+3**
- Bonus top parfait : **+10**

Classes : Ultim top 3, Ocean Fifty top 3, IMOCA top 5, Class40 top 5.

## À savoir
- Un skipper qui abandonne ou se retire : modifie l'onglet `Skippers` du Sheet (avant le départ).
- Sécurité : PIN simple pour un jeu entre amis. Ne pas réutiliser un vrai mot de passe.

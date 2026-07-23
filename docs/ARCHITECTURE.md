# Architecture SURFCE — Phases 0 à 9

## Principes

- **Next.js App Router** avec composants serveur par défaut ;
- **TypeScript strict** et validation Zod aux frontières ;
- **Supabase** pour Auth, PostgreSQL, PostGIS et Storage ;
- **RLS comme autorité finale**, indépendamment de l’affichage des boutons ;
- **multi-tenant par `organization_id`** ;
- textes d’interface centralisés dans `src/lib/i18n/fr.ts` ;
- providers réels fail-closed : aucun appel sans consentement et secrets complets.

## Découpage

```text
src/app/                         Routes, layouts et actions Next.js
src/components/ui/               Primitives visuelles accessibles
src/components/layout/           Shell, navigation et identité SURFCE
src/features/auth/               Validation et résolution de session
src/features/organizations/      Permissions et lecture des memberships
src/features/venues/             Schémas, requêtes, mutations et composants métier
src/features/companies/          Registre, qualification, fiche et provenance
src/features/discovery/          Recherche, import, déduplication et sauvegarde
src/features/enrichment/         Accès, jobs et orchestration d’enrichissement
src/features/personas/           Schéma Zod, génération, version et validation
src/features/matching/           Scoring déterministe, justification et sélection
src/features/contacts/           Répertoire, vérification et opposition
src/features/campaigns/          Séquences, approbation et planification
src/features/messages/           Génération, test et traitement mock
src/features/mailboxes/          OAuth, chiffrement, synchronisation et watches
src/features/inbox/              Conversations, classification, résumé et réponse
src/features/opportunities/      Pipeline, tâches, rendez-vous, propositions et automatisations
src/features/analytics/          Agrégation, filtres, KPI et vigie d’exploitation
src/providers/places/            Contrat provider et implémentation mock
src/providers/registries/        Contrat registre et implémentation mock
src/providers/enrichment/        Contrat analyse website et implémentation mock
src/providers/contacts/          Contrat vérification e-mail et mock
src/providers/mail/              Contrat mail, mock, Gmail et Microsoft Graph
src/providers/ai/                Contrat IA et implémentation déterministe mock
src/components/map/              Rendu MapLibre et couches GeoJSON locales
src/components/forms/            Associations accessibles entre labels, aides et erreurs
src/lib/geo/                      Distance, cercle et inclusion polygonale
src/lib/permissions/             Matrice de rôles centralisée
src/lib/http/                    Sécurité des requêtes et réponses d’erreur API
src/lib/observability/           Journalisation structurée et filtrage des secrets
src/lib/providers/               Réservation et finalisation des quotas distribués
src/lib/supabase/                Clients navigateur, serveur et proxy
src/types/                       Contrats de domaine et types de base
e2e/                             Parcours Playwright publics et authentifiés
supabase/migrations/             Schéma PostgreSQL versionné
supabase/tests/                  Tests pgTAP exécutés contre PostgreSQL
tests/                           Tests unitaires et invariants statiques
```

Les providers Google Workspace et Microsoft 365 sont les premières implémentations réseau. Ils ne
sont instanciés qu’après déchiffrement serveur d’un token lié à une boîte autorisée.

## Flux d’authentification

1. le formulaire `/login` appelle une Server Action ;
2. l’entrée est validée par Zod ;
3. `@supabase/ssr` ouvre la session avec un cookie ;
4. `proxy.ts` vérifie/rafraîchit les claims de session ;
5. le layout applicatif récupère l’utilisateur, son membership actif et son organisation ;
6. les requêtes Supabase restent filtrées par les politiques RLS.

Quand les variables publiques Supabase manquent, le client Supabase n’est pas instancié. Un
contexte d’aperçu local, sans écriture ni donnée externe, permet uniquement de vérifier le shell.

## Modèle Phase 1

### `organizations`

Contient le nom, le slug, le fuseau horaire et les réglages de chaque tenant.

### `profiles`

Prolonge `auth.users`. Un trigger synchronise automatiquement l’e-mail, le nom et l’avatar.

### `memberships`

Relie un utilisateur à une organisation avec un rôle et un état actif. L’unicité
`(organization_id, user_id)` empêche les doublons.

## Rôles

Rôles disponibles : `admin`, `direction`, `sales_manager`, `sales`, `venue_manager`, `marketing`
et `viewer`.

- tous les rôles actifs peuvent lire leur organisation et ses membres ;
- seul `admin` peut modifier l’organisation ou ses memberships dans cette phase ;
- `admin`, `venue_manager` et `marketing` peuvent gérer les lieux, offres et fichiers ;
- `admin` et `sales_manager` peuvent gérer toutes les entreprises ;
- `sales` peut importer puis gérer uniquement les entreprises qui lui sont attribuées ;
- les mêmes trois rôles commerciaux peuvent lancer les traitements Phase 4, avec la même limite
  d’attribution pour `sales` ;
- `admin` et `sales_manager` gèrent tous les contacts et toutes les campagnes ;
- `sales` agit uniquement sur les contacts, entreprises, boîtes et campagnes qui lui sont
  attribués ou qu’il a créés ;
- `marketing` peut préparer les campagnes mais ne contourne jamais les contrôles d’opposition ;
- `admin` et `sales_manager` gèrent tout le pipeline ; `sales` gère les dossiers qui lui sont
  attribués ainsi que leurs tâches, rendez-vous et propositions ;
- les autres rôles peuvent les consulter sans écrire.

La navigation filtre les entrées non pertinentes au rôle. Les routes futures restent visibles mais
désactivées avec leur numéro de phase, afin de rendre le périmètre explicite sans exposer de page
inachevée.

## RLS

Les trente-sept tables des Phases 1 à 9 ont RLS activée. Les fonctions privées `is_org_member`,
`has_org_role` et `shares_org_with` utilisent `security definer` et un `search_path` vide pour
éviter la récursion des politiques et le détournement de résolution de noms. Elles vivent dans le
schéma non exposé `private` ; seuls des wrappers `security invoker` contrôlés sont publiés.

Les fonctions ne sont pas exécutables par `anon`. Le rôle `authenticated` reçoit seulement les
grants nécessaires ; chaque opération reste ensuite limitée par RLS.

Le bucket privé `venue-assets` reprend la même matrice. Le premier segment de chaque chemin est
l’identifiant de l’organisation ; les politiques Storage vérifient ce segment avant lecture ou
écriture. Les URLs de consultation expirent après une heure.

## Modèle Phase 2

### `venues`

Catalogue multi-tenant des établissements : identité, adresse, position PostGIS, capacités, minimum
commercial, usages, secteurs, équipements et conditions. Un trigger construit le point géographique
à partir de la latitude et de la longitude.

### `venue_offers`

Formats commerciaux rattachés à un lieu. Les contraintes empêchent une jauge inversée, un budget
négatif, une commission supérieure à 100 % ou une période de validité incohérente.

### `venue_assets`

Métadonnées des images et PDF stockés dans `venue-assets`. Les clés étrangères composites empêchent
d’associer un fichier à une offre ou un lieu d’une autre organisation.

## Flux de mutation Phase 2

1. React Hook Form effectue la validation ergonomique avec Zod dans le navigateur ;
2. la Server Action revalide exactement le même schéma ;
3. la permission du rôle est contrôlée explicitement ;
4. la requête reste limitée à l’organisation active ;
5. RLS constitue le dernier verrou dans PostgreSQL ou Storage ;
6. les routes concernées sont revalidées après succès.

## Modèle Phase 3

### `companies`

Registre multi-tenant : identité, SIREN/SIRET, activité, coordonnées, géographie, qualification,
attribution, opposition et dates commerciales. Les index uniques partiels portent sur les domaines
actifs et les identifiants légaux.

### `company_locations`

Implantations principales ou secondaires liées par clé étrangère composite à l’organisation de
l’entreprise. Chaque point est indexé en GiST.

### `data_sources`

Provenance générique : entité, champ, provider, référence externe, valeurs brute et normalisée,
collecte, vérification, confiance et caractère déduit. Une référence provider ne peut être importée
deux fois pour le même champ et la même organisation.

### `saved_searches`

Recherche nommée avec texte, catégorie, filtres, centre/rayon ou polygone PostGIS et compteur de
résultats. Tous les membres peuvent sauvegarder ; seul le créateur ou un rôle commercial encadrant
peut la modifier ou la supprimer.

## Flux Discovery Phase 3

1. l’API valide la zone et les filtres avec Zod ;
2. le service appelle l’interface `PlaceSearchProvider` ;
3. `MockPlacesProvider` filtre le jeu fictif côté serveur ;
4. l’UI synchronise liste, carte, focus et sélection ;
5. l’import transmet uniquement une référence provider fiable ;
6. la RPC `import_discovered_company` recharge le détail côté serveur, déduplique et écrit
   entreprise, implantation et sources dans une seule transaction ;
7. RLS limite l’écriture à `admin`, `sales_manager` ou au commercial attribué.

Les RPC `search_companies_in_radius` et `search_companies_in_polygon` restent `security invoker` :
les résultats sont donc toujours filtrés par les politiques de l’appelant.

## Modèle Phase 4

### `personas`

Sortie structurée et versionnée du provider IA : résumé, maturité, besoins, rôles probables,
formats, jauge, budget, score, risques et preuves. La sortie est validée par Zod avant insertion.
Une version reste `draft` tant qu’un membre autorisé ne l’a pas validée ; une nouvelle validation
remplace l’ancienne sans perdre sa trace.

### `venue_matches`

Résultat du moteur déterministe pour un couple établissement + offre. Les six composantes du score,
les raisons, les risques, le pitch et la version du modèle sont stockés. Les clés étrangères
composites empêchent de relier une entreprise, un persona, un lieu ou une offre d’une autre
organisation.

### `provider_jobs`

Journal de traitements avec clé d’idempotence unique par organisation, provider, entrée, sortie,
statut, erreur, compteur limité à 5 essais et coût estimé. Les traitements Phase 4 sont exécutés
dans la requête serveur pour rester utilisables sans worker, mais le contrat permet de déplacer le
traitement dans une file ultérieure sans modifier l’UI.

### `ai_runs`

Trace minimale des générations : type, entité, provider, modèle, version de prompt, hash et snapshot
minimisé des entrées, sortie, statut et usage. Aucun secret ni historique inutile n’y est stocké.

## Flux d’intelligence Phase 4

1. l’API valide l’action et la clé d’idempotence avec Zod ;
2. le serveur vérifie `intelligence:run` et, pour `sales`, l’attribution de l’entreprise ;
3. un job est créé ou réutilisé sans double appel ;
4. le provider mock retourne uniquement des données sourcées et marque l’analyse comme simulée ;
5. le persona est revalidé par `personaOutputSchema`, versionné et conservé en brouillon ;
6. le moteur applique les règles bloquantes puis les poids 30/20/15/15/10/10 ;
7. le provider IA mock explique le score sans le modifier ;
8. l’utilisateur valide le persona et peut retenir une recommandation ;
9. RLS confirme l’organisation et le rôle pour chaque écriture.

Les clés client sont préfixées par le type de job et l’entreprise. Une même clé ne peut donc pas
réutiliser par erreur la sortie d’un autre traitement.

## Modèle Phase 5

### `contacts`

Répertoire professionnel rattaché à une entreprise : identité, fonction, adresse normalisée, statut
de vérification, confiance, affectation, base légale et opposition. L’unicité partielle de
l’adresse normalisée est limitée à l’organisation.

### `mailboxes`

Identité d’expéditeur, provider, état de connexion et limite quotidienne. La Phase 5 n’écrit aucun
token : le provider `mock` conserve seulement un identifiant de compte déterministe.

### `campaigns` et `sequence_steps`

Une campagne relie un expéditeur, un segment manuel, un éventuel lieu et une offre. Elle stocke la
langue, le ton, la limite quotidienne, la fenêtre d’envoi, les règles d’arrêt et l’approbation. Les
étapes portent une position unique, un délai en jours/heures, des instructions et un drapeau
d’approbation.

### `campaign_enrollments`

Inscription unique d’un contact dans une campagne avec état, étape courante, prochain envoi,
instant d’arrêt et snapshot de personnalisation. La RPC `enroll_contact_in_campaign` verrouille les
ressources et bloque toute inscription concernée par une opposition active.

### `mail_threads` et `messages`

Les fils regroupent les échanges par boîte et identifiant provider. Les messages conservent
expéditeur, destinataires, contenu, variante, faits, risques, planning, validation et état. La clé
de déduplication unique par organisation empêche la création de deux livraisons logiques.

### `suppression_list`

Registre d’opposition au niveau e-mail, contact, société ou domaine. La RPC `suppress_contact`
insère l’opposition, marque le contact, arrête ses inscriptions et annule les messages non envoyés
dans une même transaction.

### `audit_logs`

Journal minimal des actions sensibles de campagne et de conformité avec acteur, cible, action,
avant/après et métadonnées.

## Flux de campagne Phase 5

1. l’utilisateur crée un brouillon avec une boîte mock et quatre étapes ;
2. la RPC d’inscription valide l’adresse, l’organisation, le rôle et la suppression ;
3. `MockAiProvider` génère exactement trois variantes à partir des seules sources vérifiées ;
4. Zod valide le contenu, les références et la phrase d’opposition avant écriture ;
5. le premier message reste `pending_approval` jusqu’au feu vert humain ;
6. le lancement applique la fenêtre `Europe/Paris`, les jours ouvrés, les délais et un jitter
   déterministe ;
7. `MockMailProvider` prépare des identifiants stables sans trafic réseau ;
8. `process_mock_campaign_message` reverrouille message, inscription et boîte, recontrôle la
   suppression et inscrit l’envoi une seule fois ;
9. toute deuxième tentative renvoie le résultat existant sans incrémenter le compteur d’envoi.

Les RPC Phase 5 sont `SECURITY DEFINER` pour garder ces mutations atomiques. Elles révoquent
explicitement `anon`, n’accordent `EXECUTE` qu’à `authenticated` et vérifient le membership, le
rôle et l’organisation à l’intérieur de la transaction.

## Modèle et flux Phase 6

`mailboxes` conserve les scopes, curseurs, watches et erreurs de synchronisation. Les tokens OAuth
restent chiffrés dans les colonnes historiques ; la clé n’entre jamais en base. `mail_threads`
porte la classification, la priorité, le résumé structuré et la suggestion. `messages` ajoute les
identifiants Internet, le chaînage de réponse, l’état provider et des métadonnées sans secret.

`message_events` trace réception, envoi, correction et arrêt de campagne. `message_attachments`
ne conserve que les métadonnées contrôlées ; aucun téléchargement distant automatique n’a lieu.

1. le démarrage OAuth crée PKCE, état signé et cookie HTTP-only chiffré ;
2. le callback échange le code, chiffre les tokens et démarre le watch provider ;
3. webhook ou cron charge la boîte avec le client serveur, renouvelle le token si nécessaire et
   lit uniquement les changements depuis le curseur ;
4. `ingest_provider_message`, réservée à `service_role`, déduplique et écrit le fil ;
5. une réponse entrante arrête l’inscription, annule les messages futurs et ajoute une opposition
   si elle exprime un désabonnement ;
6. la correction humaine et le résumé sont audités ;
7. une réponse est réservée localement, envoyée dans le thread provider puis finalisée.

L’expédition de campagne utilise désormais `claim_campaign_message`, l’appel provider puis
`finalize_campaign_message`. Le cron ne dépend plus d’une session navigateur.

## Modèle et flux Phase 7

`opportunity_stages` définit onze jalons configurables par organisation avec position, probabilité
par défaut et catégorie ouverte, gagnée ou perdue. `opportunities` relie le dossier à l’entreprise,
au contact, au lieu, à l’offre, à la campagne et au commercial tout en conservant les trois niveaux
de valeur, les objections et l’action suivante.

`activities` forme un historique append-only. `tasks`, `appointments` et `proposals` portent
respectivement le suivi opérationnel, les rendez-vous et les versions chiffrées de la proposition.
Une conversation peut référencer l’opportunité dont elle est la source.

1. une réponse `interested`, `asks_information`, `asks_price` ou `asks_callback` peut appeler
   `create_opportunity_from_thread` ;
2. la RPC verrouille le fil, vérifie l’organisation et le rôle, puis crée une seule opportunité et
   sa première tâche ;
3. chaque changement de jalon recalcule la probabilité, les dates gagnée/perdue et l’activité ;
4. un rendez-vous avance le dossier jusqu’au jalon rendez-vous s’il était en amont ;
5. une proposition envoyée, acceptée ou refusée fait progresser le dossier et actualise sa valeur ;
6. les triggers inscrivent l’historique et l’audit avant/après, indépendamment de l’interface ;
7. le revenu pondéré utilise le montant signé, proposé ou estimé, dans cet ordre, multiplié par la
   probabilité pour les seuls dossiers ouverts.

Les écritures passent par le client Supabase authentifié et restent soumises aux politiques RLS.
La RPC inbox est `SECURITY DEFINER` pour garantir l’atomicité, révoquée à `anon` et protégée par les
contrôles de conversation et de rôle internes.

## Modèle et flux Phase 8

`compliance_settings` porte les durées de conservation et la base légale par organisation.
`analytics_exports`, `retention_runs` et `privacy_requests` constituent des journaux minimaux,
sans copie de fichier exporté ni duplication de donnée personnelle.

L’agrégation Analytics applique une période maximale, des filtres d’organisation et des bornes
explicites à chaque lecture. Les métriques conservent leur définition, leur source et leur
dénominateur. L’export CSV utilise une liste blanche de colonnes non sensibles et inscrit
uniquement ses métadonnées et son empreinte.

La rétention est simulable par un administrateur et exécutable uniquement par le `service_role`.
L’anonymisation retire les données personnelles et le contenu des messages, arrête les séquences,
mais conserve la preuve d’opposition.

## Modèle et flux Phase 9

`provider_quotas` définit une fenêtre et un maximum par organisation, provider et opération.
`provider_usage_events` trace la réservation, le résultat, la durée et un code d’erreur sans
conserver la requête provider. `provider_jobs.quota_event_id` relie un traitement à sa réservation.

1. le service appelle `consume_provider_quota` avant toute opération provider ;
2. la RPC `SECURITY INVOKER` vérifie le membership ou le rôle service, choisit la règle la plus
   précise et verrouille la fenêtre par advisory lock transactionnel ;
3. un dépassement direct renvoie `429`, tandis qu’un trigger bloque un job avant son démarrage ;
4. `finalize_provider_operation` inscrit uniquement succès/échec, durée et code ;
5. Analytics agrège blocages, taux d’erreur et durée moyenne ;
6. les assertions distantes valident quotas, triggers, RLS, isolation et privilèges dans une
   transaction annulée.

Le proxy Next place un `x-request-id` et un nonce CSP sur chaque requête, rejette les mutations
cross-site, applique une limite HTTP par instance et renouvelle ensuite la session Supabase. Les
callbacks cron/webhook restent hors du contrôle CSRF et appliquent leur secret ou signature
propre.

`instrumentation.ts` journalise le démarrage et les erreurs de requête Next. Les logs JSON filtrent
les champs sensibles et ne contiennent ni corps, ni e-mail, ni clé. Les sondes live/ready
différencient disponibilité du processus et configuration runtime.

Les registres entreprises et contacts sont paginés côté serveur. Les lectures Analytics, campagnes
et établissements ont des limites explicites ; les offres sont regroupées par `Map` pour éviter
les parcours N × M.

Playwright couvre le parcours mock, la conformité, les en-têtes et le CSRF. Un scénario séparé,
activé uniquement avec des variables éphémères, vérifie la connexion propriétaire, les pages
critiques et le blocage d’opposition.

## Design system et direction Phases 2 et 3

Le thème lumineux utilise des tokens CSS sémantiques : fond, carte, premier plan, primaire, muted,
accent, bordure, focus, succès, avertissement et danger. Les composants partagés (`Button`, `Card`,
`Badge`, `Input`) appliquent :

- focus visible ;
- contrastes sémantiques ;
- labels et messages associés ;
- navigation clavier ;
- lien d’évitement ;
- réduction des animations avec `prefers-reduced-motion` ;
- shell responsive desktop/tablette/mobile.

La Phase 2 ajoute une direction propre à SURFCE : registre éditorial, typographie de données et
« passeport lieu » fondé sur le slug, la ville, les coordonnées et la jauge. Cette signature reste
concentrée sur les fiches établissements afin que les formulaires conservent une densité sobre.

La Phase 3 prolonge cette direction avec la « lentille cartographique » : carte dominante à droite,
registre synchronisé à gauche, zone de recherche bleue, sélection corail et points importés en
encre. Le fond vectoriel local évite toute dépendance externe et rend le caractère fictif du jeu de
données explicite.

La Phase 4 adopte le « dossier d’hypothèses » : une bande sombre relie registre, signaux, persona et
décision. Les preuves, incertitudes et composantes du score restent visibles ; aucun halo violet,
chatbot ou symbole d’IA magique ne remplace le raisonnement métier.

La Phase 5 adopte le « bureau d’expédition contrôlé » : un rail sombre relie preuves, variantes,
validation et expédition simulée. Les vues Contacts prennent la forme d’un registre lisible et les
campagnes restent des manifestes à faible volume, sans reproduire un client mail ni un tableau
Kanban générique.

La Phase 6 adopte la « table de correspondance » : liste compacte, fil central et registre latéral
de signaux. Sa ligne de réponse relie entrée, classification, arrêt de séquence et action suivante
sans imiter Gmail ou Outlook.

La Phase 7 adopte le « plan de circulation commerciale » : les jalons sont des postes de passage,
les opportunités des dossiers en mouvement et la bande montant × probabilité × action suivante
constitue la signature visuelle. La vue évite les cartes Kanban génériques et conserve une
alternative clavier pour chaque déplacement.

La Phase 8 adopte le « pupitre de preuve » : métriques sourcées, dénominateurs visibles et
gouvernance calme. La Phase 9 conserve cette direction pour les erreurs et la pagination, sans
ajouter de couche visuelle décorative à des états opérationnels.

## Décisions différées

- implémentations réelles SIRENE, website, Hunter, Dropcontact et OpenAI : après configuration et
  validation de leurs conditions d’usage ;
- providers réels Places, SIRENE, Hunter, Dropcontact et OpenAI : après validation de leurs coûts
  et conditions d’usage ;
- activation des crons de production : après ajout de `CRON_SECRET` et
  `SUPABASE_SERVICE_ROLE_KEY` dans Vercel ;
- éventuelle télémétrie externe : après choix explicite du fournisseur, de la région et des règles
  de minimisation des données.

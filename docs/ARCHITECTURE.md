# Architecture SURFCE — Phases 0 à 4

## Principes

- **Next.js App Router** avec composants serveur par défaut ;
- **TypeScript strict** et validation Zod aux frontières ;
- **Supabase** pour Auth, PostgreSQL, PostGIS et Storage ;
- **RLS comme autorité finale**, indépendamment de l’affichage des boutons ;
- **multi-tenant par `organization_id`** ;
- textes d’interface centralisés dans `src/lib/i18n/fr.ts` ;
- aucune intégration payante ni appel à un provider réel dans cette livraison.

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
src/providers/places/            Contrat provider et implémentation mock
src/providers/registries/        Contrat registre et implémentation mock
src/providers/enrichment/        Contrat analyse website et implémentation mock
src/providers/ai/                Contrat IA et implémentation déterministe mock
src/components/map/              Rendu MapLibre et couches GeoJSON locales
src/components/forms/            Associations accessibles entre labels, aides et erreurs
src/lib/geo/                      Distance, cercle et inclusion polygonale
src/lib/permissions/             Matrice de rôles centralisée
src/lib/supabase/                Clients navigateur, serveur et proxy
src/types/                       Contrats de domaine et types de base
supabase/migrations/             Schéma PostgreSQL versionné
supabase/tests/                  Tests pgTAP exécutés contre PostgreSQL
tests/                           Tests unitaires et invariants statiques
```

Les quatre familles de providers livrées utilisent uniquement des mocks sans réseau. Les providers
réels et `src/emails` restent réservés aux phases autorisées ultérieurement.

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
- les autres rôles peuvent les consulter sans écrire.

La navigation filtre les entrées non pertinentes au rôle. Les routes futures restent visibles mais
désactivées avec leur numéro de phase, afin de rendre le périmètre explicite sans exposer de page
inachevée.

## RLS

Les quatorze tables des Phases 1 à 4 ont RLS activée. Les fonctions privées `is_org_member`,
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

## Décisions différées

- implémentations réelles SIRENE, website, Hunter, Dropcontact et OpenAI : après configuration et
  validation de leurs conditions d’usage ;
- contacts, campagnes et mail mock : Phase 5 ;
- OAuth Gmail/Microsoft : Phase 6.

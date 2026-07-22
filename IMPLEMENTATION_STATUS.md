# État d’implémentation SURFCE

Dernière mise à jour : 23 juillet 2026

## Audit initial

Le dossier contenait uniquement :

- `SURFCE_CODEX_SPEC.md` ;
- `skills-lock.json` et le skill local sous `.agents/`.

Il n’existait ni application, ni `package.json`, ni migration, ni test, ni dépôt Git détectable à la
racine. Aucun code métier antérieur n’a donc été supprimé ou remplacé.

## État actuel

| Phase                                | État           | Résultat                                                                                                    |
| ------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------- |
| Phase 0 — Audit et socle             | Implémentée    | Next.js App Router, TS strict, Tailwind, ESLint, Prettier, Vitest, structure, design system, login et shell |
| Phase 1 — Auth, organisation et RLS  | Déployée       | Supabase SSR, profils, organisations, memberships, rôles, navigation filtrée, migrations, seed et tests RLS |
| Phase 2 — Établissements et offres   | Déployée       | CRUD, offres, assets privés, galerie, validations, RLS et seed Stargazing                                   |
| Phase 3 — Entreprises et Explorer    | Déployée       | MapLibre local, provider mock, import dédupliqué, sources, fiches, RLS et PostGIS                           |
| Phase 4 — Enrichissement et matching | Déployée       | Providers mock, jobs, persona Zod, validation humaine, score explicable et recommandations                  |
| Phases 5 à 9                         | Non commencées | Hors périmètre de cette intervention                                                                        |

## Identité du produit

- `SURFCE` est le produit indépendant et l’espace propriétaire ;
- sa direction artistique appartient à son propriétaire et ne dépend pas de Stargazing ;
- `Stargazing` est le premier cas d’usage métier géré dans SURFCE, notamment pour les futurs
  établissements et offres.

## Livré en Phase 0

- configuration Next.js 16, React 19, TypeScript strict et alias `@/*` ;
- Tailwind CSS 4 et tokens de design sémantiques ;
- primitives UI locales et accessibles ;
- page de connexion responsive ;
- shell applicatif responsive avec navigation latérale et barre supérieure ;
- mode aperçu sans Supabase, explicitement sans action de données ;
- ESLint, Prettier, Vitest et scripts npm ;
- `.env.example`, documentation et structure requise.

## Livré en Phase 1

- clients Supabase navigateur/serveur et rafraîchissement SSR par proxy ;
- validation Zod du formulaire de connexion ;
- callback PKCE et déconnexion serveur prête ;
- contexte authentifié résolu côté serveur ;
- rôles et matrice de permission partagée ;
- pages Organisation et Membres ;
- migration atomique pour `organizations`, `profiles` et `memberships` ;
- trigger de synchronisation `auth.users` vers `profiles` ;
- fonctions RLS durcies et politiques sans accès global permissif ;
- helpers `SECURITY DEFINER` isolés dans un schéma non exposé ;
- RPC atomique `create_organization` ;
- seed idempotent de l’espace propriétaire `SURFCE` ;
- scénario pgTAP d’isolation entre organisations ;
- deux migrations appliquées au projet Supabase distant via MCP ;
- assertions RLS distantes exécutées puis annulées transactionnellement ;
- audit du schéma et des politiques Supabase sans alerte RLS ;
- espace distant renommé `SURFCE` (`slug: surfce`) conformément à l’identité du produit ;
- compte propriétaire Auth créé, confirmé et rattaché à `SURFCE` avec le rôle `admin`.

## Livré en Phase 2

- tables `venues`, `venue_offers` et `venue_assets` avec contraintes métier et index ;
- géolocalisation PostGIS préparée sans démarrer les recherches de Phase 3 ;
- douze politiques RLS pour la lecture par membre et l’écriture par `admin`, `venue_manager` ou
  `marketing` ;
- bucket Supabase Storage privé `venue-assets`, limité à 10 Mo et aux formats JPG, PNG, WebP et
  PDF ;
- registre filtrable par statut avec recherche par nom ;
- fiches établissement, création, édition et suppression confirmée ;
- CRUD des offres imbriqué dans chaque établissement ;
- validation Zod et base des jauges, budgets, commissions, dates et coordonnées ;
- galerie avec upload, URL signée et suppression des fichiers ;
- quatre établissements Stargazing et quatre offres éditables, explicitement marqués comme données
  à confirmer ;
- interface distinctive « registre de lieux / passeport » produite avec le skill
  `frontend-design` ;
- audit du code UI selon `web-design-guidelines` et corrections d’accessibilité ;
- deux migrations Phase 2 appliquées au projet distant ;
- assertions RLS distantes rollback-only réussies ;
- test réel du stockage privé réussi puis nettoyé sans résidu.

## Livré en Phase 3

- tables `saved_searches`, `companies`, `company_locations` et `data_sources` avec contraintes,
  index et RLS ;
- seize politiques Phase 3 : lecture par membre, écriture globale par `admin`/`sales_manager` et
  écriture limitée aux entreprises attribuées pour `sales` ;
- fonctions `security invoker` de recherche PostGIS par rayon et polygone GeoJSON validé ;
- RPC atomique d’import avec déduplication par référence provider, domaine, téléphone puis nom +
  adresse ;
- interface `PlaceSearchProvider` et `MockPlacesProvider` contenant dix sociétés parisiennes
  explicitement fictives, sans appel externe ni coût ;
- domaines `.example` et aucune coordonnée réelle de personne ;
- cinq routes API Discovery : recherche, import unitaire, import batch, déduplication et sauvegarde ;
- Explorer MapLibre avec fond vectoriel local, rayon, polygone cliquable, filtres, liste
  synchronisée, sélection multiple et détail rapide ;
- alternative clavier pour appliquer un polygone Paris centre ;
- recherches sauvegardées et route de rejeu `/explore/saved/[id]` ;
- registre entreprises filtrable, fiche générale, implantations, opposition, attribution, scores et
  édition tracée ;
- provenance générique par champ avec valeur brute, valeur normalisée, provider, date et confiance ;
- deux entreprises, deux implantations et deux sources fictives semées dans l’espace `SURFCE` ;
- direction visuelle « lentille cartographique / registre synchronisé » produite avec
  `frontend-design` ;
- audit du code UI selon `web-design-guidelines` et corrections clavier, focus, formulaires et
  annonces asynchrones ;
- deux migrations Phase 3 appliquées au projet distant ;
- assertions distantes rollback-only RLS, PostGIS et idempotence réussies ;
- Performance Advisor sans clé étrangère non indexée ni avertissement d’initialisation RLS.

## Livré en Phase 4

- tables `personas`, `venue_matches`, `provider_jobs` et `ai_runs`, toutes protégées par RLS ;
- seize politiques Phase 4 : lecture par membre, écriture par `admin`/`sales_manager` ou par le
  commercial assigné à l’entreprise ;
- index composites couvrant toutes les clés étrangères du matching ;
- interface `CompanyRegistryProvider` et `MockCompanyRegistryProvider` : les identifiants inconnus
  restent `null` ;
- interface `WebsiteEnrichmentProvider` et `MockWebsiteEnrichmentProvider` : aucun téléchargement
  distant, pages et avertissements explicitement marqués comme simulés ;
- interface `AiProvider` et `MockAiProvider`, sans appel externe ni coût ;
- quatre routes API entreprise : `/enrich`, `/verify`, `/persona` et `/match-venues` ;
- jobs idempotents préfixés par action et entreprise, limite de cinq essais, coût, statut et erreur ;
- prompts `persona.v1` et `venue-match-rationale.v1` versionnés ;
- persona JSON validé par Zod, sourcé, versionné, régénérable et validable humainement ;
- données inconnues conservées à `null`, notamment le budget, le SIREN et le SIRET absents ;
- moteur de matching déterministe conforme aux poids 30/20/15/15/10/10 et règles bloquantes ;
- jusqu’à cinq recommandations lieu + offre avec composantes, raisons, risques et pitch prudent ;
- sélection humaine d’une recommandation ;
- fiche entreprise réorganisée en « dossier d’hypothèses » avec onglets Persona, Recommandations et
  Données et sources ;
- direction visuelle Phase 4 produite avec `frontend-design` et auditée avec
  `web-design-guidelines` ;
- seed fictif : un persona brouillon, quatre recommandations, trois jobs, une exécution mock et
  deux sources d’enrichissement ;
- deux migrations Phase 4 appliquées au projet distant ;
- assertions distantes rollback-only réussies pour isolation, viewer, commercial assigné et
  idempotence ;
- Security Advisor sans alerte de schéma/RLS et Performance Advisor sans clé étrangère non indexée.

## Vérifications

| Commande                          | Résultat actuel                                                                |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `npm run lint`                    | Réussi — 0 erreur, 0 avertissement                                             |
| `npm run typecheck`               | Réussi                                                                         |
| `npm test`                        | Réussi — 11 fichiers, 78 tests                                                 |
| `npm run format:check`            | Réussi                                                                         |
| `npm run build`                   | Réussi — 27 routes générées avec Next.js 16.2.11                               |
| Smoke test `/login` et `/explore` | Réussi — login HTTP 200, Explorer anonyme redirigé vers `/login`               |
| `npm run test:rls`                | Tenté — échec de connexion à PostgreSQL local, Docker/base locale indisponible |
| Assertions RLS distantes          | Réussi — isolation de deux organisations et permissions admin/viewer validées  |
| Supabase Security Advisor         | Schéma/RLS sans alerte — 1 avertissement de configuration Auth documenté       |
| Auth propriétaire distant         | Réussi — connexion par mot de passe et émission d’un jeton validées            |
| Assertions RLS Phase 2            | Réussi — isolation, lecture viewer et écriture venue manager validées          |
| Lecture RLS avec le compte admin  | Réussi — 4 établissements visibles                                             |
| Stockage privé Phase 2            | Réussi — upload, métadonnée RLS, lecture et suppression                        |
| Supabase Performance Advisor      | Aucune clé étrangère non indexée — index inutilisés attendus sur tables neuves |
| Assertions RLS/PostGIS Phase 3    | Réussi — isolation, rôles, rayon, polygone et import idempotent                |
| Schéma distant Phase 3            | Réussi — 4 tables RLS, 16 politiques, 3 RPC `security invoker`                 |
| Assertions RLS Phase 4            | Réussi — isolation, viewer, commercial assigné et idempotence                  |
| Schéma distant Phase 4            | Réussi — 4 tables RLS, 16 politiques, 2 migrations et 0 FK non indexée         |
| Données mock Phase 4              | Réussi — 1 persona, 4 matchs, 3 jobs, 1 run IA et budget inconnu à `null`      |

Les invariants RLS sont aussi contrôlés par Vitest. Les scénarios distants ont été exécutés avec des
utilisateurs fictifs dans des transactions ensuite annulées. Le test pgTAP local reste disponible
pour une future installation Docker.

## Variables manquantes

La connexion au projet Supabase est configurée localement dans `.env.local`, fichier ignoré par Git.
La seule valeur publique encore non définie est :

- `NEXT_PUBLIC_APP_URL` ;

Variables serveur préparées mais non utilisées dans ce périmètre :

- `SUPABASE_SERVICE_ROLE_KEY` ;
- `SUPABASE_DATABASE_URL` ;
- `APP_ENCRYPTION_KEY` ;
- `CRON_SECRET`.

La Phase 4 fonctionne entièrement avec les valeurs par défaut `AI_PROVIDER=mock` et
`COMPANY_REGISTRY_PROVIDER=mock`. Les variables suivantes manquent pour activer de futurs providers
réels, mais ne bloquent pas l’application actuelle :

- `OPENAI_API_KEY` et `AI_DEFAULT_MODEL` ;
- `SIRENE_API_KEY` et `SIRENE_API_BASE_URL` ;
- `HUNTER_API_KEY` ;
- `DROPCONTACT_API_KEY`.

Les sélecteurs `AI_PROVIDER` et `COMPANY_REGISTRY_PROVIDER` ne sont pas écrits dans `.env.local` ;
le fallback serveur `mock` est donc utilisé explicitement par le code.

Toutes les clés de providers externes restent volontairement vides et aucun appel externe Phase 4
n’est effectué.

## Écarts et risques

1. Docker n’est pas installé/détecté : `npm run test:rls` ne peut pas utiliser PostgreSQL local. Le
   scénario RLS équivalent est toutefois validé sur le projet distant.
2. `NEXT_PUBLIC_APP_URL` reste volontairement vide jusqu’au choix de l’URL de déploiement.
3. Supabase Auth signale que la protection contre les mots de passe compromis est désactivée. Ce
   réglage doit être activé avant la production depuis les paramètres Auth.
4. `npm audit` signale actuellement trois vulnérabilités transitives (une modérée et deux hautes).
   Ne pas appliquer de correction forcée entraînant une rétrogradation majeure de Next.js.
5. Les valeurs commerciales des lieux, offres, entreprises, personas et recommandations sont des
   données de démonstration à valider, jamais des promesses définitives. Toutes les sociétés
   Explorer sont fictives.
6. Le navigateur intégré n’expose aucune instance dans cette session. Le rendu `/login`, le build,
   les smoke tests HTTP et l’audit structurel responsive/accessibilité ont été validés ; aucune
   capture de l’Explorer authentifié n’a pu être produite.
7. L’absence de dépôt Git à la racine empêche de produire un diff Git ou un historique de commit.
8. Le mode aperçu sert au contrôle visuel uniquement et ne remplace pas une session Supabase.

## Plan des prochaines phases

1. **Phase 5** — contacts, mail mock, campagnes et suppression ;
2. Phase 6 — Gmail/Microsoft et inbox ;
3. Phase 7 — opportunités et tâches ;
4. Phase 8 — dashboard métier, analytics et conformité ;
5. Phase 9 — durcissement production et E2E.

## Prochaine phase

**Phase 5 — Contacts, boîtes et campagnes mock.** La prochaine intervention doit ajouter les
contacts professionnels, leur vérification, le provider mail mock, les campagnes, séquences,
aperçus, approbations, règles d’arrêt et liste de suppression. Gmail et Microsoft restent réservés
à la Phase 6.

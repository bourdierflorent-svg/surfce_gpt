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
| Phase 5 — Contacts et campagnes mock | Déployée       | Contacts, vérification, séquences, validation, planification, envoi mock et suppression atomique            |
| Phases 6 à 9                         | Non commencées | Providers mail externes, inbox, CRM, analytics et durcissement restent hors de cette intervention           |

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

## Livré en Phase 5

- neuf nouvelles tables : `contacts`, `mailboxes`, `campaigns`, `sequence_steps`,
  `campaign_enrollments`, `mail_threads`, `messages`, `suppression_list` et `audit_logs` ;
- RLS sur chaque table et trente politiques multi-tenant couvrant lecture, administration,
  responsables commerciaux, commerciaux assignés, marketing et rôles en lecture seule ;
- trois RPC atomiques pour inscrire un contact, enregistrer une opposition et traiter un message
  mock sans double envoi ;
- exécution des RPC interdite au rôle `anon` et limitée aux utilisateurs authentifiés, avec
  vérification du rôle et de l’organisation dans chaque fonction ;
- index couvrant toutes les nouvelles clés étrangères et les chemins de sélection des messages dus ;
- quinze contacts professionnels fictifs sur des domaines `.example`, une boîte mock sans token,
  deux campagnes, huit étapes, deux inscriptions et deux messages de démonstration ;
- interface `ContactVerificationProvider` et `MockContactVerificationProvider`, à coût nul ;
- interface `MailProvider` et `MockMailProvider`, avec identifiants de message et de fil
  déterministes sans livraison réelle ;
- extension de `AiProvider` pour générer exactement trois variantes d’e-mail, validées par Zod,
  associées à leurs références de source et terminées par une phrase d’opposition ;
- prompt `campaign-email.v1` versionné et exécutions consignées dans `ai_runs` ;
- routes Contacts pour la liste, la fiche, la vérification et l’opposition ;
- routes Campagnes pour créer, inscrire, désinscrire, prévisualiser, approuver, lancer et mettre en
  pause ;
- routes Messages pour générer, tester et traiter un envoi mock ;
- moteur de planification en fuseau `Europe/Paris`, jours ouvrés, fenêtre configurable, délais par
  étape et jitter déterministe ;
- premier message obligatoirement validé avant le lancement ;
- contrôle de suppression par e-mail, contact, société ou domaine avant l’inscription et juste
  avant l’envoi ;
- direction visuelle « bureau d’expédition contrôlé » structurée par le rail preuves → variantes →
  validation → expédition, produite avec `frontend-design` ;
- audit selon `web-design-guidelines` et corrections des focus clavier, formulaires, annonces
  asynchrones, contenus longs et états vides ;
- dix migrations Phase 5 appliquées au projet distant ;
- assertions distantes rollback-only réussies pour l’isolation, les rôles, la suppression et
  l’absence de double envoi ;
- Security Advisor sans RPC anonyme ; les trois avertissements restants correspondent aux RPC
  `SECURITY DEFINER` volontairement exposées aux seuls membres authentifiés et contrôlées en
  interne ;
- Performance Advisor sans clé étrangère non indexée ; seuls des index neufs encore inutilisés sont
  signalés au niveau informationnel.

## Vérifications

| Commande                         | Résultat actuel                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `npm run lint`                   | Réussi — 0 erreur, 0 avertissement                                              |
| `npm run typecheck`              | Réussi                                                                          |
| `npm test`                       | Réussi — 13 fichiers, 98 tests                                                  |
| `npm run format:check`           | Réussi                                                                          |
| `npm run build`                  | Réussi — 48 routes générées avec Next.js 16.2.11                                |
| Smoke test Phase 5               | Réussi — login 200, Contacts/Campagnes 307 vers login, cron fermé en 503        |
| `npm run test:rls`               | Tenté — échec de connexion à PostgreSQL local, Docker/base locale indisponible  |
| Assertions RLS distantes         | Réussi — isolation de deux organisations et permissions admin/viewer validées   |
| Supabase Security Advisor        | `anon` bloqué ; 3 RPC authentifiées intentionnelles et protection Auth à régler |
| Auth propriétaire distant        | Réussi — connexion par mot de passe et émission d’un jeton validées             |
| Assertions RLS Phase 2           | Réussi — isolation, lecture viewer et écriture venue manager validées           |
| Lecture RLS avec le compte admin | Réussi — 4 établissements visibles                                              |
| Stockage privé Phase 2           | Réussi — upload, métadonnée RLS, lecture et suppression                         |
| Supabase Performance Advisor     | Aucune clé étrangère non indexée — index inutilisés attendus sur tables neuves  |
| Assertions RLS/PostGIS Phase 3   | Réussi — isolation, rôles, rayon, polygone et import idempotent                 |
| Schéma distant Phase 3           | Réussi — 4 tables RLS, 16 politiques, 3 RPC `security invoker`                  |
| Assertions RLS Phase 4           | Réussi — isolation, viewer, commercial assigné et idempotence                   |
| Schéma distant Phase 4           | Réussi — 4 tables RLS, 16 politiques, 2 migrations et 0 FK non indexée          |
| Données mock Phase 4             | Réussi — 1 persona, 4 matchs, 3 jobs, 1 run IA et budget inconnu à `null`       |
| Assertions RLS Phase 5           | Réussi — isolation, rôles, suppression et absence de double envoi               |
| Schéma distant Phase 5           | Réussi — 9 tables RLS, 30 politiques, 10 migrations et 0 FK non indexée         |
| Données mock Phase 5             | Réussi — 15 contacts, 1 boîte, 2 campagnes, 8 étapes et 2 messages              |

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

La Phase 5 fonctionne entièrement avec les valeurs par défaut `AI_PROVIDER=mock`,
`COMPANY_REGISTRY_PROVIDER=mock`, `CONTACT_VERIFICATION_PROVIDER=mock` et `MAIL_PROVIDER=mock`.
Les variables suivantes manquent pour activer de futurs providers réels, mais ne bloquent pas le
scénario mock :

- `OPENAI_API_KEY` et `AI_DEFAULT_MODEL` ;
- `SIRENE_API_KEY` et `SIRENE_API_BASE_URL` ;
- `HUNTER_API_KEY` ;
- `DROPCONTACT_API_KEY`.

Les identifiants OAuth Phase 6 ne sont pas configurés :

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` et `GOOGLE_REDIRECT_URI` ;
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` et
  `MICROSOFT_REDIRECT_URI`.

Les sélecteurs de providers peuvent rester absents de `.env.local` : le fallback serveur `mock`
est explicite dans le code.

Toutes les clés de providers externes restent volontairement vides et aucun appel externe Phase 4
n’est effectué.

## Écarts et risques

1. Docker n’est pas installé/détecté : `npm run test:rls` ne peut pas utiliser PostgreSQL local. Le
   scénario RLS équivalent est toutefois validé sur le projet distant.
2. `NEXT_PUBLIC_APP_URL` reste volontairement vide jusqu’au choix de l’URL de déploiement.
3. Supabase Auth signale que la protection contre les mots de passe compromis est désactivée. Ce
   réglage doit être activé avant la production depuis les paramètres Auth.
4. Les trois RPC Phase 5 sont `SECURITY DEFINER` afin de garantir leurs mutations atomiques. Elles
   ne sont pas exécutables par `anon`, vérifient le membership et le rôle en interne, mais restent
   signalées par le Security Advisor car elles sont appelables par `authenticated`.
5. La route cron de Phase 5 reste fermée tant que `CRON_SECRET` n’est pas défini. Son utilisation
   autonome en déploiement nécessitera aussi un contexte serveur contrôlé avant activation.
6. Les valeurs commerciales des lieux, offres, entreprises, personas et recommandations sont des
   données de démonstration à valider, jamais des promesses définitives. Toutes les sociétés
   Explorer et tous les contacts Phase 5 sont fictifs.
7. Le mode aperçu sert au contrôle visuel uniquement et ne remplace pas une session Supabase.

## Plan des prochaines phases

1. **Phase 6** — Gmail/Microsoft et inbox ;
2. Phase 7 — opportunités et tâches ;
3. Phase 8 — dashboard métier, analytics et conformité ;
4. Phase 9 — durcissement production et E2E.

## Prochaine phase

**Phase 6 — Gmail/Microsoft et inbox.** La prochaine intervention doit ajouter OAuth, le stockage
chiffré des tokens, la synchronisation, les webhooks, les fils de discussion entrants et le
classement des réponses. Elle ne doit commencer qu’après réception de l’URL publique de
l’application et configuration des redirect URIs et secrets adaptés.

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
| Phase 6 — Gmail/Microsoft et inbox   | Déployée       | OAuth, tokens chiffrés, sync, webhooks, fils, qualification, réponses et arrêt automatique                  |
| Phases 7 à 9                         | Non commencées | Opportunités, tâches, analytics et durcissement restent hors de cette intervention                          |

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

## Livré en Phase 6

- OAuth Authorization Code + PKCE pour Google Workspace et Microsoft 365, avec état signé,
  cookie HTTP-only chiffré et callback lié à l’utilisateur et à l’organisation ;
- chiffrement AES-256-GCM des access/refresh tokens, renouvellement automatique et suppression des
  secrets à la déconnexion ;
- providers Gmail et Microsoft Graph conformes au contrat mail commun, y compris la réponse dans
  le fil d’origine ;
- synchronisation incrémentale Gmail History et Microsoft Delta, curseurs persistés, gestion des
  erreurs et synchronisation manuelle ;
- watches Gmail Pub/Sub et subscriptions Microsoft Graph, avec renouvellement planifié et webhooks
  fail-closed ;
- normalisation des messages entrants, assainissement HTML, protection des en-têtes MIME,
  déduplication provider et métadonnées de pièces jointes ;
- tables `message_events` et `message_attachments`, extension de `mailboxes`, `mail_threads` et
  `messages`, contraintes, index et RLS ;
- ingestion atomique service-only associant le bon fil, le contact, la société et la campagne ;
- arrêt automatique et transactionnel des relances dès une réponse humaine, avec opposition
  enregistrée pour les désabonnements ;
- livraison sortante réservée puis finalisée de manière idempotente, exclusivement avec le client
  serveur `service_role` ;
- ancien helper d’envoi mock retiré de l’API authentifiée et conservé uniquement pour les tests
  service-role ;
- inbox filtrable par qualification, priorité, état de lecture et recherche ;
- écran de fil structuré en « ligne de réponse » : événements et correspondances, conversation,
  résumé, qualification, association et réponse ;
- classification déterministe automatique, correction humaine, résumé structuré et suggestion de
  réponse via le provider IA mock ;
- routes de connexion, callback, synchronisation, déconnexion, cron, webhook, qualification,
  association, lecture, résumé, brouillon et réponse ;
- trois réponses entrantes fictives semées, dont un intérêt, une demande de tarif avec pièce jointe
  et une opposition ;
- direction visuelle « table de correspondance » produite avec `frontend-design` ;
- audit selon `web-design-guidelines` et corrections des focus, états asynchrones, filtres URL,
  avertissement de brouillon non enregistré et longues listes ;
- sept migrations Phase 6 appliquées au projet distant ;
- assertions distantes rollback-only Phase 5 et Phase 6 réussies après durcissement ;
- Security Advisor réduit à quatre RPC authentifiées intentionnelles, contrôlées par rôle et
  organisation, plus le réglage Auth des mots de passe compromis ;
- Performance Advisor sans clé étrangère non indexée ; seuls les index neufs sans activité sont
  signalés au niveau informationnel.

## Vérifications

| Commande                         | Résultat actuel                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `npm run lint`                   | Réussi — 0 erreur, 0 avertissement                                              |
| `npm run typecheck`              | Réussi                                                                          |
| `npm test`                       | Réussi — 15 fichiers, 115 tests                                                 |
| `npm run format:check`           | Réussi                                                                          |
| `npm run build`                  | Réussi — routes Inbox, OAuth, webhook et cron générées avec Next.js 16.2.11     |
| `npm run test:rls`               | Tenté — échec de connexion à PostgreSQL local, Docker/base locale indisponible  |
| Assertions RLS distantes         | Réussi — isolation de deux organisations et permissions admin/viewer validées   |
| Supabase Security Advisor        | `anon` bloqué ; 4 RPC authentifiées intentionnelles et protection Auth à régler |
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
| Assertions RLS Phase 5           | Réussi — régression rejouée avec livraison mock réservée au service role        |
| Schéma distant Phase 5           | Réussi — 9 tables RLS, 30 politiques, 10 migrations et 0 FK non indexée         |
| Données mock Phase 5             | Réussi — 15 contacts, 1 boîte, 2 campagnes, 8 étapes et 2 messages              |
| Assertions RLS Phase 6           | Réussi — idempotence, arrêt, rôles et correction manuelle, rollback final       |
| Schéma distant Phase 6           | Réussi — 2 nouvelles tables RLS et 7 migrations                                 |
| Données mock Phase 6             | Réussi — 3 réponses, 1 arrêt de campagne et 1 pièce jointe                      |

Les invariants RLS sont aussi contrôlés par Vitest. Les scénarios distants ont été exécutés avec des
utilisateurs fictifs dans des transactions ensuite annulées. Le test pgTAP local reste disponible
pour une future installation Docker.

## Variables manquantes

La connexion publique Supabase et `NEXT_PUBLIC_APP_URL=https://surfce-gpt.vercel.app` sont
configurées localement dans `.env.local`, fichier ignoré par Git. Les valeurs suivantes restent à
ajouter ou à confirmer dans l’environnement Vercel :

- `NEXT_PUBLIC_APP_URL=https://surfce-gpt.vercel.app` ;
- `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` ;
- `SUPABASE_SERVICE_ROLE_KEY` ;
- `APP_ENCRYPTION_KEY`, clé aléatoire de 32 octets encodée en Base64 ;
- `CRON_SECRET`.

Pour connecter Google Workspace :

- `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` ;
- `GOOGLE_REDIRECT_URI=https://surfce-gpt.vercel.app/api/oauth/google/callback` ;
- `GOOGLE_PUBSUB_TOPIC` et `GOOGLE_WEBHOOK_SECRET`.

Pour connecter Microsoft 365 :

- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` et `MICROSOFT_TENANT_ID` ;
- `MICROSOFT_REDIRECT_URI=https://surfce-gpt.vercel.app/api/oauth/microsoft/callback` ;
- `MICROSOFT_WEBHOOK_CLIENT_STATE`.

Variables optionnelles ou réservées aux autres providers :

- `MAIL_WEBHOOK_SECRET` pour le webhook générique/mock ;
- `SUPABASE_DATABASE_URL` pour automatiser les migrations, non requise au runtime ;
- `OPENAI_API_KEY` et `AI_DEFAULT_MODEL` ;
- `SIRENE_API_KEY` et `SIRENE_API_BASE_URL` ;
- `HUNTER_API_KEY` ;
- `DROPCONTACT_API_KEY`.

Les sélecteurs `AI_PROVIDER`, `COMPANY_REGISTRY_PROVIDER`, `CONTACT_VERIFICATION_PROVIDER` et
`MAIL_PROVIDER` peuvent rester absents : le fallback serveur `mock` est explicite. Le scénario mock
de la Phase 6 reste utilisable sans appel externe ni coût.

## Écarts et risques

1. Docker n’est pas installé/détecté : `npm run test:rls` ne peut pas utiliser PostgreSQL local. Le
   scénario RLS équivalent et sa régression Phase 5 sont toutefois validés sur le projet distant.
2. Les secrets serveur et OAuth ne sont pas encore fournis dans Vercel. La production peut afficher
   l’inbox mock, mais la connexion, la synchronisation et la livraison Gmail/Microsoft restent
   volontairement fermées.
3. Les applications Google Cloud et Microsoft Entra doivent déclarer les redirect URIs exactes.
   Gmail nécessite aussi un topic Pub/Sub et sa subscription push ; Microsoft nécessite les
   autorisations Graph et le callback webhook public.
4. Supabase Auth signale que la protection contre les mots de passe compromis est désactivée. Ce
   réglage doit être activé avant la production depuis les paramètres Auth.
5. Quatre RPC métier atomiques restent `SECURITY DEFINER` et exécutables par `authenticated` :
   inscription en campagne, opposition, association et classification d’un fil. Elles bloquent
   `anon` et vérifient l’organisation et le rôle en interne, mais restent signalées par le Security
   Advisor.
6. `npm audit` signale trois vulnérabilités connues dans l’arbre de dépendances, dont une modérée et
   deux élevées. Aucun `npm audit fix --force` n’a été appliqué afin d’éviter une mise à niveau
   cassante non revue.
7. Les valeurs commerciales des lieux, offres, entreprises, personas et recommandations sont des
   données de démonstration à valider, jamais des promesses définitives. Toutes les sociétés
   Explorer et tous les contacts Phase 5 sont fictifs.
8. Le mode aperçu sert au contrôle visuel uniquement et ne remplace pas une session Supabase.

## Plan des prochaines phases

1. **Phase 7** — opportunités et tâches ;
2. Phase 8 — dashboard métier, analytics et conformité ;
3. Phase 9 — durcissement production et E2E.

## Prochaine phase

**Phase 7 — Opportunités et tâches.** La prochaine intervention doit ajouter le pipeline, le
Kanban, les tâches, les rendez-vous, la proposition simple, le revenu pondéré et les automatisations
depuis l’inbox. Elle commencera par transformer une réponse positive qualifiée en opportunité
auditable, sans démarrer les analytics de Phase 8.

# SURFCE

SURFCE est un outil indépendant de prospection B2B et de CRM événementiel, conçu et dirigé pour
son propriétaire. Stargazing constitue son premier cas d’usage métier, sans définir la marque ni
la direction artistique de SURFCE.

Le dépôt couvre actuellement les **Phases 0 à 7** du cahier des charges : socle Next.js,
authentification Supabase SSR, organisations et rôles, registre des établissements, Explorer,
entreprises, enrichissement mock, personas, matching, contacts, campagnes, inbox connectable et
pipeline d’opportunités. Google Workspace et Microsoft 365 restent fermés tant que leurs secrets
OAuth ne sont pas configurés.

## Prérequis

- Node.js 20.9 ou supérieur ;
- npm 11 ou supérieur recommandé ;
- Docker Desktop pour exécuter Supabase localement ;
- un projet Supabase pour une connexion distante.

## Installation

```powershell
npm install
Copy-Item .env.example .env.local
```

Renseigner au minimum les deux variables publiques Supabase dans `.env.local` pour activer la
connexion. Sans elles, `/dashboard` reste disponible dans un mode aperçu strictement en lecture,
sans accès aux données.

```powershell
npm run dev
```

Ouvrir ensuite `http://localhost:3000/login`.

## Variables d’environnement

### Configuration publique des Phases 1 à 7

| Variable                        | Exposition | Usage                               |
| ------------------------------- | ---------- | ----------------------------------- |
| `NEXT_PUBLIC_APP_URL`           | Navigateur | URL canonique, optionnelle en local |
| `NEXT_PUBLIC_SUPABASE_URL`      | Navigateur | URL du projet Supabase              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Navigateur | Clé publique/anon protégée par RLS  |

Les deux variables Supabase sont requises pour l’authentification. L’URL canonique devient
obligatoire pour les callbacks OAuth et les webhooks Microsoft.

### Serveur Phase 6

| Variable                    |       Phase | Usage                                                  |
| --------------------------- | ----------: | ------------------------------------------------------ |
| `SUPABASE_SERVICE_ROLE_KEY` |           6 | Synchronisation et cron serveur, jamais dans le client |
| `SUPABASE_DATABASE_URL`     | Déploiement | Migrations automatisées                                |
| `APP_ENCRYPTION_KEY`        |           6 | AES-256-GCM des tokens OAuth                           |
| `CRON_SECRET`               |          5+ | Protection des trois routes planifiées                 |

Toutes les autres variables sont décrites dans `.env.example`. La carte Phase 3 utilise un style
vectoriel local. Les Phases 4 et 5 utilisent `AI_PROVIDER=mock`,
`COMPANY_REGISTRY_PROVIDER=mock`, `CONTACT_VERIFICATION_PROVIDER=mock` et `MAIL_PROVIDER=mock` par
défaut : aucune clé de carte, de registre, de vérification, d’enrichissement, d’IA ou de mail
externe n’est nécessaire. Les clés Gmail et Microsoft activent les connexions réelles ; elles ne
sont jamais nécessaires au parcours mock.

## Supabase local

Le schéma est versionné dans `supabase/migrations`. Aucune modification manuelle d’une base de
production n’est attendue.

```powershell
npx supabase start
npx supabase db reset
```

Le seed crée l’espace propriétaire `SURFCE`. Pour un test local :

1. créer un utilisateur `admin@surfce.local` depuis Supabase Studio ;
2. rejouer `supabase/seed.sql` dans la base locale afin de rattacher cet utilisateur comme
   administrateur ;
3. se connecter depuis `/login`.

Cette manipulation concerne uniquement le seed local. Sur un environnement partagé, les
migrations doivent être revues puis appliquées par la chaîne de déploiement.

## Authentification et autorisation

- `@supabase/ssr` conserve la session dans des cookies ;
- le proxy racine rafraîchit les jetons avant les composants serveur ;
- les contrôles d’interface utilisent la même matrice de rôles que les gardes serveur ;
- la base reste l’autorité finale grâce aux politiques RLS ;
- la clé `service_role` n’est chargée que par le client serveur des jobs de synchronisation et
  n’est jamais exposée à un composant client.

Routes actuellement disponibles :

- `/login` ;
- `/auth/callback` ;
- `/dashboard` ;
- `/settings/organization` ;
- `/settings/members` ;
- `/venues` ;
- `/venues/new` ;
- `/venues/[venueId]` ;
- `/venues/[venueId]/edit` ;
- `/venues/[venueId]/offers/new` ;
- `/venues/[venueId]/offers/[offerId]/edit` ;
- `/explore` ;
- `/explore/saved/[id]` ;
- `/companies` ;
- `/companies/[companyId]` ;
- `/companies/[companyId]/edit` ;
- `/contacts` ;
- `/contacts/[contactId]` ;
- `/campaigns` ;
- `/campaigns/new` ;
- `/campaigns/[campaignId]` ;
- `/campaigns/[campaignId]/edit` ;
- `/inbox` ;
- `/inbox/[threadId]` ;
- `/opportunities` ;
- `/opportunities/new` ;
- `/opportunities/[opportunityId]` ;
- `/opportunities/stages` ;
- `/settings/mailboxes` ;
- `/api/discovery/search`, `/import`, `/import-batch`, `/deduplicate` et `/saved` ;
- `/api/companies/[id]/enrich`, `/verify`, `/persona` et `/match-venues`.
- `/api/contacts/[id]/verify-email` et `/suppress` ;
- `/api/campaigns`, puis `/api/campaigns/[id]/enroll`, `/unenroll`, `/preview`, `/approve`,
  `/launch` et `/pause` ;
- `/api/messages/generate`, `/send-test` et `/send` ;
- `/api/mailboxes/[provider]/connect`, `/api/oauth/[provider]/callback`, synchronisation et
  déconnexion ;
- `/api/threads/[id]/summarize`, `/draft-reply`, `/reply`, `/associate` et `/read` ;
- `/api/threads/[id]/opportunity` ;
- `/api/opportunities`, puis `/api/opportunities/[id]`, `/stage`, `/tasks`, `/appointments` et
  `/proposals` ;
- `/api/tasks/[id]/status`, `/api/proposals/[id]/status` et `/api/opportunity-stages/[id]` ;
- `/api/messages/[id]/classify` ;
- `/api/webhooks/google/mail`, `/microsoft/mail` et `/provider/[provider]` ;
- `/api/cron/process-campaigns`, `/sync-mailboxes` et `/refresh-mail-watches`, fermées tant que
  `CRON_SECRET` n’est pas configuré.

## Établissements, offres et galerie

La Phase 2 livre :

- les filtres actifs, inactifs et tous ;
- le CRUD des établissements et des offres ;
- les validations de capacités, budgets, commissions et dates ;
- les permissions d’écriture pour `admin`, `venue_manager` et `marketing` ;
- le bucket privé `venue-assets` pour les visuels et PDF de 10 Mo maximum ;
- quatre lieux Stargazing et quatre offres de démonstration à valider.

Les fichiers sont servis par URL signée. La base et Storage contrôlent tous deux l’organisation et
le rôle de l’utilisateur.

## Explorer et entreprises

La Phase 3 livre :

- une carte MapLibre sans appel à un fond cartographique externe ;
- la recherche par texte, catégorie, arrondissement, rayon et polygone ;
- dix sociétés parisiennes explicitement fictives avec domaines `.example` ;
- une liste synchronisée, la sélection multiple et le détail rapide ;
- l’import unitaire ou par lot avec déduplication atomique ;
- les recherches sauvegardées et rejouables ;
- le registre, la fiche et l’édition qualifiée des entreprises ;
- la provenance générique par champ ;
- les recherches PostGIS sécurisées dans un rayon ou un GeoJSON polygonal.

Le code métier dépend de l’interface `PlaceSearchProvider`, pas du mock. Les futurs providers réels
pourront donc être ajoutés sans réécrire l’Explorer.

## Enrichissement, persona et matching

La Phase 4 livre :

- `MockCompanyRegistryProvider` et `MockWebsiteEnrichmentProvider`, sans trafic distant ;
- des jobs idempotents avec statut, limite de 5 essais, erreur et coût estimé ;
- une provenance par champ pour la vérification registre et l’analyse web simulée ;
- un persona JSON validé par Zod, versionné et explicitement limité aux sources disponibles ;
- les inconnues importantes à `null`, notamment le budget et les identifiants légaux absents ;
- une validation humaine du persona ;
- un score déterministe sur 100 avec 6 composantes conformes au cahier des charges ;
- jusqu’à 5 recommandations lieu + offre, une justification mock et la sélection humaine d’une
  piste ;
- un journal minimal `ai_runs` qui conserve provider, modèle, prompt et hash d’entrée.

La fiche entreprise utilise les onglets `Persona`, `Recommandations` et `Données et sources`. Les
actions restent réservées aux administrateurs, responsables commerciaux et commerciaux assignés.
Les autres rôles conservent un accès en lecture via RLS.

## Contacts et campagnes mock

La Phase 5 livre :

- quinze contacts professionnels fictifs sur des domaines `.example` ;
- un provider de vérification d’adresse mock et sa traçabilité dans `data_sources` ;
- une liste globale de suppression portant sur l’e-mail, le contact, la société ou le domaine ;
- une boîte d’expédition mock sans token OAuth ni livraison réelle ;
- la création d’une campagne et d’une séquence de quatre étapes à délais configurables ;
- exactement trois variantes IA mock par message, limitées aux faits référencés ;
- l’aperçu, la validation obligatoire du premier message, le lancement et la pause ;
- un calendrier `Europe/Paris`, limité aux jours et horaires ouvrés, avec jitter déterministe ;
- un contrôle atomique de l’opposition avant l’inscription et juste avant l’envoi ;
- une clé de déduplication unique et une RPC transactionnelle empêchant tout double envoi.

Le scénario complet s’exécute à coût nul. Les identifiants de message et de fil sont déterministes
et explicitement marqués `mock`. La route cron est protégée par `CRON_SECRET` et reste fail-closed
tant que ce secret n’est pas fourni.

## Gmail, Microsoft 365 et inbox

La Phase 6 livre :

- OAuth Authorization Code + PKCE avec état signé, callback lié à l’organisation et à
  l’utilisateur ;
- chiffrement AES-256-GCM des access/refresh tokens et suppression à la déconnexion ;
- renouvellement automatique des tokens, synchronisation Gmail History et Microsoft Graph Delta ;
- watches Gmail Pub/Sub et subscriptions Microsoft Graph avec routes webhook fail-closed ;
- normalisation des messages, HTML entrant assaini, déduplication provider et métadonnées de
  pièces jointes limitées à 25 Mo ;
- arrêt transactionnel des relances à toute réponse humaine et opposition automatique pour les
  désabonnements ;
- inbox filtrable, qualification manuelle, résumé structuré et suggestion de réponse mock ;
- réponse conservée dans le fil Gmail ou Microsoft, avec réservation locale idempotente ;
- crons autonomes utilisant uniquement le client serveur `service_role`.

Les callbacks de production sont :

- `https://surfce-gpt.vercel.app/api/oauth/google/callback` ;
- `https://surfce-gpt.vercel.app/api/oauth/microsoft/callback`.

Le parcours mock et les trois réponses fictives du seed restent disponibles sans secret externe.

## Opportunités et tâches

La Phase 7 livre :

- onze jalons configurables par organisation, de la cible détectée au dossier gagné ou perdu ;
- un pipeline horizontal et une vue registre, filtrables par commercial, étape et recherche ;
- le déplacement par glisser-déposer avec alternative clavier et motif obligatoire en cas de perte ;
- une fiche d’opportunité reliant entreprise, contact, établissement, offre, campagne et
  conversation source ;
- les montants estimé, proposé et signé, la probabilité et le revenu pondéré ;
- les tâches, rendez-vous et propositions versionnées avec historique automatique ;
- la création idempotente d’une opportunité depuis une réponse entrante qualifiée positive ;
- des permissions RLS multi-tenant et un audit avant/après des mutations métier.

Le seed ajoute cinq dossiers entièrement fictifs. Le pipeline de démonstration contient 30 445 €
pondérés en cours et 7 600 € gagnés.

## Qualité et tests

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Le test d’intégration RLS nécessite une base Supabase locale démarrée :

```powershell
npm run test:rls
```

Les scénarios vérifient notamment l’isolation entre organisations, les matrices de rôles des lieux,
entreprises, contacts et campagnes, l’import idempotent, la géométrie rayon/polygone, les jobs, le
persona Zod, le scoring explicable, la suppression, l’absence de double envoi, le chiffrement
OAuth, l’assainissement HTML, l’arrêt d’une campagne sur réponse, le calcul du revenu pondéré et
l’automatisation inbox → opportunité.

## Déploiement Vercel

1. importer le dépôt dans Vercel ;
2. configurer les variables Supabase de l’environnement cible ;
3. ajouter l’URL Vercel aux redirect URLs Supabase ;
4. exécuter les migrations via une étape contrôlée avant la mise en production ;
5. utiliser `npm run build` comme commande de build.

## Providers et messagerie

`MockPlacesProvider`, `MockCompanyRegistryProvider`, `MockWebsiteEnrichmentProvider`,
`MockContactVerificationProvider`, `MockMailProvider` et `MockAiProvider` sont implémentés derrière
des interfaces. Ils n’effectuent aucun appel distant et annoncent un coût nul. `GmailMailProvider`
et `MicrosoftMailProvider` implémentent désormais le même contrat ; ils restent inactifs sans
consentement OAuth. Places, SIRENE, Hunter, Dropcontact et OpenAI restent désactivés tant que leurs
clés et règles d’usage ne sont pas configurées.

## Limitations connues

- le jeu Explorer est fictif et limité à Paris tant qu’aucun provider réel n’est configuré ;
- les données commerciales Stargazing du seed doivent être vérifiées et complétées ;
- l’exécution pgTAP locale requiert Docker ;
- les RPC atomiques authentifiées sont volontairement `SECURITY DEFINER`, révoquées à `anon` et
  contrôlent rôle et organisation en interne ;
- l’URL publique est connue, mais les secrets OAuth, webhook, cron, chiffrement et service role
  doivent encore être ajoutés à l’environnement Vercel.

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) et
[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) pour l’état détaillé.

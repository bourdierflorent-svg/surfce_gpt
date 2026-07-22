# SURFCE

SURFCE est un outil indépendant de prospection B2B et de CRM événementiel, conçu et dirigé pour
son propriétaire. Stargazing constitue son premier cas d’usage métier, sans définir la marque ni
la direction artistique de SURFCE.

Le dépôt couvre actuellement les **Phases 0 à 4** du cahier des charges : socle Next.js,
authentification Supabase SSR, organisations et rôles, registre des établissements, Explorer,
entreprises, enrichissement mock, personas et matching. Aucun provider externe payant ni aucune
fonctionnalité de campagne n’est encore activé.

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

### Configuration publique des Phases 1 à 4

| Variable                        | Exposition | Usage                               |
| ------------------------------- | ---------- | ----------------------------------- |
| `NEXT_PUBLIC_APP_URL`           | Navigateur | URL canonique, optionnelle en local |
| `NEXT_PUBLIC_SUPABASE_URL`      | Navigateur | URL du projet Supabase              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Navigateur | Clé publique/anon protégée par RLS  |

Seules les deux variables Supabase sont requises pour l’authentification actuelle.

### Serveur, prévues pour les phases suivantes

| Variable                    |       Phase | Usage                                                    |
| --------------------------- | ----------: | -------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Jobs futurs | Administration serveur uniquement, jamais dans le client |
| `SUPABASE_DATABASE_URL`     | Déploiement | Migrations automatisées                                  |
| `APP_ENCRYPTION_KEY`        |           6 | Chiffrement des tokens OAuth                             |
| `CRON_SECRET`               |          5+ | Protection des routes planifiées                         |

Toutes les autres variables sont décrites dans `.env.example`. La carte Phase 3 utilise un style
vectoriel local. La Phase 4 utilise `AI_PROVIDER=mock` et `COMPANY_REGISTRY_PROVIDER=mock` par
défaut : aucune clé de carte, de registre, d’enrichissement ou d’IA externe n’est nécessaire. Les
clés Gmail, Microsoft et monitoring restent inutilisées.

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
- aucune clé `service_role` n’est référencée dans `src/`.

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
- `/api/discovery/search`, `/import`, `/import-batch`, `/deduplicate` et `/saved`.
- `/api/companies/[id]/enrich`, `/verify`, `/persona` et `/match-venues`.

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

Les scénarios vérifient notamment l’isolation entre organisations, les matrices de rôles des lieux
et entreprises, l’import idempotent, la géométrie rayon/polygone, les jobs, le persona Zod et le
scoring explicable.

## Déploiement Vercel

1. importer le dépôt dans Vercel ;
2. configurer les variables Supabase de l’environnement cible ;
3. ajouter l’URL Vercel aux redirect URLs Supabase ;
4. exécuter les migrations via une étape contrôlée avant la mise en production ;
5. utiliser `npm run build` comme commande de build.

## Providers et messagerie

`MockPlacesProvider`, `MockCompanyRegistryProvider`, `MockWebsiteEnrichmentProvider` et
`MockAiProvider` sont implémentés derrière des interfaces. Ils n’effectuent aucun appel distant et
annoncent un coût nul. Les implémentations réelles Places, SIRENE, Hunter, Dropcontact et OpenAI
restent désactivées tant que leurs clés et règles d’usage ne sont pas configurées. Gmail et
Microsoft 365 ne seront abordés qu’en Phase 6.

## Limitations connues

- le jeu Explorer est fictif et limité à Paris tant qu’aucun provider réel n’est configuré ;
- les données commerciales Stargazing du seed doivent être vérifiées et complétées ;
- l’exécution pgTAP locale requiert Docker ;
- `npm audit` signale actuellement des dépendances transitives de la dernière version stable de
  Next.js ; le détail et la stratégie sont suivis dans `IMPLEMENTATION_STATUS.md`.

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) et
[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) pour l’état détaillé.

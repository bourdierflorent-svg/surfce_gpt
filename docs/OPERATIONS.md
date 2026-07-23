# Exploitation SURFCE

Ce runbook couvre le MVP livré jusqu’à la Phase 9. Il décrit les contrôles applicatifs disponibles,
les signaux à surveiller et la conduite minimale d’un incident. Il ne remplace pas les procédures
de sauvegarde de Supabase ou de restauration Vercel.

## Sondes de santé

- `GET /api/health/live` vérifie que le processus Next.js répond. Une réponse `200` ne garantit pas
  que Supabase ou les secrets serveur sont configurés.
- `HEAD /api/health/live` fournit le même signal sans corps.
- `GET /api/health/ready` renvoie `200` lorsque la configuration publique Supabase est disponible,
  sinon `503`.
- La sonde `ready` expose uniquement des états `configured`, `closed`, `ok` ou `missing`. Elle ne
  renvoie jamais la valeur d’une clé.

Les deux routes désactivent le cache. Un identifiant `x-request-id` doit être présent sur chaque
réponse.

## Journaux structurés

Les journaux sont écrits en JSON sur la sortie standard et sont donc consultables dans les logs
Vercel. Les événements principaux sont :

- `application.started` et `next.request_error` ;
- `http.request`, `http.csrf_rejected` et `http.rate_limited` ;
- `provider.operation_started`, `provider.operation_succeeded`,
  `provider.operation_failed` et `provider.quota_blocked` ;
- `api.operation_failed`.

Un journal HTTP ou provider peut contenir `requestId`, `organizationId`, `userId`, `jobId`,
`provider`, `operation`, `durationMs`, `status` et `errorCode`. Les clés, tokens, cookies,
autorisations, corps, contenus et adresses e-mail sont filtrés. Ne jamais ajouter un payload brut
aux champs de log.

Pour remonter une requête :

1. relever `x-request-id` côté navigateur ou client ;
2. rechercher ce même identifiant dans les logs Vercel ;
3. corréler l’éventuel `jobId` avec `provider_jobs` ;
4. consulter `provider_usage_events` pour le statut et la durée, sans chercher de contenu métier.

## Quotas providers

`provider_quotas` contient les règles par organisation, provider et opération.
`provider_usage_events` conserve uniquement les métadonnées de réservation, résultat et durée.

Valeurs initiales par organisation :

| Provider           | Fenêtre | Maximum |
| ------------------ | ------- | ------- |
| règle de repli `*` | 60 s    | 60      |
| providers mock     | 60 s    | 600     |
| Google Workspace   | 60 s    | 120     |
| Microsoft 365      | 60 s    | 120     |

Une règle provider + opération précise est prioritaire sur un wildcard. La réservation est
atomique par verrou transactionnel PostgreSQL. Un dépassement direct renvoie `429` et
`Retry-After`. Un job provider est bloqué avant son démarrage.

Seul un administrateur SURFCE peut modifier les quotas de son organisation. Toute modification
doit être motivée, appliquée d’abord sur un environnement contrôlé et suivie dans la vigie
Analytics :

- nombre de quotas bloqués ;
- taux d’erreur provider ;
- durée moyenne provider.

## Protection HTTP

- CSP dynamique avec nonce, `frame-ancestors 'none'`, `object-src 'none'` et sources Supabase
  limitées ;
- HSTS, `nosniff`, anti-framing, politique de référent stricte et permissions navigateur réduites ;
- mutations navigateur protégées par vérification `Origin`/`Sec-Fetch-Site` ;
- callbacks cron et webhooks exclus de la vérification CSRF parce qu’ils appliquent leur propre
  signature ou secret ;
- limite par instance de 120 requêtes API/minute/adresse et 10 tentatives de connexion/minute ;
- réponses API privées non mises en cache.

Le rate limiting en mémoire est une première barrière par instance Vercel. Les quotas distribués
PostgreSQL constituent le verrou partagé pour les appels providers coûteux.

## Tests d’exploitation

Installation initiale du navigateur :

```powershell
npx playwright install chromium
```

Gate local :

```powershell
npm run check
npm run test:e2e
```

Le scénario authentifié demande des variables éphémères :

```powershell
$env:E2E_BASE_URL = "http://127.0.0.1:3000"
$env:E2E_USER_EMAIL = "<compte-de-test>"
$env:E2E_USER_PASSWORD = "<secret-ephemere>"
npm run test:e2e:authenticated
```

Ne jamais enregistrer ces valeurs dans Git ou dans l’environnement runtime Vercel. Le workflow
GitHub exécute le gate qualité et les E2E publics ; le rapport Playwright est conservé 14 jours.

## Conduite d’incident

1. confirmer `/api/health/live` puis `/api/health/ready` ;
2. relever l’heure, la route, l’organisation affectée et un `x-request-id` ;
3. vérifier les logs structurés, les quotas et les jobs sans exporter de donnée personnelle ;
4. si un provider réel est en cause, mettre en pause les campagnes ou déconnecter la boîte
   concernée avant toute relance ;
5. si l’intégrité ou l’isolation est douteuse, suspendre les écritures et ne pas contourner RLS ;
6. corriger par une nouvelle migration ou un nouveau commit, jamais en modifiant l’historique
   appliqué ;
7. rejouer lint, typecheck, tests, build, assertions SQL rollback-only et smoke tests ;
8. documenter la cause, l’impact, les données touchées et la décision de reprise.

## Rétention et confidentialité

La route `/api/cron/retention` exige `CRON_SECRET` et le client serveur privilégié. L’interface
permet uniquement une simulation. Une exécution réelle doit être précédée d’un rapport dry-run et
ne doit jamais supprimer la preuve d’opposition.

Les six RPC atomiques `SECURITY DEFINER` exposées aux utilisateurs authentifiés sont intentionnelles,
révoquées à `anon` et contrôlent rôle et organisation en interne. Elles doivent rester dans le
périmètre des assertions RLS distantes.

Voir aussi [la checklist de production](PRODUCTION_CHECKLIST.md) et
[l’architecture](ARCHITECTURE.md).

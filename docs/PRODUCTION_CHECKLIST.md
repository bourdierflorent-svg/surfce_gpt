# Checklist de production SURFCE

Cette liste sépare ce qui est validé dans le dépôt de ce qui exige encore une action sur Vercel,
Supabase Auth ou les consoles providers.

## Code et base — validé Phase 9

- [x] lint sans avertissement ;
- [x] typecheck strict ;
- [x] tests Vitest ;
- [x] format Prettier ;
- [x] build Next.js de production ;
- [x] E2E public : parcours mock, conformité, sondes, CSP et CSRF ;
- [x] E2E authentifié : connexion, parcours métier et blocage d’opposition ;
- [x] migrations Phase 9 appliquées au projet Supabase ;
- [x] 37 tables publiques avec RLS activée ;
- [x] assertions SQL Phase 9 exécutées dans une transaction annulée ;
- [x] aucune alerte Performance Advisor au-dessus du niveau informationnel ;
- [x] aucun nouveau warning Security Advisor introduit par les quotas.

## Variables Vercel — obligatoires pour le runtime complet

- [ ] `NEXT_PUBLIC_APP_URL=https://surfce-gpt.vercel.app` ;
- [ ] `NEXT_PUBLIC_SUPABASE_URL` ;
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` ;
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ;
- [ ] `APP_ENCRYPTION_KEY`, 32 octets aléatoires encodés en Base64 ;
- [ ] `CRON_SECRET`, distinct de toutes les autres clés.

Après modification, déclencher un nouveau déploiement afin que les variables publiques soient
intégrées au build.

## Supabase

- [x] migrations distantes à jour ;
- [x] quotas initiaux présents pour l’organisation SURFCE ;
- [x] `anon` ne peut pas exécuter les RPC de quotas ;
- [x] isolation inter-organisation testée ;
- [ ] activer la
      [protection contre les mots de passe compromis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) ;
- [ ] confirmer les redirect URLs Auth pour l’URL Vercel ;
- [ ] confirmer la politique de sauvegarde et tester une restauration contrôlée ;
- [ ] conserver une procédure documentée de rotation des clés.

Les six avertissements `SECURITY DEFINER` restants concernent des RPC métier atomiques
intentionnelles. Une modification de leurs grants, contrôles de rôle ou assertions RLS exige une
revue de sécurité.

## Crons

- [ ] configurer `/api/cron/process-campaigns` ;
- [ ] configurer `/api/cron/sync-mailboxes` ;
- [ ] configurer `/api/cron/refresh-mail-watches` ;
- [ ] configurer `/api/cron/retention` ;
- [ ] vérifier que chaque appel porte le secret attendu ;
- [ ] exécuter la rétention en mode simulation avant toute première exécution réelle.

## Providers externes — optionnels et fermés par défaut

Google Workspace :

- [ ] `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` ;
- [ ] redirect URI exacte ;
- [ ] topic Pub/Sub, subscription push et `GOOGLE_WEBHOOK_SECRET` ;
- [ ] consentement, scopes minimaux et compte de test validés.

Microsoft 365 :

- [ ] `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` et `MICROSOFT_TENANT_ID` ;
- [ ] redirect URI exacte ;
- [ ] permissions Graph minimales et `MICROSOFT_WEBHOOK_CLIENT_STATE` ;
- [ ] subscription et renouvellement validés.

Places, SIRENE, Hunter, Dropcontact et OpenAI restent désactivés tant que leurs coûts, conditions
d’usage, quotas et clés n’ont pas reçu une validation explicite. Le mode mock reste le fallback
attendu.

## Smoke test après déploiement

- [ ] `GET /api/health/live` répond `200` avec `x-request-id` ;
- [ ] `GET /api/health/ready` répond `200` ;
- [ ] les en-têtes CSP, HSTS, anti-framing et `nosniff` sont présents ;
- [ ] `/login` permet la connexion du compte propriétaire ;
- [ ] `/dashboard`, `/explore`, `/companies`, `/campaigns`, `/inbox`, `/opportunities`,
      `/analytics` et `/settings/compliance` s’ouvrent ;
- [ ] une mutation sans origine est refusée ;
- [ ] l’opposition empêche une inscription en campagne ;
- [ ] aucun secret, token, corps ou e-mail n’apparaît dans les logs ;
- [ ] les erreurs providers et quotas sont visibles dans la vigie sans donnée personnelle.

## Dépendances

`npm install` a signalé trois avis de sévérité élevée dans l’arbre de dépendances. Le détail complet
de `npm audit` n’a pas été récupéré dans cette intervention et aucun correctif forcé n’a été
appliqué. Avant le go-live :

- [ ] obtenir le rapport détaillé depuis un environnement autorisé ;
- [ ] identifier les paquets directs et transitifs concernés ;
- [ ] appliquer uniquement des mises à jour compatibles et rejouer tout le gate ;
- [ ] accepter explicitement ou bloquer le déploiement pour chaque avis restant.

## Go / no-go

Le code Phase 9 et le schéma sont prêts à être déployés. Le go-live fonctionnel reste **no-go** tant
que les variables runtime obligatoires, la protection Auth contre les mots de passe compromis et
la revue des avis npm ne sont pas clôturées.

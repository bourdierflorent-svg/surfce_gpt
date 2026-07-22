# SURFCE
## Cahier des charges produit et technique pour Codex

**Produit :** SURFCE  
**Propriétaire :** créateur de SURFCE  
**Premier cas d’usage :** activités Stargazing  
**Type de produit :** plateforme de prospection B2B, CRM événementiel et intelligence commerciale  
**Stack imposée :** Next.js sur Vercel + Supabase  
**Version du document :** 1.0  
**Date :** 22 juillet 2026  

---

# 0. Instructions générales pour Codex

Tu es le lead développeur full-stack chargé de construire **SURFCE**, un produit indépendant piloté par son propriétaire. Son premier cas d’usage est la prospection B2B pour les activités Stargazing, qui exploitent plusieurs clubs, restaurants et lieux événementiels. La marque et la direction artistique de SURFCE ne sont pas celles de Stargazing.

L’application doit permettre de :

1. rechercher des entreprises sur une carte à partir d’une catégorie et d’une zone ;
2. importer et enrichir les fiches des entreprises trouvées ;
3. récupérer les coordonnées professionnelles disponibles ;
4. générer un persona commercial événementiel fondé sur des données vérifiables ;
5. recommander le lieu et l’offre Stargazing les plus pertinents ;
6. générer des e-mails de prospection personnalisés ;
7. envoyer les e-mails depuis une boîte professionnelle connectée ;
8. suivre les réponses, les relances et les rendez-vous ;
9. transformer un prospect froid en opportunité commerciale ;
10. suivre les propositions, événements signés et revenus générés.

## 0.1 Règles de travail obligatoires

- Utiliser **TypeScript en mode strict**.
- Utiliser l’**App Router de Next.js**.
- Utiliser **Supabase Auth, PostgreSQL, Row Level Security, Storage et Realtime**.
- Activer **PostGIS** pour les données géographiques.
- Garder tous les secrets et tokens OAuth côté serveur.
- Ne jamais exposer la clé `service_role` au navigateur.
- Ne jamais inventer une donnée d’entreprise ou un contact.
- Enregistrer la source, la date de collecte et le niveau de confiance de chaque donnée enrichie.
- Distinguer explicitement :
  - les données vérifiées ;
  - les estimations ;
  - les déductions de l’IA ;
  - les données manquantes.
- Prévoir des fournisseurs externes interchangeables grâce à des interfaces/adapters.
- Ne pas scraper l’interface HTML de Google Maps.
- Ne pas envoyer d’e-mail de prospection sans contrôle des règles de suppression et d’opposition.
- Le premier e-mail d’une séquence doit être soumis à validation humaine dans le MVP.
- Arrêter automatiquement une séquence dès qu’une réponse humaine, une opposition ou une erreur permanente est détectée.
- Créer des migrations Supabase versionnées. Ne jamais modifier une base de production manuellement.
- Après chaque phase :
  - lancer le lint ;
  - lancer le typecheck ;
  - lancer les tests ;
  - corriger les erreurs ;
  - mettre à jour `IMPLEMENTATION_STATUS.md`.
- Lorsqu’une clé externe manque, créer un provider mock propre permettant de tester le produit localement.
- Ne pas tenter de développer tout le produit en une seule modification. Respecter l’ordre des phases défini dans ce document.

## 0.2 Livrables attendus

Le dépôt final doit contenir au minimum :

```text
README.md
IMPLEMENTATION_STATUS.md
.env.example
supabase/
  migrations/
  seed.sql
src/
  app/
  components/
  features/
  lib/
  providers/
  types/
  emails/
tests/
```

Le `README.md` doit expliquer :

- l’installation ;
- les variables d’environnement ;
- le lancement local ;
- les migrations Supabase ;
- le seed de démonstration ;
- la connexion Gmail ou Microsoft ;
- la configuration des providers de données ;
- le déploiement sur Vercel ;
- les limitations connues.

---

# 1. Vision produit

## 1.1 Problème à résoudre

Stargazing possède plusieurs clubs, restaurants et lieux événementiels. Le groupe souhaite prospecter des entreprises susceptibles d’organiser :

- des afterworks ;
- des dîners d’entreprise ;
- des cocktails ;
- des lancements de produit ;
- des soirées clients ;
- des soirées d’équipe ;
- des anniversaires d’entreprise ;
- des showcases ;
- des réservations de tables ;
- des privatisations partielles ou complètes ;
- des événements influenceurs, presse ou partenaires.

Aujourd’hui, la recherche, la qualification, la personnalisation des messages et le suivi commercial sont trop manuels et fragmentés.

SURFCE doit centraliser tout le cycle commercial.

## 1.2 Promesse produit

> **SURFCE trouve les bonnes entreprises, comprend leurs besoins probables, recommande le bon lieu Stargazing et accompagne la relation jusqu’à la réservation.**

## 1.3 Positionnement

SURFCE n’est pas un simple scraper de coordonnées.

SURFCE est à la fois :

- un explorateur cartographique B2B ;
- un outil d’enrichissement ;
- un CRM événementiel ;
- un assistant de prospection IA ;
- un moteur de recommandation de lieux ;
- un outil de suivi des conversations ;
- un pipeline commercial ;
- un tableau de bord de revenus.

## 1.4 Utilisateurs principaux

- Direction Stargazing ;
- responsable commercial ;
- commerciaux ;
- responsables de clubs ou restaurants ;
- équipe marketing ;
- administrateurs ;
- lecteurs internes.

---

# 2. Périmètre fonctionnel

## 2.1 MVP obligatoire

Le MVP doit couvrir un cycle complet :

1. authentification ;
2. organisation et rôles ;
3. gestion des établissements Stargazing ;
4. gestion des offres événementielles ;
5. carte de recherche d’entreprises ;
6. recherche par activité, adresse, zone, rayon ou polygone ;
7. import de sociétés ;
8. déduplication ;
9. enrichissement de la fiche ;
10. analyse du site officiel ;
11. contacts professionnels ;
12. persona événementiel généré par IA ;
13. recommandation d’établissements et d’offres ;
14. rédaction de trois variantes d’e-mail ;
15. validation humaine ;
16. connexion Gmail ou Microsoft 365 ;
17. envoi ;
18. synchronisation des réponses ;
19. classification automatique des réponses ;
20. séquence de relances ;
21. arrêt automatique en cas de réponse ou d’opposition ;
22. pipeline d’opportunités ;
23. tâches et rappels ;
24. tableau de bord ;
25. liste globale de suppression ;
26. historique et audit ;
27. seed de démonstration.

## 2.2 Hors MVP

À prévoir dans l’architecture, sans bloquer le MVP :

- enregistrement et transcription d’appels ;
- transcription de visioconférences ;
- scoring prédictif avancé ;
- recommandations basées sur l’historique complet de Club Manager ;
- génération automatique de devis complexes ;
- signature électronique ;
- téléphonie intégrée ;
- SMS ou WhatsApp ;
- campagnes massives ;
- tracking publicitaire ;
- réponse totalement autonome sans validation ;
- portail client ;
- application mobile native.

## 2.3 Principe de progression

Le MVP doit privilégier :

- des volumes raisonnables ;
- une forte personnalisation ;
- une validation humaine ;
- des données traçables ;
- une interface rapide ;
- une conformité intégrée dès le départ.

---

# 3. Identité et expérience utilisateur

## 3.1 Direction artistique

L’interface doit être :

- claire ;
- lumineuse ;
- sobre ;
- professionnelle ;
- simpliste ;
- dense sans être encombrée ;
- inspirée de la lisibilité d’un logiciel comme Workday ;
- distincte visuellement de Workday, sans copie de marque.

## 3.2 Principes visuels

- navigation latérale fixe ;
- barre supérieure avec recherche globale ;
- grands espaces blancs ;
- cartes aux bordures légères ;
- typographie lisible ;
- tableaux denses mais aérés ;
- filtres persistants ;
- statuts visibles ;
- actions principales toujours accessibles ;
- composants cohérents ;
- états de chargement avec skeletons ;
- messages d’erreur utiles ;
- navigation clavier ;
- contrastes accessibles.

## 3.3 Structure globale

```text
┌──────────────────────────────────────────────────────────────┐
│ Logo SURFCE | Recherche globale | Notifications | Profil    │
├───────────────┬──────────────────────────────────────────────┤
│ Navigation    │ Contenu principal                            │
│ latérale      │                                              │
│               │                                              │
│ Dashboard     │                                              │
│ Explorer      │                                              │
│ Entreprises   │                                              │
│ Contacts      │                                              │
│ Campagnes     │                                              │
│ Conversations │                                              │
│ Opportunités  │                                              │
│ Établissements│                                              │
│ Analyses      │                                              │
│ Paramètres    │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

## 3.4 Navigation principale

- `Accueil`
- `Explorer`
- `Entreprises`
- `Contacts`
- `Campagnes`
- `Conversations`
- `Opportunités`
- `Établissements`
- `Analyses`
- `Paramètres`

## 3.5 Responsive

- conception desktop-first ;
- tablette utilisable ;
- mobile permettant au minimum :
  - consulter une fiche ;
  - lire une conversation ;
  - changer un statut ;
  - ajouter une note ;
  - créer une tâche ;
  - voir le pipeline.

La carte complète et les tableaux avancés peuvent rester optimisés pour ordinateur.

---

# 4. Écrans et routes

## 4.1 Routes principales

```text
/
  redirection vers /dashboard ou /login

/login
/auth/callback

/dashboard

/explore
/explore/saved/[id]

/companies
/companies/[companyId]
/companies/[companyId]/edit

/contacts
/contacts/[contactId]

/campaigns
/campaigns/new
/campaigns/[campaignId]
/campaigns/[campaignId]/edit

/inbox
/inbox/[threadId]

/opportunities
/opportunities/[opportunityId]

/venues
/venues/new
/venues/[venueId]
/venues/[venueId]/edit

/analytics

/settings
/settings/organization
/settings/members
/settings/mailboxes
/settings/providers
/settings/ai
/settings/compliance
/settings/audit
```

---

# 5. Tableau de bord

## 5.1 Indicateurs principaux

Afficher sur une période configurable :

- entreprises découvertes ;
- entreprises importées ;
- entreprises enrichies ;
- entreprises qualifiées ;
- contacts disponibles ;
- e-mails envoyés ;
- taux de délivrabilité ;
- réponses ;
- réponses positives ;
- demandes de désinscription ;
- rendez-vous obtenus ;
- opportunités ouvertes ;
- propositions envoyées ;
- événements signés ;
- revenu prévisionnel ;
- revenu signé ;
- revenu réalisé ;
- taux de conversion par étape.

## 5.2 Bloc « À faire aujourd’hui »

Afficher :

- réponses non traitées ;
- relances arrivées à échéance ;
- fiches à valider ;
- contacts invalides à remplacer ;
- rendez-vous à préparer ;
- propositions sans réponse ;
- opportunités inactives ;
- événements à confirmer.

## 5.3 Blocs analytiques

- entonnoir commercial ;
- évolution hebdomadaire ;
- performance par commercial ;
- performance par campagne ;
- performance par secteur ;
- performance par arrondissement ;
- performance par établissement ;
- revenu potentiel par offre ;
- sources de données les plus efficaces.

---

# 6. Explorer : recherche cartographique

## 6.1 Objectif

Permettre à l’utilisateur de rechercher des entreprises sur une carte, comme dans un outil cartographique classique, puis de les importer dans SURFCE.

## 6.2 Modes de recherche

L’utilisateur peut :

- saisir une catégorie :
  - agence de communication ;
  - cabinet d’avocats ;
  - banque ;
  - cabinet de conseil ;
  - agence immobilière ;
  - startup ;
  - siège social ;
  - agence événementielle ;
  - entreprise de luxe ;
  - autre catégorie ;
- saisir une adresse ;
- sélectionner une ville ;
- sélectionner un arrondissement ;
- définir un rayon ;
- dessiner un polygone ;
- rechercher toutes les entreprises d’une zone ;
- utiliser une recherche texte libre ;
- sauvegarder une recherche.

## 6.3 Filtres

- secteur ;
- sous-secteur ;
- taille estimée ;
- distance ;
- site internet disponible ;
- téléphone disponible ;
- e-mail disponible ;
- contact nominatif disponible ;
- entreprise déjà présente ;
- entreprise déjà contactée ;
- statut commercial ;
- score de potentiel ;
- source ;
- date de dernière vérification ;
- ne pas contacter ;
- attribué à un commercial ;
- établissement recommandé.

## 6.4 Affichage

Disposition par défaut :

- 60 % carte ;
- 40 % liste synchronisée.

Fonctionnalités :

- clustering des points ;
- zoom automatique ;
- pagination ou chargement progressif ;
- sélection multiple ;
- panneau de détail rapide ;
- import unitaire ;
- import en lot ;
- déduplication avant import ;
- indication claire du coût potentiel d’un enrichissement externe ;
- compteur des résultats ;
- compteur des éléments sélectionnés.

## 6.5 États des points

Les couleurs exactes sont définies dans les tokens de design, mais les états doivent être distincts :

- entreprise trouvée ;
- entreprise importée ;
- entreprise enrichie ;
- persona généré ;
- contactée ;
- réponse positive ;
- opportunité ;
- gagnée ;
- refus ;
- opposition ;
- forte priorité.

## 6.6 Carte rapide d’une entreprise

Afficher :

- nom ;
- activité ;
- adresse ;
- distance ;
- téléphone ;
- site ;
- e-mail disponible ou non ;
- taille estimée ;
- score ;
- établissement recommandé ;
- statut ;
- bouton `Importer` ou `Ouvrir la fiche`.

## 6.7 Règles de recherche

- ne jamais importer automatiquement toutes les données sans action utilisateur ;
- toujours afficher la source ;
- détecter les doublons ;
- normaliser les domaines et numéros ;
- ne pas considérer deux établissements physiques comme deux sociétés indépendantes sans vérification ;
- conserver les établissements secondaires lorsqu’ils sont commercialement utiles.

---

# 7. Fiche entreprise

## 7.1 Onglets

- Vue générale
- Contacts
- Persona
- Recommandations
- Conversations
- Opportunités
- Activités
- Documents
- Données et sources
- Historique

## 7.2 Données générales

- raison sociale ;
- nom commercial ;
- SIREN ;
- SIRET principal ;
- forme juridique ;
- activité ;
- code d’activité ;
- description ;
- adresse ;
- géolocalisation ;
- arrondissement ;
- site ;
- domaine ;
- téléphone ;
- e-mail générique ;
- réseaux sociaux ;
- effectif estimé ;
- tranche de chiffre d’affaires si disponible ;
- établissements secondaires ;
- statut de qualification ;
- responsable commercial ;
- tags ;
- score global ;
- date de dernière vérification ;
- indicateur `ne pas contacter`.

## 7.3 Colonne de synthèse

Toujours afficher :

- score de potentiel ;
- niveau de confiance ;
- statut ;
- prochaine action ;
- commercial responsable ;
- lieu recommandé ;
- offre recommandée ;
- valeur estimée ;
- dernière interaction ;
- jours depuis la dernière interaction.

## 7.4 Provenance

Chaque champ enrichi doit pouvoir afficher :

- provider ;
- URL ou référence ;
- date de collecte ;
- date de vérification ;
- score de confiance ;
- valeur brute ;
- valeur normalisée ;
- caractère vérifié, estimé ou déduit.

## 7.5 Déduplication

Comparer au minimum :

- SIREN ;
- SIRET ;
- domaine ;
- téléphone ;
- nom normalisé + adresse ;
- identifiant provider externe.

Permettre :

- la fusion ;
- le rejet ;
- la conservation comme établissement secondaire ;
- l’annulation d’une fusion récente par un administrateur.

---

# 8. Contacts

## 8.1 Types de contacts recherchés

Prioriser :

- Office Manager ;
- Responsable Communication ;
- Responsable Événementiel ;
- Responsable Marketing ;
- Responsable RH ;
- Responsable Partenariats ;
- Direction Générale ;
- Assistante de direction ;
- Responsable Expérience Collaborateur ;
- Responsable Relations Presse ;
- Responsable Hospitality.

## 8.2 Données contact

- prénom ;
- nom ;
- fonction ;
- département ;
- e-mail professionnel ;
- téléphone professionnel ;
- profil professionnel ;
- source ;
- statut de vérification ;
- score de confiance ;
- consentement ou base légale renseignée ;
- opposition ;
- date de dernière interaction ;
- responsable interne ;
- tags.

## 8.3 Statuts

- à vérifier ;
- valide ;
- risqué ;
- invalide ;
- quitté l’entreprise ;
- mauvais interlocuteur ;
- ne pas contacter.

## 8.4 Enrichissement

Ordre recommandé :

1. site officiel ;
2. page contact ;
3. page équipe ;
4. mentions légales ;
5. données publiques ou professionnelles autorisées ;
6. provider d’enrichissement de domaine ;
7. provider d’enrichissement nominatif ;
8. validation de l’e-mail.

Ne jamais afficher un e-mail supposé comme vérifié.

---

# 9. Persona entreprise

## 9.1 Objectif

Créer un persona commercial événementiel exploitable, et non un texte marketing générique.

## 9.2 Entrées possibles

- secteur ;
- taille ;
- localisation ;
- description ;
- actualités ou signaux autorisés ;
- site internet ;
- pages publiques ;
- services ;
- culture d’entreprise visible ;
- historique de contact ;
- anciens événements ;
- recommandations déjà acceptées ;
- données internes Stargazing ;
- distance aux établissements.

## 9.3 Sortie structurée

Utiliser une sortie JSON validée par Zod.

```json
{
  "company_type": "Agence de communication",
  "summary": "Agence parisienne spécialisée dans les campagnes de marque et l'événementiel.",
  "estimated_size": {
    "label": "20 à 50 collaborateurs",
    "confidence": 0.78
  },
  "event_maturity": {
    "level": "high",
    "confidence": 0.72
  },
  "probable_needs": [
    {
      "type": "afterwork",
      "confidence": 0.84,
      "reason": "Équipe de taille intermédiaire et activité orientée clients."
    }
  ],
  "likely_contact_roles": [
    "Office Manager",
    "Responsable Communication"
  ],
  "recommended_event_types": [
    "Afterwork",
    "Soirée clients",
    "Lancement de produit"
  ],
  "estimated_guest_range": {
    "min": 20,
    "max": 60,
    "confidence": 0.58
  },
  "estimated_budget_range": {
    "min": 2500,
    "max": 9000,
    "currency": "EUR",
    "confidence": 0.42
  },
  "fit_score": 84,
  "confidence": 0.71,
  "risks": [
    "Budget non vérifié"
  ],
  "evidence": [
    {
      "claim": "L'entreprise organise probablement des événements clients.",
      "source_type": "website",
      "source_reference": "company-source-id",
      "confidence": 0.68
    }
  ]
}
```

## 9.4 Règles IA

- ne jamais transformer une hypothèse en fait ;
- ne jamais inventer un effectif précis ;
- ne jamais inventer une personne ;
- ne jamais inventer un budget ;
- retourner `null` lorsque la donnée est inconnue ;
- fournir un niveau de confiance ;
- citer les `source_reference` fournies ;
- limiter les conclusions aux données d’entrée ;
- versionner le persona ;
- conserver le modèle et la version du prompt ;
- permettre une régénération ;
- permettre une validation humaine.

---

# 10. Établissements Stargazing

## 10.1 Exemples de seed

Créer des exemples éditables, sans considérer les valeurs commerciales comme définitives :

- Little Room ;
- Deflower ;
- Fresh Touch ;
- Giulia ;
- autres lieux à ajouter par l’administrateur.

## 10.2 Données d’un établissement

- nom ;
- type ;
- description ;
- adresse ;
- géolocalisation ;
- quartier ;
- ambiance ;
- standing ;
- capacité assise ;
- capacité debout ;
- capacité minimale ;
- horaires ;
- jours disponibles ;
- restauration ;
- bar ;
- cocktails ;
- terrasse ;
- scène ;
- DJ ;
- sonorisation ;
- lumière ;
- écrans ;
- vestiaire ;
- accessibilité ;
- parking ou voiturier ;
- privatisation totale ;
- privatisation partielle ;
- minimum de consommation ;
- budget minimum ;
- catégories d’événements ;
- secteurs d’entreprises privilégiés ;
- mots-clés ;
- contact interne ;
- statut actif ;
- galerie ;
- brochure ;
- conditions commerciales.

## 10.3 Offres

Une offre contient :

- nom ;
- établissement ;
- type d’événement ;
- résumé ;
- description ;
- nombre minimum de personnes ;
- nombre maximum ;
- budget minimum ;
- prix indicatif ;
- inclusions ;
- options ;
- horaires ;
- jours applicables ;
- durée ;
- commission éventuelle ;
- conditions ;
- visuels ;
- brochure ;
- statut ;
- date de validité.

## 10.4 Exemples d’offres

- afterwork 20 à 50 personnes ;
- espace réservé ;
- cocktail dînatoire ;
- dîner suivi d’une soirée ;
- lancement de produit ;
- showcase privé ;
- tables VIP entreprise ;
- privatisation partielle ;
- privatisation complète ;
- soirée clients ;
- événement presse ou influenceurs.

---

# 11. Moteur de recommandation

## 11.1 Objectif

Recommander le meilleur couple :

```text
Entreprise + contexte → Établissement + offre
```

## 11.2 Première version déterministe

Le score doit rester explicable.

Pondération initiale :

| Critère | Poids |
|---|---:|
| Compatibilité type d’événement | 30 |
| Compatibilité capacité et budget | 20 |
| Proximité géographique | 15 |
| Compatibilité image et ambiance | 15 |
| Disponibilité et temporalité | 10 |
| Historique et engagement | 10 |

Score total sur 100.

## 11.3 Ajustements

- impossible si capacité incompatible ;
- forte pénalité si budget estimé très inférieur ;
- pénalité si lieu indisponible ;
- bonus si historique positif ;
- bonus si entreprise déjà cliente du groupe ;
- bonus si distance faible ;
- pénalité si l’offre a déjà été refusée ;
- exclusion si l’entreprise ou le contact est supprimé de la prospection.

## 11.4 Rôle de l’IA

L’IA peut :

- rédiger le raisonnement commercial ;
- expliquer le score ;
- suggérer l’angle de message ;
- proposer une alternative ;
- signaler les informations manquantes.

L’IA ne doit pas remplacer les règles bloquantes.

## 11.5 Sortie

```json
{
  "company_id": "uuid",
  "venue_id": "uuid",
  "offer_id": "uuid",
  "score": 87,
  "score_breakdown": {
    "event_fit": 28,
    "capacity_budget_fit": 17,
    "distance_fit": 14,
    "brand_fit": 13,
    "availability_fit": 7,
    "history_fit": 8
  },
  "reasons": [
    "Lieu proche du siège",
    "Format adapté à 30-50 personnes",
    "Ambiance cohérente avec une agence créative"
  ],
  "risks": [
    "Budget non confirmé"
  ],
  "recommended_pitch": "Afterwork premium avec espace réservé et prolongation en soirée."
}
```

---

# 12. Campagnes et séquences

## 12.1 Création d’une campagne

Étapes :

1. nom ;
2. objectif ;
3. établissement ;
4. offre ;
5. segment ;
6. expéditeur ;
7. ton ;
8. langue ;
9. séquence ;
10. horaires d’envoi ;
11. règles d’arrêt ;
12. validation ;
13. lancement.

## 12.2 Segmentation

Exemples :

- agences de communication du 8e ;
- cabinets d’avocats de plus de 20 salariés ;
- entreprises à moins de 3 km de Deflower ;
- entreprises disposant d’un Office Manager ;
- sociétés non contactées depuis six mois ;
- clients ayant déjà organisé un afterwork ;
- prospects ayant répondu positivement sans rendez-vous.

## 12.3 Séquence MVP

Séquence paramétrable :

- J0 : premier message ;
- J+3 à J+5 : relance courte ;
- J+7 à J+10 : proposition de valeur ou exemple d’offre ;
- J+14 : fermeture polie.

Ne jamais coder les délais en dur.

## 12.4 Règles d’arrêt

Arrêter immédiatement si :

- réponse humaine ;
- demande d’opposition ;
- désinscription ;
- adresse invalide permanente ;
- contact marqué `do_not_contact` ;
- rendez-vous créé ;
- opportunité ouverte avec règle d’arrêt ;
- campagne mise en pause ;
- boîte de l’expéditeur déconnectée ;
- limite d’envoi atteinte.

## 12.5 États d’une inscription

- draft ;
- pending_approval ;
- scheduled ;
- active ;
- replied ;
- interested ;
- not_interested ;
- unsubscribed ;
- bounced ;
- paused ;
- completed ;
- stopped.

## 12.6 Limites MVP

- faible volume ;
- limites quotidiennes configurables ;
- délai aléatoire raisonnable entre envois ;
- aucun envoi nocturne ;
- fuseau horaire de l’organisation ;
- pas de campagne massive en un clic ;
- validation humaine du premier message ;
- aperçu obligatoire.

---

# 13. Génération des e-mails par IA

## 13.1 Données d’entrée

- entreprise ;
- contact ;
- persona ;
- établissement recommandé ;
- offre ;
- historique ;
- ton ;
- objectif ;
- contraintes ;
- signature ;
- langue.

## 13.2 Variantes obligatoires

Générer :

1. `directe et commerciale` ;
2. `premium et événementielle` ;
3. `relationnelle et personnalisée`.

## 13.3 Format de sortie

```json
{
  "variants": [
    {
      "label": "Directe",
      "subject": "Une idée d'afterwork pour votre équipe",
      "body_text": "Bonjour ...",
      "body_html": "<p>Bonjour ...</p>",
      "personalization_facts": [
        {
          "fact": "Entreprise située dans le 8e",
          "source_reference": "company-source-id"
        }
      ],
      "risk_flags": []
    }
  ],
  "recommended_variant": 0,
  "reason": "Message court adapté à un premier contact.",
  "missing_information": []
}
```

## 13.4 Contraintes rédactionnelles

- message court ;
- pas de flatterie artificielle ;
- pas de fausse familiarité ;
- pas d’affirmation non vérifiée ;
- pas de pression ;
- identité claire de l’expéditeur ;
- raison du contact liée à l’activité professionnelle ;
- appel à l’action simple ;
- mécanisme d’opposition ;
- pas de promesse mensongère ;
- pas de fausse urgence ;
- pas de sujet trompeur ;
- pas de pièces jointes lourdes au premier contact par défaut.

## 13.5 Éditeur

Permettre :

- édition manuelle ;
- changement de ton ;
- raccourcissement ;
- reformulation ;
- changement de lieu ;
- changement d’offre ;
- ajout d’une brochure ;
- envoi test ;
- programmation ;
- validation interne ;
- sauvegarde comme modèle.

---

# 14. Messagerie et synchronisation

## 14.1 Providers

Prévoir deux adapters :

- Gmail / Google Workspace ;
- Microsoft 365 / Outlook.

Interface commune :

```ts
export interface MailProvider {
  connect(input: ConnectMailboxInput): Promise<MailboxConnection>;
  refresh(connectionId: string): Promise<void>;
  send(input: SendMessageInput): Promise<SentMessage>;
  getThread(threadId: string): Promise<MailThread>;
  listChanges(cursor?: string): Promise<MailChangePage>;
  watch(input: WatchMailboxInput): Promise<WatchResult>;
  stopWatch(connectionId: string): Promise<void>;
}
```

## 14.2 Données à synchroniser

- message ID provider ;
- thread ID provider ;
- expéditeur ;
- destinataires ;
- copie ;
- sujet ;
- texte ;
- HTML nettoyé ;
- date ;
- direction ;
- pièces jointes ;
- statut ;
- erreur ;
- relation avec campagne ;
- relation avec entreprise ;
- relation avec contact ;
- relation avec opportunité.

## 14.3 Inbox SURFCE

Fonctionnalités :

- liste des conversations ;
- filtres ;
- recherche ;
- non lus ;
- priorité ;
- classification ;
- résumé IA ;
- réponse suggérée ;
- création de tâche ;
- création d’opportunité ;
- association manuelle ;
- correction de classification.

## 14.4 Classification des réponses

Valeurs :

- interested ;
- asks_information ;
- asks_price ;
- asks_callback ;
- asks_later ;
- referral ;
- wrong_person ;
- not_interested ;
- unsubscribe ;
- out_of_office ;
- bounce ;
- neutral ;
- unknown.

## 14.5 Résumé IA

Extraire :

- résumé ;
- intention ;
- besoin ;
- date ;
- nombre de participants ;
- budget ;
- lieu évoqué ;
- objections ;
- interlocuteurs ;
- engagements ;
- prochaines actions ;
- niveau de confiance.

---

# 15. CRM et opportunités

## 15.1 Pipeline

Étapes par défaut :

1. cible détectée ;
2. entreprise enrichie ;
3. prospect qualifié ;
4. contacté ;
5. engagé ;
6. rendez-vous ;
7. proposition envoyée ;
8. négociation ;
9. événement confirmé ;
10. gagné ;
11. perdu.

Les étapes doivent être configurables par organisation.

## 15.2 Données d’une opportunité

- titre ;
- entreprise ;
- contact principal ;
- établissement ;
- offre ;
- commercial ;
- étape ;
- probabilité ;
- montant estimé ;
- montant proposé ;
- montant signé ;
- devise ;
- nombre de participants ;
- type d’événement ;
- date souhaitée ;
- date estimée de clôture ;
- origine ;
- campagne ;
- objections ;
- prochaine action ;
- motif de perte ;
- notes ;
- pièces jointes ;
- proposition ;
- historique.

## 15.3 Vue pipeline

- Kanban ;
- vue tableau ;
- filtres ;
- glisser-déposer ;
- total par colonne ;
- revenu pondéré ;
- alertes d’inactivité ;
- indicateur de prochaine action.

## 15.4 Automatisations

- réponse positive → proposer la création d’opportunité ;
- demande de prix → priorité haute ;
- nombre de personnes détecté → préremplir l’opportunité ;
- date détectée → préremplir la date ;
- proposition envoyée → changer d’étape ;
- événement confirmé → marquer gagné ;
- opposition → arrêter toutes les campagnes.

---

# 16. Conversation Intelligence

## 16.1 Nom produit

Utiliser :

- `Mémoire commerciale SURFCE`
- ou `SURFCE Conversation Intelligence`

Ne pas présenter la fonctionnalité comme une écoute cachée.

## 16.2 MVP

Analyser uniquement :

- e-mails synchronisés ;
- notes saisies ;
- comptes rendus ;
- notes vocales volontairement ajoutées ;
- documents ;
- rendez-vous ;
- événements du CRM.

## 16.3 Version ultérieure

Lorsqu’un enregistrement est autorisé et signalé :

- importer un fichier audio ;
- transcription ;
- diarisation ;
- résumé ;
- extraction des besoins ;
- objections ;
- actions ;
- e-mail de suivi ;
- mise à jour du CRM.

## 16.4 Règles

- désactivé par défaut ;
- information claire ;
- consentement ou base légale documentée ;
- durée de conservation configurable ;
- suppression ;
- accès limité ;
- aucune écoute permanente ;
- journal d’accès.

---

# 17. Architecture technique

## 17.1 Front-end

- Next.js App Router ;
- TypeScript strict ;
- Tailwind CSS ;
- composants accessibles de type shadcn/ui ;
- React Hook Form ;
- Zod ;
- gestion de cache et mutations structurée ;
- MapLibre pour la carte ;
- composants serveur par défaut ;
- composants client uniquement lorsque nécessaire ;
- Server Actions ou Route Handlers selon le besoin.

## 17.2 Back-end

- Supabase Auth ;
- PostgreSQL ;
- PostGIS ;
- Row Level Security ;
- Storage ;
- Realtime ;
- Edge Functions si nécessaire ;
- tâches planifiées ;
- files de traitement ;
- webhooks ;
- pgvector facultatif après le MVP.

## 17.3 Hébergement

- front-end et routes Next.js : Vercel ;
- base, auth, stockage et fonctions : Supabase ;
- providers externes via APIs serveur ;
- aucune clé sensible dans le bundle client.

## 17.4 Structure recommandée

```text
src/
  app/
    (auth)/
    (app)/
      dashboard/
      explore/
      companies/
      contacts/
      campaigns/
      inbox/
      opportunities/
      venues/
      analytics/
      settings/
    api/
      providers/
      webhooks/
      cron/
  components/
    ui/
    layout/
    map/
    tables/
    forms/
    charts/
  features/
    auth/
    organizations/
    venues/
    companies/
    contacts/
    discovery/
    enrichment/
    personas/
    matching/
    campaigns/
    messaging/
    opportunities/
    analytics/
    compliance/
  lib/
    supabase/
    auth/
    permissions/
    validation/
    errors/
    logging/
    rate-limit/
    encryption/
    dates/
    geo/
    ai/
  providers/
    places/
      types.ts
      mock.ts
      overture.ts
      google-places.ts
    registries/
      types.ts
      mock.ts
      sirene.ts
    enrichment/
      types.ts
      website.ts
      hunter.ts
      dropcontact.ts
    mail/
      types.ts
      gmail.ts
      microsoft.ts
      mock.ts
    ai/
      types.ts
      provider.ts
  emails/
    templates/
  types/
  tests/
```

## 17.5 Couche provider

Chaque intégration doit respecter une interface.

Exemple :

```ts
export type SourceConfidence = "low" | "medium" | "high";

export interface SourcedValue<T> {
  value: T | null;
  provider: string;
  externalReference?: string;
  sourceUrl?: string;
  collectedAt: string;
  lastVerifiedAt?: string;
  confidence: number;
  isInferred: boolean;
}

export interface PlaceSearchProvider {
  search(input: PlaceSearchInput): Promise<PlaceSearchResult>;
  getDetails(externalId: string): Promise<PlaceDetails | null>;
}
```

Le code métier ne doit pas dépendre directement d’un provider.

---

# 18. Variables d’environnement

Créer `.env.example`.

```bash
# Application
NEXT_PUBLIC_APP_URL=
APP_ENCRYPTION_KEY=
CRON_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DATABASE_URL=

# AI
AI_PROVIDER=
OPENAI_API_KEY=
AI_DEFAULT_MODEL=

# Map
NEXT_PUBLIC_MAP_STYLE_URL=
MAP_TILES_API_KEY=

# Places
PLACES_PROVIDER=mock
GOOGLE_MAPS_API_KEY=
OVERTURE_DATA_URL=

# Company registry
COMPANY_REGISTRY_PROVIDER=mock
SIRENE_API_KEY=
SIRENE_API_BASE_URL=

# Enrichment
HUNTER_API_KEY=
DROPCONTACT_API_KEY=

# Gmail
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Microsoft
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
MICROSOFT_REDIRECT_URI=

# Optional monitoring
SENTRY_DSN=
```

Ne jamais committer de vraie valeur.

---

# 19. Modèle de données Supabase

## 19.1 Extensions

Activer :

```sql
create extension if not exists pgcrypto;
create extension if not exists postgis;
create extension if not exists vector;
```

`vector` peut rester inutilisé dans le MVP.

## 19.2 Conventions

- clés primaires UUID ;
- `created_at timestamptz not null default now()` ;
- `updated_at timestamptz not null default now()` ;
- `organization_id` sur toutes les données métier ;
- suppression logique uniquement lorsque nécessaire ;
- index sur les clés étrangères ;
- index géographique GIST ;
- index sur domaine, SIREN, e-mail normalisé ;
- JSONB uniquement pour les données réellement flexibles ;
- colonnes explicites pour les éléments requêtés souvent.

## 19.3 Tables principales

### `organizations`

```text
id uuid pk
name text
slug text unique
timezone text default 'Europe/Paris'
settings jsonb
created_at
updated_at
```

### `profiles`

```text
id uuid pk references auth.users
full_name text
email text
avatar_url text
created_at
updated_at
```

### `memberships`

```text
id uuid pk
organization_id uuid fk
user_id uuid fk
role app_role
is_active boolean
created_at
updated_at
unique (organization_id, user_id)
```

Rôles :

```text
admin
direction
sales_manager
sales
venue_manager
marketing
viewer
```

### `venues`

```text
id uuid pk
organization_id uuid fk
name text
slug text
venue_type text
description text
address_line1 text
address_line2 text
postal_code text
city text
country_code text
location geography(Point, 4326)
district text
standing text
atmosphere text
capacity_seated integer
capacity_standing integer
minimum_guests integer
minimum_spend numeric
currency text
features jsonb
event_types text[]
target_sectors text[]
opening_rules jsonb
is_active boolean
created_at
updated_at
```

### `venue_offers`

```text
id uuid pk
organization_id uuid fk
venue_id uuid fk
name text
slug text
event_type text
short_description text
description text
min_guests integer
max_guests integer
minimum_budget numeric
indicative_price numeric
currency text
duration_minutes integer
available_days integer[]
available_time_start time
available_time_end time
inclusions jsonb
options jsonb
terms text
valid_from date
valid_until date
is_active boolean
created_at
updated_at
```

### `venue_assets`

```text
id uuid pk
organization_id uuid fk
venue_id uuid fk
offer_id uuid nullable fk
asset_type text
storage_path text
title text
sort_order integer
is_public boolean
created_at
```

### `saved_searches`

```text
id uuid pk
organization_id uuid fk
created_by uuid fk
name text
query text
category text
center geography(Point, 4326)
radius_meters integer
area geography(Polygon, 4326)
filters jsonb
result_count integer
last_run_at timestamptz
created_at
updated_at
```

### `companies`

```text
id uuid pk
organization_id uuid fk
legal_name text
trade_name text
normalized_name text
siren text
primary_siret text
legal_form text
sector text
subsector text
activity_code text
description text
website_url text
domain text
phone text
generic_email text
linkedin_url text
instagram_url text
employee_range text
revenue_range text
address_line1 text
address_line2 text
postal_code text
city text
country_code text
location geography(Point, 4326)
district text
status company_status
qualification_score integer
data_quality_score integer
assigned_to uuid nullable
do_not_contact boolean default false
do_not_contact_reason text
last_verified_at timestamptz
last_contacted_at timestamptz
next_action_at timestamptz
tags text[]
created_at
updated_at
deleted_at timestamptz nullable
```

### `company_locations`

```text
id uuid pk
organization_id uuid fk
company_id uuid fk
label text
siret text
address_line1 text
postal_code text
city text
country_code text
location geography(Point, 4326)
is_headquarters boolean
source_id uuid nullable
created_at
updated_at
```

### `data_sources`

Table générique de provenance.

```text
id uuid pk
organization_id uuid fk
entity_type text
entity_id uuid
field_name text
provider text
external_reference text
source_url text
raw_value jsonb
normalized_value jsonb
collected_at timestamptz
last_verified_at timestamptz
confidence numeric
is_inferred boolean
metadata jsonb
created_at
```

### `contacts`

```text
id uuid pk
organization_id uuid fk
company_id uuid fk
first_name text
last_name text
full_name text
job_title text
department text
email text
normalized_email text
email_status text
phone text
linkedin_url text
contact_status text
confidence numeric
lawful_basis text
do_not_contact boolean default false
do_not_contact_reason text
assigned_to uuid nullable
last_contacted_at timestamptz
last_replied_at timestamptz
tags text[]
created_at
updated_at
deleted_at timestamptz nullable
```

### `personas`

```text
id uuid pk
organization_id uuid fk
company_id uuid fk
version integer
status text
summary text
company_type text
event_maturity text
estimated_size jsonb
probable_needs jsonb
likely_contact_roles text[]
recommended_event_types text[]
estimated_guest_range jsonb
estimated_budget_range jsonb
fit_score integer
confidence numeric
risks jsonb
evidence jsonb
input_snapshot jsonb
model_provider text
model_name text
prompt_version text
validated_by uuid nullable
validated_at timestamptz nullable
created_at
```

### `venue_matches`

```text
id uuid pk
organization_id uuid fk
company_id uuid fk
persona_id uuid nullable fk
venue_id uuid fk
offer_id uuid nullable fk
score integer
score_breakdown jsonb
reasons jsonb
risks jsonb
recommended_pitch text
model_version text
is_selected boolean
created_at
updated_at
```

### `mailboxes`

```text
id uuid pk
organization_id uuid fk
user_id uuid fk
provider text
provider_account_id text
email_address text
display_name text
encrypted_access_token text
encrypted_refresh_token text
token_expires_at timestamptz
sync_cursor text
watch_expires_at timestamptz
status text
daily_send_limit integer
sent_today integer
last_sync_at timestamptz
created_at
updated_at
```

### `campaigns`

```text
id uuid pk
organization_id uuid fk
name text
description text
status campaign_status
venue_id uuid nullable fk
offer_id uuid nullable fk
mailbox_id uuid fk
segment_definition jsonb
language text
tone text
daily_limit integer
send_window jsonb
stop_rules jsonb
requires_first_message_approval boolean default true
created_by uuid fk
approved_by uuid nullable
approved_at timestamptz nullable
launched_at timestamptz nullable
created_at
updated_at
```

### `sequence_steps`

```text
id uuid pk
organization_id uuid fk
campaign_id uuid fk
position integer
delay_days integer
delay_hours integer
step_type text
subject_template text
body_template_text text
body_template_html text
ai_instructions text
requires_approval boolean
is_active boolean
created_at
updated_at
unique (campaign_id, position)
```

### `campaign_enrollments`

```text
id uuid pk
organization_id uuid fk
campaign_id uuid fk
company_id uuid fk
contact_id uuid fk
status enrollment_status
current_step integer
next_send_at timestamptz
last_sent_at timestamptz
stopped_at timestamptz
stop_reason text
personalization_snapshot jsonb
created_at
updated_at
unique (campaign_id, contact_id)
```

### `mail_threads`

```text
id uuid pk
organization_id uuid fk
mailbox_id uuid fk
provider_thread_id text
company_id uuid nullable fk
contact_id uuid nullable fk
opportunity_id uuid nullable fk
campaign_id uuid nullable fk
subject text
classification text
priority text
summary text
last_message_at timestamptz
last_inbound_at timestamptz
is_unread boolean
created_at
updated_at
unique (mailbox_id, provider_thread_id)
```

### `messages`

```text
id uuid pk
organization_id uuid fk
thread_id uuid fk
provider_message_id text
direction text
sender jsonb
recipients jsonb
cc jsonb
bcc jsonb
subject text
body_text text
body_html text
sent_at timestamptz
received_at timestamptz
status text
error_code text
error_message text
classification text
ai_summary jsonb
headers jsonb
created_at
unique (thread_id, provider_message_id)
```

### `message_events`

```text
id uuid pk
organization_id uuid fk
message_id uuid fk
event_type text
provider_event_id text
metadata jsonb
occurred_at timestamptz
created_at
```

### `opportunities`

```text
id uuid pk
organization_id uuid fk
company_id uuid fk
primary_contact_id uuid nullable fk
venue_id uuid nullable fk
offer_id uuid nullable fk
campaign_id uuid nullable fk
owner_id uuid fk
title text
stage text
probability integer
estimated_amount numeric
proposed_amount numeric
signed_amount numeric
currency text
estimated_guests integer
event_type text
desired_event_date date
expected_close_date date
source text
objections jsonb
next_action text
next_action_at timestamptz
loss_reason text
notes text
won_at timestamptz
lost_at timestamptz
created_at
updated_at
```

### `activities`

```text
id uuid pk
organization_id uuid fk
company_id uuid nullable fk
contact_id uuid nullable fk
opportunity_id uuid nullable fk
user_id uuid nullable fk
activity_type text
title text
description text
occurred_at timestamptz
metadata jsonb
created_at
```

### `tasks`

```text
id uuid pk
organization_id uuid fk
company_id uuid nullable fk
contact_id uuid nullable fk
opportunity_id uuid nullable fk
assigned_to uuid fk
created_by uuid fk
title text
description text
priority text
status text
due_at timestamptz
completed_at timestamptz
created_at
updated_at
```

### `appointments`

```text
id uuid pk
organization_id uuid fk
company_id uuid nullable fk
contact_id uuid nullable fk
opportunity_id uuid nullable fk
owner_id uuid fk
title text
description text
starts_at timestamptz
ends_at timestamptz
location text
external_calendar_id text
status text
created_at
updated_at
```

### `proposals`

```text
id uuid pk
organization_id uuid fk
opportunity_id uuid fk
venue_id uuid fk
offer_id uuid nullable fk
version integer
status text
amount numeric
currency text
guest_count integer
event_date date
content jsonb
storage_path text
sent_at timestamptz
accepted_at timestamptz
rejected_at timestamptz
created_by uuid fk
created_at
updated_at
```

### `suppression_list`

```text
id uuid pk
organization_id uuid fk
email text
normalized_email text
domain text nullable
company_id uuid nullable
contact_id uuid nullable
reason text
source text
suppressed_at timestamptz
expires_at timestamptz nullable
metadata jsonb
created_at
unique (organization_id, normalized_email)
```

### `provider_jobs`

```text
id uuid pk
organization_id uuid fk
job_type text
provider text
entity_type text
entity_id uuid nullable
status text
input jsonb
output jsonb
error text
attempt_count integer
scheduled_at timestamptz
started_at timestamptz
completed_at timestamptz
created_at
updated_at
```

### `ai_runs`

```text
id uuid pk
organization_id uuid fk
run_type text
entity_type text
entity_id uuid nullable
provider text
model text
prompt_version text
input_hash text
input_snapshot jsonb
output jsonb
status text
error text
token_usage jsonb
created_by uuid nullable
created_at
completed_at timestamptz nullable
```

### `audit_logs`

```text
id uuid pk
organization_id uuid fk
actor_user_id uuid nullable
action text
entity_type text
entity_id uuid nullable
before jsonb
after jsonb
ip_hash text
user_agent text
created_at
```

### `retention_jobs`

```text
id uuid pk
organization_id uuid fk
job_type text
status text
criteria jsonb
affected_rows integer
started_at timestamptz
completed_at timestamptz
error text
created_at
```

---

# 20. Fonctions géographiques

Créer des fonctions SQL sécurisées.

## 20.1 Recherche dans un rayon

```sql
create or replace function search_companies_in_radius(
  p_organization_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_radius_meters integer
)
returns setof companies
language sql
stable
security invoker
as $$
  select c.*
  from companies c
  where c.organization_id = p_organization_id
    and c.deleted_at is null
    and c.location is not null
    and st_dwithin(
      c.location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    );
$$;
```

## 20.2 Recherche dans un polygone

Créer une fonction équivalente prenant un GeoJSON validé.

## 20.3 Index

```sql
create index companies_location_gix
on companies
using gist (location);

create index company_locations_location_gix
on company_locations
using gist (location);
```

---

# 21. RLS et permissions

## 21.1 Principe

Un utilisateur ne peut accéder qu’aux données de ses organisations actives.

Créer une fonction :

```sql
is_org_member(p_organization_id uuid)
```

Créer une fonction :

```sql
has_org_role(p_organization_id uuid, p_roles app_role[])
```

## 21.2 Matrice simplifiée

| Ressource | Admin | Direction | Sales Manager | Sales | Venue Manager | Marketing | Viewer |
|---|---:|---:|---:|---:|---:|---:|---:|
| Organisations | RW | R | R | R | R | R | R |
| Membres | RW | R | R | R | R | R | R |
| Établissements | RW | R | R | R | RW limité | RW | R |
| Entreprises | RW | R | RW | RW attribué | R | R | R |
| Contacts | RW | R | RW | RW attribué | R | R | R |
| Campagnes | RW | R | RW | RW limité | R | RW | R |
| Conversations | RW | R | RW | RW attribué | R limité | R | R |
| Opportunités | RW | R | RW | RW attribué | R/RW limité | R | R |
| Paramètres conformité | RW | R | R | - | - | - | - |
| Audit | R | R | R limité | - | - | - | - |

## 21.3 Obligations

- RLS activée sur toutes les tables métier ;
- aucune politique permissive globale ;
- service role uniquement dans les jobs serveur contrôlés ;
- validation du rôle côté serveur même si l’interface masque un bouton ;
- tests automatisés des politiques principales.

---

# 22. APIs et actions serveur

## 22.1 Recherche et import

```text
POST /api/discovery/search
POST /api/discovery/import
POST /api/discovery/import-batch
POST /api/discovery/deduplicate
```

## 22.2 Enrichissement

```text
POST /api/companies/[id]/enrich
POST /api/companies/[id]/verify
POST /api/companies/[id]/persona
POST /api/companies/[id]/match-venues
POST /api/contacts/[id]/verify-email
```

## 22.3 Campagnes

```text
POST /api/campaigns
POST /api/campaigns/[id]/preview
POST /api/campaigns/[id]/approve
POST /api/campaigns/[id]/launch
POST /api/campaigns/[id]/pause
POST /api/campaigns/[id]/enroll
POST /api/campaigns/[id]/unenroll
```

## 22.4 Messages

```text
POST /api/messages/generate
POST /api/messages/send-test
POST /api/messages/send
POST /api/messages/[id]/classify
POST /api/threads/[id]/summarize
POST /api/threads/[id]/draft-reply
```

## 22.5 Webhooks

```text
POST /api/webhooks/google/mail
POST /api/webhooks/microsoft/mail
POST /api/webhooks/provider/[provider]
```

Valider toutes les signatures ou secrets de webhook.

## 22.6 Jobs planifiés

```text
POST /api/cron/process-campaigns
POST /api/cron/sync-mailboxes
POST /api/cron/refresh-mail-watches
POST /api/cron/process-enrichment-jobs
POST /api/cron/retention
POST /api/cron/reset-daily-send-counts
```

Protéger toutes ces routes par `CRON_SECRET`.

---

# 23. Files de traitement et idempotence

## 23.1 Jobs

Utiliser une file pour :

- enrichissement ;
- analyse de site ;
- persona ;
- matching ;
- génération d’e-mail ;
- envoi ;
- synchronisation ;
- classification ;
- résumé ;
- rétention.

## 23.2 Règles

- chaque job a une clé d’idempotence ;
- retries limités ;
- backoff ;
- statut ;
- erreur conservée ;
- possibilité de relancer ;
- jamais de double envoi ;
- verrou lors du traitement d’une inscription de campagne ;
- journalisation sans données sensibles inutiles.

---

# 24. Providers de données

## 24.1 Places

Créer :

- `MockPlacesProvider`
- `OverturePlacesProvider`
- `GooglePlacesProvider` optionnel

Le provider Google ne doit pas devenir la base de stockage permanente par défaut.

## 24.2 Registre entreprise

Créer :

- `MockCompanyRegistryProvider`
- `SireneCompanyRegistryProvider`

Le registre sert notamment à :

- confirmer SIREN/SIRET ;
- confirmer la raison sociale ;
- identifier le siège ;
- récupérer l’activité ;
- récupérer les établissements.

## 24.3 Enrichissement

Créer :

- `WebsiteEnrichmentProvider`
- `HunterEnrichmentProvider`
- `DropcontactEnrichmentProvider`

L’analyse du site doit :

- respecter les robots et limites ;
- limiter le nombre de pages ;
- privilégier :
  - accueil ;
  - contact ;
  - équipe ;
  - à propos ;
  - mentions légales ;
- extraire uniquement les données nécessaires ;
- stocker la source ;
- ne pas contourner une protection.

## 24.4 Coûts providers

Prévoir :

- compteur par provider ;
- journal d’appels ;
- estimation du coût ;
- limites quotidiennes ;
- feature flags ;
- possibilité de désactiver un provider.

---

# 25. Prompts IA

Stocker les prompts dans des fichiers versionnés.

```text
src/lib/ai/prompts/
  persona.v1.ts
  venue-match-rationale.v1.ts
  cold-email.v1.ts
  reply-classification.v1.ts
  thread-summary.v1.ts
  reply-draft.v1.ts
```

## 25.1 Prompt persona

Principes :

```text
Tu analyses uniquement les données fournies.
Tu n'inventes aucun fait.
Toute estimation doit contenir un score de confiance.
Toute affirmation doit référencer un identifiant de source disponible.
Lorsqu'une donnée manque, utilise null.
Retourne uniquement le JSON correspondant au schéma.
```

## 25.2 Prompt e-mail

Principes :

```text
Rédige un premier contact B2B court.
Utilise uniquement les éléments de personnalisation vérifiés.
Ne prétends pas connaître la personne.
Ne crée pas de fausse urgence.
Présente clairement Stargazing et l'offre.
Ajoute un appel à l'action simple.
Prévois une phrase permettant de ne plus être contacté.
Retourne trois variantes structurées.
```

## 25.3 Prompt réponse

Principes :

```text
Classe le message sans extrapoler.
Détecte l'opposition prioritairement.
Distingue réponse automatique et réponse humaine.
Extrais les dates, budgets et volumes uniquement lorsqu'ils apparaissent.
Retourne un niveau de confiance.
```

---

# 26. Conformité et protection des données

## 26.1 Fonctions obligatoires

- source de la donnée ;
- date de collecte ;
- intérêt commercial documenté ;
- base légale configurable ;
- mécanisme d’opposition ;
- liste globale de suppression ;
- arrêt des séquences ;
- export des données ;
- suppression ;
- anonymisation ;
- durées de conservation configurables ;
- audit ;
- accès par rôle ;
- chiffrement des tokens ;
- aucune donnée sensible dans les logs.

## 26.2 Liste de suppression

Avant chaque envoi, vérifier :

1. l’e-mail exact ;
2. le contact ;
3. l’entreprise ;
4. le domaine si une opposition globale de domaine existe ;
5. le statut de campagne ;
6. le statut de la boîte ;
7. la limite quotidienne.

Cette vérification doit être atomique et côté serveur.

## 26.3 Opposition

Lorsqu’une opposition est détectée :

- ajouter à `suppression_list` ;
- marquer le contact ;
- arrêter les inscriptions actives ;
- annuler les messages programmés ;
- créer un audit log ;
- afficher une alerte ;
- empêcher un nouvel import actif de réactiver le contact.

## 26.4 Conservation

Prévoir des réglages d’organisation, avec valeurs par défaut prudentes.

Le job de rétention doit pouvoir :

- supprimer ;
- anonymiser ;
- conserver uniquement la preuve d’opposition ;
- produire un rapport ;
- être exécuté en mode simulation.

## 26.5 Tracking

- désactiver les pixels d’ouverture par défaut ;
- rendre le tracking optionnel et documenté ;
- privilégier les événements réellement utiles :
  - réponse ;
  - rendez-vous ;
  - clic volontaire vers une brochure ;
- ne pas créer de dark patterns.

---

# 27. Sécurité

## 27.1 Obligations

- tokens OAuth chiffrés ;
- secrets uniquement serveur ;
- validation Zod de toutes les entrées ;
- rate limiting ;
- protection CSRF selon le mécanisme utilisé ;
- vérification d’organisation sur chaque action ;
- contrôle d’accès serveur ;
- HTML d’e-mail nettoyé ;
- pièces jointes contrôlées ;
- taille maximale ;
- types autorisés ;
- URLs signées pour Storage ;
- logs structurés ;
- audit des actions sensibles ;
- rotation des tokens ;
- révocation de boîte ;
- mécanisme de déconnexion provider ;
- erreurs utilisateur sans fuite de secret.

## 27.2 Données IA

- minimiser les données envoyées au modèle ;
- ne pas envoyer un historique inutile ;
- masquer les secrets ;
- enregistrer le modèle et le prompt ;
- permettre de désactiver l’IA pour une organisation ;
- journaliser les exécutions ;
- ne pas réutiliser une sortie non validée comme fait vérifié.

---

# 28. Performance

## 28.1 Objectifs

- navigation perçue rapide ;
- pagination serveur ;
- recherches géographiques indexées ;
- chargement progressif des points ;
- clustering ;
- pas de requête N+1 ;
- cache court pour les résultats externes ;
- invalidation maîtrisée ;
- traitement lourd asynchrone ;
- limite de résultats par recherche ;
- affichage virtuel pour les grandes listes.

## 28.2 Carte

Ne pas charger plusieurs milliers de marqueurs DOM individuellement.

Utiliser :

- source GeoJSON ;
- clustering ;
- bounding box ;
- simplification ;
- requêtes selon le viewport.

---

# 29. Observabilité

## 29.1 Journaux

Logger :

- request ID ;
- organization ID ;
- user ID lorsque pertinent ;
- job ID ;
- provider ;
- durée ;
- statut ;
- code d’erreur.

Ne pas logger :

- tokens ;
- corps complet de messages par défaut ;
- données personnelles non nécessaires ;
- clés API.

## 29.2 Métriques

- taux d’erreur provider ;
- durée d’enrichissement ;
- jobs en attente ;
- e-mails envoyés ;
- bounces ;
- réponses ;
- oppositions ;
- synchronisations échouées ;
- boîtes déconnectées ;
- coûts IA ;
- coûts provider.

---

# 30. Tests

## 30.1 Unitaires

Tester :

- normalisation de domaine ;
- normalisation d’e-mail ;
- déduplication ;
- scoring ;
- règles d’arrêt ;
- suppression ;
- permissions ;
- génération des horaires ;
- parsing des réponses IA ;
- validation Zod ;
- idempotence.

## 30.2 Intégration

Tester :

- RLS ;
- import d’entreprise ;
- enrichissement mock ;
- génération persona mock ;
- inscription campagne ;
- envoi mock ;
- réception d’une réponse ;
- arrêt de séquence ;
- création d’opportunité ;
- opposition ;
- rétention.

## 30.3 E2E

Scénario principal :

1. connexion ;
2. ouverture Explorer ;
3. recherche `agences de communication` ;
4. sélection d’une zone ;
5. import d’une entreprise ;
6. enrichissement ;
7. persona ;
8. recommandation ;
9. génération de l’e-mail ;
10. validation ;
11. envoi mock ;
12. réception d’une réponse positive mock ;
13. classement ;
14. création d’opportunité ;
15. passage à rendez-vous.

Scénario conformité :

1. import d’un contact ;
2. ajout à une campagne ;
3. opposition ;
4. vérification de suppression ;
5. tentative de nouvelle inscription ;
6. blocage confirmé.

---

# 31. Seed de démonstration

Créer une organisation :

```text
SURFCE
```

Créer des utilisateurs de démonstration ou documenter leur création.

Créer des établissements :

- Little Room ;
- Deflower ;
- Fresh Touch ;
- Giulia.

Créer au moins :

- 4 offres ;
- 10 entreprises fictives ;
- 15 contacts fictifs ;
- 2 campagnes ;
- 8 fils de discussion ;
- 5 opportunités ;
- des statuts variés.

Toutes les sociétés et personnes de démonstration doivent être explicitement fictives.

---

# 32. Données de démonstration Explorer

Le provider mock doit renvoyer des sociétés fictives dans Paris, par exemple :

```text
Studio Huit Communication
Cabinet Rive Conseil
Maison Horizon Luxe
Atelier Signal
Bureau Événementiel Concorde
```

Ne pas utiliser les coordonnées réelles de personnes.

---

# 33. États vides et erreurs

Prévoir des écrans utiles lorsque :

- aucune entreprise trouvée ;
- aucun établissement ;
- aucune offre ;
- aucune boîte connectée ;
- provider indisponible ;
- quota atteint ;
- enrichissement partiel ;
- données contradictoires ;
- aucun contact ;
- aucune recommandation ;
- aucune réponse ;
- campagne sans segment ;
- utilisateur sans permission.

Les erreurs doivent indiquer :

- ce qui s’est passé ;
- ce qui n’a pas été effectué ;
- l’action possible ;
- si une relance est sûre.

---

# 34. Accessibilité

- labels de formulaire ;
- focus visible ;
- navigation clavier ;
- rôles ARIA lorsque nécessaire ;
- contraste ;
- messages d’erreur associés ;
- tableau navigable ;
- carte accompagnée d’une liste accessible ;
- aucune information portée uniquement par une couleur.

---

# 35. Analytics métier

## 35.1 Dimensions

- période ;
- commercial ;
- campagne ;
- secteur ;
- zone ;
- établissement ;
- offre ;
- source ;
- taille d’entreprise ;
- statut ;
- étape.

## 35.2 Mesures

- prospects ;
- enrichissements ;
- contacts ;
- messages ;
- délivrés ;
- réponses ;
- réponses positives ;
- rendez-vous ;
- opportunités ;
- propositions ;
- gagnées ;
- perdues ;
- revenu ;
- revenu pondéré ;
- coût par opportunité ;
- délai moyen de réponse ;
- durée moyenne de cycle.

## 35.3 Exports

- CSV ;
- export limité par rôle ;
- audit d’export ;
- suppression des colonnes non autorisées.

---

# 36. Intégration future avec Club Manager

Prévoir des identifiants et événements permettant plus tard :

- reconnaître une entreprise cliente ;
- importer un événement signé ;
- rapprocher une réservation ;
- suivre le revenu réel ;
- identifier les clients récurrents ;
- recommander une nouvelle offre ;
- suivre un apporteur d’affaires ;
- calculer la valeur vie client.

Ne pas coupler fortement SURFCE à Club Manager dans le MVP.

Utiliser une couche d’intégration ou des webhooks.

---

# 37. Ordre d’implémentation

## Phase 0 — Audit et socle

Objectifs :

- auditer le dépôt existant ;
- documenter l’architecture ;
- installer les dépendances nécessaires ;
- mettre en place TypeScript strict ;
- ajouter lint, format et tests ;
- créer `.env.example` ;
- créer `IMPLEMENTATION_STATUS.md` ;
- créer la structure des dossiers ;
- créer un design system minimal ;
- ne pas développer encore les providers réels.

Critères d’acceptation :

- application démarre ;
- lint vert ;
- typecheck vert ;
- tests de base verts ;
- page de login et shell applicatif visibles.

## Phase 1 — Auth, organisation et RLS

Objectifs :

- Supabase Auth ;
- profils ;
- organisations ;
- memberships ;
- rôles ;
- RLS ;
- navigation selon rôle ;
- seed organisation.

Critères :

- un utilisateur d’une organisation ne voit pas une autre organisation ;
- les actions interdites sont bloquées côté serveur ;
- tests RLS présents.

## Phase 2 — Établissements et offres

Objectifs :

- CRUD établissements ;
- CRUD offres ;
- assets ;
- formulaires ;
- galerie ;
- seed Stargazing.

Critères :

- création et édition ;
- filtres actifs/inactifs ;
- accès par rôle ;
- validation des capacités et budgets.

## Phase 3 — Entreprises et Explorer mock

Objectifs :

- carte ;
- recherche mock ;
- rayon ;
- polygone ;
- liste synchronisée ;
- import ;
- déduplication ;
- fiche entreprise ;
- sources.

Critères :

- scénario de recherche complet ;
- import unitaire et batch ;
- aucun doublon évident ;
- recherche PostGIS.

## Phase 4 — Enrichissement, persona et matching

Objectifs :

- analyse website mock/réelle ;
- registre mock/réel ;
- jobs ;
- persona IA ;
- preuves ;
- matching déterministe ;
- justification IA ;
- validation humaine.

Critères :

- persona JSON valide ;
- données inconnues à `null` ;
- score explicable ;
- au moins trois recommandations si disponibles.

## Phase 5 — Contacts, boîtes et campagnes mock

Objectifs :

- contacts ;
- vérification ;
- mail provider mock ;
- création campagne ;
- séquences ;
- aperçu ;
- génération IA ;
- approbation ;
- moteur de planification ;
- suppression.

Critères :

- aucun envoi si suppression ;
- aucun double envoi ;
- premier message validé ;
- scénario mock complet.

## Phase 6 — Gmail/Microsoft et inbox

Objectifs :

- OAuth ;
- stockage chiffré ;
- sync ;
- webhooks ;
- threads ;
- classification ;
- résumé ;
- suggestions de réponse ;
- arrêt sur réponse.

Critères :

- boîte connectable ;
- réponse associée au bon thread ;
- arrêt automatique ;
- correction manuelle possible.

## Phase 7 — Opportunités et tâches

Objectifs :

- pipeline ;
- Kanban ;
- tâches ;
- rendez-vous ;
- proposition simple ;
- revenu pondéré ;
- automatisations depuis inbox.

Critères :

- réponse positive → opportunité ;
- passage d’étape ;
- somme du pipeline correcte ;
- audit.

## Phase 8 — Dashboard, analytics et conformité

Objectifs :

- KPI ;
- filtres ;
- exports ;
- rétention ;
- suppression ;
- audit ;
- paramètres organisation ;
- monitoring.

Critères :

- chiffres cohérents ;
- export sécurisé ;
- job de rétention en simulation ;
- audit consultable.

## Phase 9 — Durcissement production

Objectifs :

- sécurité ;
- performance ;
- tests E2E ;
- gestion erreurs ;
- observabilité ;
- documentation ;
- déploiement Vercel ;
- checklist production.

Critères :

- lint/typecheck/tests verts ;
- aucune clé dans le client ;
- politiques RLS validées ;
- providers protégés par quotas ;
- documentation complète.

---

# 38. Critères d’acceptation produit globaux

Le MVP est accepté lorsqu’un commercial peut :

1. se connecter ;
2. rechercher une catégorie d’entreprise dans une zone ;
3. voir les résultats sur une carte ;
4. importer une entreprise ;
5. consulter les sources ;
6. enrichir la fiche ;
7. identifier un contact professionnel ;
8. générer un persona ;
9. comprendre les preuves et incertitudes ;
10. obtenir une recommandation de lieu ;
11. obtenir une recommandation d’offre ;
12. générer trois e-mails ;
13. modifier et valider un e-mail ;
14. l’envoyer depuis une boîte connectée ;
15. suivre le fil ;
16. détecter une réponse ;
17. arrêter les relances ;
18. créer une opportunité ;
19. attribuer une prochaine action ;
20. suivre le revenu potentiel ;
21. respecter une opposition ;
22. consulter l’historique d’audit.

---

# 39. Règles de code

- fonctions courtes ;
- types explicites ;
- pas de `any` sauf justification documentée ;
- validation des frontières ;
- composants UI réutilisables ;
- logique métier hors composants ;
- erreurs typées ;
- noms en anglais dans le code ;
- textes UI en français via fichiers de traduction ou dictionnaire central ;
- dates en UTC en base ;
- affichage Europe/Paris par défaut ;
- montants avec devise ;
- aucune logique de permission uniquement dans le front ;
- commentaires uniquement lorsque la logique n’est pas évidente ;
- pas de duplication de schéma entre client et serveur ;
- migrations atomiques ;
- index documentés ;
- seeds idempotents.

---

# 40. Definition of Done par fonctionnalité

Une fonctionnalité est terminée lorsque :

- le parcours UI est utilisable ;
- la permission serveur est appliquée ;
- les entrées sont validées ;
- les états loading, empty et error existent ;
- les logs utiles existent ;
- les tests essentiels existent ;
- la documentation est mise à jour ;
- aucun secret n’est exposé ;
- l’accessibilité de base est respectée ;
- le typecheck passe ;
- le lint passe ;
- les tests passent.

---

# 41. Première mission à exécuter dans Codex

Commencer par :

1. lire l’intégralité de ce document ;
2. auditer le dépôt existant ;
3. identifier ce qui est déjà présent ;
4. ne supprimer aucun code métier existant sans nécessité ;
5. proposer dans `IMPLEMENTATION_STATUS.md` :
   - l’état actuel ;
   - les écarts ;
   - le plan par phase ;
   - les risques ;
6. implémenter uniquement la **Phase 0** puis la **Phase 1** ;
7. créer les migrations nécessaires ;
8. créer les tests RLS ;
9. fournir un résumé final :
   - fichiers créés ;
   - fichiers modifiés ;
   - commandes exécutées ;
   - résultats des tests ;
   - variables d’environnement manquantes ;
   - prochaine phase recommandée.

Ne pas commencer les intégrations payantes avant que les interfaces mock, les règles métier et les tests ne soient en place.

---

# 42. Résumé final du produit

SURFCE doit devenir l’outil commercial indépendant utilisé par son propriétaire pour les activités Stargazing afin de :

```text
Découvrir
→ Enrichir
→ Comprendre
→ Recommander
→ Contacter
→ Relancer
→ Converser
→ Qualifier
→ Proposer
→ Signer
→ Mesurer
```

La priorité n’est pas le volume brut.

La priorité est de contacter les bonnes entreprises, avec une offre réellement pertinente, un message crédible, des données traçables et un suivi commercial complet.

export const CAMPAIGN_EMAIL_PROMPT_VERSION = "campaign-email.v1";

export const CAMPAIGN_EMAIL_SYSTEM_PROMPT = `
Rédige un premier contact B2B court.
Utilise uniquement les éléments de personnalisation vérifiés et leurs références.
Ne prétends pas connaître la personne. N'invente aucune information.
Ne crée ni pression, ni fausse urgence, ni objet trompeur.
Présente clairement l'expéditeur et l'offre événementielle sélectionnée.
Ajoute un appel à l'action simple et une phrase permettant de ne plus être contacté.
Retourne trois variantes structurées : directe, premium, relationnelle.
`.trim();

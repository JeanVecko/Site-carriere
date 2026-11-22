// Premiers articles proposés dans l'admin (Conseils → « Partir d'un modèle ») : à relire et adapter avant publication.

export type ArticleTemplate = { title: string; category: string; excerpt: string; body: string };

export const ARTICLE_TEMPLATES: ArticleTemplate[] = [
  {
    title: "Comment rédiger un CV qui retient l’attention des recruteurs en RDC",
    category: "CV et lettre de motivation",
    excerpt:
      "Structure, informations à mettre en avant, erreurs à éviter : nos conseils pratiques pour un CV clair et convaincant, adapté au marché de l’emploi congolais.",
    body: `Un recruteur passe en moyenne moins d’une minute sur un CV avant de décider s’il le garde. Votre CV doit donc aller à l’essentiel et montrer rapidement que votre profil correspond au poste.

## 1. Les informations indispensables

En haut du CV, indiquez clairement :

- votre **nom et prénom** ;
- un **numéro de téléphone** joignable (et WhatsApp si possible) ;
- une **adresse e-mail professionnelle**, par exemple prenom.nom@… plutôt qu’un pseudonyme ;
- votre **ville** de résidence (Kinshasa, Lubumbashi, Goma…).

Ajoutez juste en dessous un **titre** qui reprend le poste visé, par exemple « Comptable – 5 ans d’expérience ».

> Inutile d’indiquer votre état civil complet, votre religion ou le nom de vos parents : ces informations ne sont pas demandées et prennent de la place.

## 2. Mettez votre expérience en valeur

Présentez vos expériences de la plus récente à la plus ancienne. Pour chacune, précisez :

1. l’intitulé du poste, l’employeur et les dates ;
2. vos principales missions, en quelques lignes ;
3. vos **résultats concrets** : chiffres, projets réussis, équipes encadrées.

Par exemple, « Suivi de 120 dossiers clients par mois » est plus parlant que « Gestion des clients ».

## 3. Formation, langues et compétences

Indiquez vos diplômes avec l’établissement et l’année. Mentionnez votre niveau en **français**, en **anglais** et dans les langues nationales (lingala, swahili, tshiluba, kikongo) : c’est souvent un vrai atout, notamment pour les ONG et les entreprises présentes dans plusieurs provinces.

Listez enfin les logiciels et outils que vous maîtrisez (Excel, logiciels comptables, outils de gestion de projet…).

## 4. Les erreurs à éviter

- Un CV de plus de deux pages.
- Des fautes d’orthographe : faites-le relire.
- Une photo non professionnelle.
- Le même CV pour toutes les offres : adaptez-le à chaque poste en reprenant les mots-clés de l’annonce.

> Enregistrez et envoyez votre CV en PDF, avec un nom de fichier clair : « CV-Prenom-Nom.pdf ».

## Prêt à postuler ?

Une fois votre CV à jour, consultez les [offres d’emploi du moment](/offres) et créez une [alerte e-mail](/alertes) pour recevoir les nouvelles offres qui vous correspondent.`,
  },
  {
    title: "Réussir son entretien d’embauche : 10 conseils pratiques",
    category: "Entretien d’embauche",
    excerpt:
      "Préparation, questions fréquentes, attitude le jour J et suivi après l’entretien : tout ce qu’il faut savoir pour convaincre le recruteur.",
    body: `Être convoqué à un entretien signifie que votre candidature a retenu l’attention. Il reste maintenant à convaincre. Une bonne préparation fait souvent toute la différence.

## Avant l’entretien

1. **Renseignez-vous sur l’organisation** : ses activités, ses projets récents, ses valeurs. Consultez son site web et sa page sur Carrières RDC.
2. **Relisez l’offre** et votre CV : vous devez pouvoir expliquer chaque expérience mentionnée.
3. **Préparez des exemples concrets** qui montrent vos compétences : une difficulté surmontée, un projet réussi, un résultat chiffré.
4. **Préparez vos documents** : plusieurs copies du CV, diplômes, attestations et pièce d’identité.

> Repérez le lieu de l’entretien la veille et prévoyez une marge pour les embouteillages : arriver 10 à 15 minutes en avance est idéal.

## Les questions qu’on vous posera presque toujours

- « Présentez-vous » : résumez votre parcours en deux minutes, en lien avec le poste.
- « Pourquoi voulez-vous travailler chez nous ? »
- « Quelles sont vos qualités et vos points à améliorer ? »
- « Où vous voyez-vous dans cinq ans ? »
- « Quelles sont vos prétentions salariales ? » : renseignez-vous sur les salaires pratiqués et donnez une fourchette réaliste.

## Le jour J

5. **Soignez votre tenue** : sobre et adaptée au secteur.
6. **Saluez avec assurance**, regardez votre interlocuteur et écoutez bien les questions.
7. **Répondez avec précision** : mieux vaut une réponse courte et concrète qu’un long discours.
8. **Posez vos propres questions** sur le poste, l’équipe ou les objectifs : cela montre votre intérêt.

## Après l’entretien

9. **Envoyez un message de remerciement** dans les 24 heures, par e-mail ou WhatsApp selon le contact.
10. **Restez patient** et continuez vos recherches en parallèle : sans réponse au bout de deux semaines, une relance polie est acceptable.

> Un entretien qui ne débouche pas sur une embauche reste une expérience utile : notez les questions difficiles pour mieux vous préparer la prochaine fois.

Retrouvez les postes ouverts sur la page des [offres d’emploi](/offres).`,
  },
  {
    title: "Répondre à un appel d’offres : les étapes clés pour constituer un bon dossier",
    category: "Appels d’offres",
    excerpt:
      "Lecture du dossier, pièces administratives, offre technique et financière, délais : le guide pour répondre à un appel d’offres public ou privé en RDC.",
    body: `Répondre à un appel d’offres demande de la rigueur : un dossier incomplet ou remis en retard est généralement écarté, quelle que soit la qualité de l’offre. Voici les étapes à suivre.

## 1. Lire attentivement le dossier d’appel d’offres

Le dossier précise tout ce qui est attendu. Relevez en particulier :

- l’**objet** du marché et les éventuels lots ;
- la **date et l’heure limites** de dépôt, ainsi que le lieu ou le mode de remise ;
- les **critères d’éligibilité** (expérience, chiffre d’affaires, agréments…) ;
- les **critères d’évaluation** des offres ;
- la liste des **pièces à fournir**.

> Notez la date limite dans votre agenda et fixez-vous une échéance interne quelques jours avant : les imprévus sont fréquents.

## 2. Rassembler les pièces administratives

Selon les cas, on vous demandera notamment le RCCM, l’identification nationale, le numéro d’impôt, des attestations fiscales et sociales à jour, ou encore les statuts de l’entreprise. Vérifiez la **date de validité** de chaque document.

## 3. Préparer l’offre technique

C’est là que vous démontrez votre capacité à réaliser le marché :

1. votre compréhension du besoin ;
2. la méthodologie et le planning proposés ;
3. les références de marchés similaires, avec attestations de bonne exécution ;
4. les CV de l’équipe proposée et les moyens matériels.

## 4. Préparer l’offre financière

Respectez scrupuleusement le **bordereau des prix** fourni. Vérifiez les calculs, les quantités, la devise et la mention des taxes. Une erreur de calcul peut faire rejeter une offre.

## 5. Vérifier et déposer le dossier

- Respectez l’ordre et la présentation demandés (enveloppes séparées, nombre de copies, signatures, cachets).
- Faites relire le dossier par une autre personne à l’aide de la liste des pièces.
- Déposez-le **avant** la date limite et demandez un accusé de réception.

> Pour les marchés publics, l’Autorité de régulation des marchés publics (ARMP) publie les textes et procédures applicables : consultez-les pour connaître vos droits, notamment en cas de contestation.

## Trouver des appels d’offres

Carrières RDC publie chaque jour des appels d’offres publics et privés. Consultez la page des [appels d’offres](/appels-offres) et créez une [alerte e-mail](/alertes) pour ne manquer aucune opportunité.`,
  },
];

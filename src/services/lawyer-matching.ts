export type LawyerAuditQuestionType = 'select' | 'radio' | 'multiselect' | 'textarea';

type BaseQuestion = {
  id: string;
  question: string;
  type: LawyerAuditQuestionType;
  required?: boolean;
};

type SelectQuestion = BaseQuestion & {
  type: 'select';
  options: string[];
  default?: string;
};

type RadioQuestion = BaseQuestion & {
  type: 'radio';
  options: string[];
  default?: string;
};

type MultiselectQuestion = BaseQuestion & {
  type: 'multiselect';
  options: string[];
  default?: string[];
};

type TextareaQuestion = BaseQuestion & {
  type: 'textarea';
  placeholder?: string;
  rows?: number;
};

type LawyerAuditQuestion =
  | SelectQuestion
  | RadioQuestion
  | MultiselectQuestion
  | TextareaQuestion;

export const LAWYER_AUDIT_QUESTIONS: LawyerAuditQuestion[] = [
  {
    id: 'type_situation',
    question: 'Type de situation juridique ?',
    type: 'select',
    options: [
      'Droit du travail (employeur)',
      'Droit du travail (salarié)',
      'Droit commercial / Contrats',
      'Création entreprise',
      'Immobilier',
      'Droit de la famille',
      'Contentieux / Litige',
      'Propriété intellectuelle',
      'Fiscal',
      'Autre'
    ],
    required: true
  },
  {
    id: 'urgence',
    question: "Niveau d'urgence ?",
    type: 'select',
    options: ['Immédiat (< 48h)', 'Urgent (< 1 semaine)', 'Normal (< 1 mois)', "Pas d'urgence"],
    required: true
  },
  {
    id: 'budget',
    question: 'Budget disponible pour honoraires avocat ?',
    type: 'select',
    options: ['< 500€', '500-1500€', '1500-3000€', '3000-5000€', '> 5000€', 'Aide juridictionnelle'],
    required: true
  },
  {
    id: 'enjeu_financier',
    question: "Quel est l'enjeu financier du dossier ?",
    type: 'select',
    options: ['< 5k€', '5-20k€', '20-50k€', '50-100k€', '> 100k€', 'Non chiffrable'],
    required: true
  },
  {
    id: 'adversaire',
    question: 'Qui est la partie adverse ?',
    type: 'select',
    options: ['Particulier', 'Entreprise PME', 'Grande entreprise', 'Administration', 'Aucune (conseil préventif)']
  },
  {
    id: 'procedure_encours',
    question: "Y a-t-il une procédure déjà en cours ?",
    type: 'radio',
    options: ['Oui', 'Non'],
    required: true
  },
  {
    id: 'documents_disponibles',
    question: 'Avez-vous des documents/preuves ?',
    type: 'radio',
    options: ['Oui, complets', 'Oui, partiels', 'Non, aucun'],
    required: true
  },
  {
    id: 'localisation',
    question: 'Localisation géographique du dossier ?',
    type: 'select',
    options: [
      'Île-de-France',
      'Auvergne-Rhône-Alpes',
      "Provence-Alpes-Côte d'Azur",
      'Occitanie',
      'Nouvelle-Aquitaine',
      'Grand Est',
      'Hauts-de-France',
      'Normandie',
      'Bretagne',
      'Pays de la Loire',
      'Centre-Val de Loire',
      'Bourgogne-Franche-Comté',
      'Corse',
      'DOM-TOM'
    ],
    required: true
  },
  {
    id: 'preference_avocat',
    question: "Préférence type d'avocat ?",
    type: 'select',
    options: [
      'Cabinet individuel (proximité)',
      'Cabinet moyen (équipe)',
      'Grand cabinet (expertise pointue)',
      'Peu importe'
    ]
  },
  {
    id: 'experience_minimale',
    question: 'Expérience minimale souhaitée ?',
    type: 'select',
    options: ['Débutant OK (< 5 ans)', 'Confirmé (5-15 ans)', 'Senior (> 15 ans)', 'Peu importe']
  },
  {
    id: 'langue',
    question: 'Langue(s) de travail souhaitée(s) ?',
    type: 'multiselect',
    options: ['Français', 'Anglais', 'Espagnol', 'Allemand', 'Italien', 'Autre'],
    default: ['Français']
  },
  {
    id: 'modalite_rdv',
    question: 'Modalité de rendez-vous préférée ?',
    type: 'select',
    options: ['Présentiel uniquement', 'Visio uniquement', 'Les deux', 'Peu importe']
  },
  {
    id: 'disponibilite',
    question: 'Votre disponibilité pour un premier RDV ?',
    type: 'select',
    options: ['Cette semaine', 'Semaine prochaine', 'Dans 2 semaines', 'Dans le mois', 'Flexible']
  },
  {
    id: 'deja_consulte',
    question: 'Avez-vous déjà consulté un avocat pour ce dossier ?',
    type: 'radio',
    options: ['Oui, pas satisfait', 'Oui, avis complémentaire souhaité', 'Non, première consultation'],
    required: true
  },
  {
    id: 'objectif',
    question: 'Quel est votre objectif principal ?',
    type: 'select',
    options: ['Conseil / Avis juridique', 'Rédaction acte', 'Négociation amiable', 'Procédure judiciaire', 'Autre'],
    required: true
  },
  {
    id: 'sensibilite',
    question: 'Le dossier présente-t-il une sensibilité particulière ?',
    type: 'multiselect',
    options: ['Médiatique', 'Confidentiel', 'Émotionnel', 'Complexité technique', 'Aucune particularité']
  },
  {
    id: 'description_detaillee',
    question: 'Décrivez votre situation en détail (optionnel mais recommandé)',
    type: 'textarea',
    placeholder: 'Contexte, enjeux, dates clés, actions déjà entreprises...',
    rows: 6
  }
];

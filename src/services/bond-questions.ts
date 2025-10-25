export type BondQuestionOptionType = 'select' | 'number' | 'radio' | 'textarea';

type QuestionBase = {
  id: string;
  question: string;
  type: BondQuestionOptionType;
  required?: boolean;
};

type SelectQuestion = QuestionBase & {
  type: 'select';
  options: string[];
  default?: string;
};

type NumberQuestion = QuestionBase & {
  type: 'number';
  min?: number;
  max?: number;
  default?: number;
};

type RadioQuestion = QuestionBase & {
  type: 'radio';
  options: string[];
  default?: string;
};

type TextareaQuestion = QuestionBase & {
  type: 'textarea';
  placeholder?: string;
};

type BondQuestion = SelectQuestion | NumberQuestion | RadioQuestion | TextareaQuestion;

export const BOND_QUESTIONS: BondQuestion[] = [
  {
    id: 'type_mission',
    question: 'Quel est le type de mission ?',
    type: 'select',
    options: ['service', 'travaux', 'creation', 'event'],
    required: true
  },
  {
    id: 'duree_estimee',
    question: 'Quelle est la durée estimée de la mission ?',
    type: 'select',
    options: ['< 1 mois', '1-3 mois', '3-6 mois', '6-12 mois', '> 12 mois'],
    required: true
  },
  {
    id: 'montant_total',
    question: 'Quel est le montant total de la mission (€) ?',
    type: 'number',
    min: 500,
    required: true
  },
  {
    id: 'nombre_jalons',
    question: 'En combien de jalons souhaitez-vous découper le paiement ?',
    type: 'number',
    min: 2,
    max: 10,
    default: 3,
    required: true
  },
  {
    id: 'livrables',
    question: 'Quels sont les livrables attendus ? (décrivez précisément)',
    type: 'textarea',
    placeholder: 'Ex: Site web responsive, code source, documentation...',
    required: true
  },
  {
    id: 'criteres_validation',
    question: 'Quels sont les critères de validation de chaque jalon ?',
    type: 'textarea',
    placeholder: 'Ex: Maquette approuvée, fonctionnalité testée, contenu livré...',
    required: true
  },
  {
    id: 'delai_validation',
    question: 'Quel délai de validation souhaitez-vous pour chaque jalon ?',
    type: 'select',
    options: ['24h', '48h', '3 jours', '5 jours', '7 jours'],
    default: '48h',
    required: true
  },
  {
    id: 'penalites_retard',
    question: 'Souhaitez-vous inclure des pénalités de retard ?',
    type: 'radio',
    options: ['Oui', 'Non'],
    default: 'Non'
  },
  {
    id: 'clause_resiliation',
    question: 'Conditions de résiliation anticipée du contrat ?',
    type: 'textarea',
    placeholder: 'Ex: Préavis 15 jours, remboursement jalon en cours...'
  },
  {
    id: 'propriete_intellectuelle',
    question: 'À qui revient la propriété intellectuelle des livrables ?',
    type: 'select',
    options: ['Client', 'Prestataire', 'Partagée', 'Selon licence spécifique'],
    default: 'Client',
    required: true
  },
  {
    id: 'garantie',
    question: 'Durée de garantie après livraison finale ?',
    type: 'select',
    options: ['Aucune', '1 mois', '3 mois', '6 mois', '12 mois'],
    default: '3 mois'
  },
  {
    id: 'assurance_rc',
    question: "Le prestataire dispose-t-il d'une assurance RC Pro ?",
    type: 'radio',
    options: ['Oui', 'Non', 'Non applicable'],
    required: true
  }
];

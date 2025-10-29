export type QuestionType = 'choice' | 'text' | 'number' | 'date' | 'boolean' | 'multi';

export interface ConseillerQuestion {
  id: string; // slot id
  text: string;
  type: QuestionType;
  options?: string[]; // for choice/multi
  help?: string;
  legalContext?: string;
}

// Deterministic ordered 18-question intake (generic, FR)
export const QUESTIONS_18: ConseillerQuestion[] = [
  { id: 'situation', text: "Décrivez brièvement votre situation en 2-3 phrases.", type: 'text' },
  { id: 'category', text: "Quel domaine juridique est le plus proche?", type: 'choice', options: [
      'Droit du travail', 'Droit immobilier', 'Consommation', 'Contrats commerciaux', 'Propriété intellectuelle', 'Pénal', 'Fiscal', 'Famille', 'Autre'
  ] },
  { id: 'city', text: "Dans quelle ville se situe l'affaire?", type: 'text' },
  { id: 'dates', text: "Quelles sont les dates clés (fait principal, notifications, signatures)?", type: 'text' },
  { id: 'parties', text: "Qui sont les autres parties impliquées? (entreprise, particulier, administration)", type: 'text' },
  { id: 'evidence', text: "Disposez‑vous de preuves écrites?", type: 'choice', options: ['Contrats', 'Devis/Factures', 'Emails/SMS', 'Photos/Vidéos', 'Témoignages', 'Aucune'] },
  { id: 'amount', text: "Quel est l’enjeu financier approximatif (€)?", type: 'number' },
  { id: 'urgency', text: "Niveau d’urgence (1-10)?", type: 'number' },
  { id: 'procedure', text: "Une procédure est‑elle déjà en cours (mise en demeure, plainte, audience)?", type: 'choice', options: ['Aucune', 'Mise en demeure', 'Médiation', 'Plainte', 'Audience prévue'] },
  { id: 'goal', text: "Objectif principal?", type: 'choice', options: ['Être indemnisé', 'Rompre/annuler', 'Faire cesser un trouble', 'Comprendre mes droits', 'Autre'] },
  { id: 'opponentType', text: "Type de partie adverse?", type: 'choice', options: ['Employeur', 'Bailleur', 'Client', 'Fournisseur', 'Administration', 'Autre'] },
  { id: 'contractExist', text: "Y a‑t‑il un contrat/conditions écrites applicables?", type: 'choice', options: ['Oui', 'Non', 'Inconnu'] },
  { id: 'attempts', text: "Démarches déjà entreprises (mails, appels, LRAR)?", type: 'text' },
  { id: 'complexity', text: "Complexité perçue?", type: 'choice', options: ['Faible', 'Moyenne', 'Élevée'] },
  { id: 'sensitivity', text: "Y a‑t‑il une sensibilité particulière (réputation, confidentialité)?", type: 'choice', options: ['Non', 'Oui'] },
  { id: 'budget', text: "Budget estimatif pour un avocat (€)?", type: 'number' },
  { id: 'templateNeed', text: "Souhaitez‑vous un modèle de document?", type: 'choice', options: ['NDA', 'Contrat de prestation', 'Mise en demeure', 'Bail', 'Autre', 'Non'] },
  { id: 'freeAdd', text: "Autres informations utiles (facultatif)", type: 'text' },
];

// Mapping for interpreter: candidate phrases → slot ids (simple heuristic usage)
export const INTERPRETER_MAP: Record<string, string> = {
  ville: 'city', localisation: 'city', commune: 'city',
  urgence: 'urgency', urgent: 'urgency',
  budget: 'budget', coût: 'budget', prix: 'budget', montant: 'amount', enjeu: 'amount',
  employeur: 'opponentType', bailleur: 'opponentType', client: 'opponentType', fournisseur: 'opponentType', administration: 'opponentType',
  contrat: 'contractExist', conditions: 'contractExist', cgv: 'contractExist',
  preuve: 'evidence', pièces: 'evidence', documents: 'evidence',
  objectif: 'goal',
};

export function getNextQuestionId(answered: Record<string, any>): string | null {
  for (const q of QUESTIONS_18) {
    if (typeof answered[q.id] === 'undefined' || answered[q.id] === null || answered[q.id] === '') {
      return q.id;
    }
  }
  return null;
}

export function getQuestionById(id: string) {
  return QUESTIONS_18.find(q => q.id === id) || null;
}



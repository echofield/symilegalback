// Lightweight helpers and types for Legal Audit V2

export interface LegalDiagnosticV2 {
  diagnostic?: {
    probleme_principal?: string;
    schema_recurrent?: string;
    risque_critique?: string;
    niveau_urgence?: 'Critique' | 'Élevé' | 'Modéré' | 'Faible' | string;
  };
  analyse_strategique?: string;
  pieges_juridiques?: string[];
  predictions_echec?: string[];
  recommandation_choc?: string;
  protocole_solution?: {
    nom?: string;
    mécanisme?: string;
    jalons?: string | string[];
    metriques_succes?: string;
  };
  risk_matrix?: {
    severity?: 'Faible' | 'Moyen' | 'Élevé' | string;
    urgency?: number;
    proof_strength?: 'Faible' | 'Moyen' | 'Élevé' | string;
    main_risks?: string[];
  };
  estimated_costs?: { amiable?: string; judiciaire?: string };
  prognosis_if_no_action?: string;
  next_critical_step?: string;
  summary?: string;
  category?: string;
  urgency?: number;
  complexity?: 'Faible' | 'Moyenne' | 'Élevée' | string;
  actions?: string[];
  needsLawyer?: boolean;
  lawyerSpecialty?: string | null;
  recommendedTemplateId?: string | null;
}

// Tolerant JSON parser for AI responses
export function parseJsonLoose(text: string): any {
  try { return JSON.parse(text); } catch {}
  const fenced = text.match(/```json\n([\s\S]*?)\n```/);
  const body = fenced ? fenced[1] : (text.match(/\{[\s\S]*\}/)?.[0] ?? text);
  const cleaned = body
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/,(\s*[}\]])/g, '$1')
    .trim();
  return JSON.parse(cleaned);
}

export function coalesceAuditDefaultsV2(audit: any, answers: Record<string, any>): LegalDiagnosticV2 {
  const cat = audit?.category || answers.category || 'Général';
  const urg = Number(audit?.urgency ?? answers.urgency ?? 5) || 5;
  const levelFromLabel = (label?: string) => ({ 'Critique': 9, 'Élevé': 7, 'Modéré': 5, 'Faible': 3 } as any)[label || ''] || urg;

  const result: LegalDiagnosticV2 = {
    summary: (typeof audit?.summary === 'string' && audit.summary.trim()) ||
      (answers.situation ? String(answers.situation).slice(0, 280) : `Affaire ${cat}`),
    category: cat,
    urgency: typeof audit?.urgency === 'number' ? audit.urgency : levelFromLabel(audit?.diagnostic?.niveau_urgence),
    complexity: ['Faible','Moyenne','Élevée'].includes(audit?.complexity) ? audit.complexity : (urg >= 7 ? 'Élevée' : 'Moyenne'),
    actions: Array.isArray(audit?.actions) && audit.actions.length ? audit.actions : [
      'Constituer immédiatement les preuves (contrats, échanges, pièces)',
      'Établir une chronologie factuelle validée',
      'Consulter un avocat spécialisé pour cadrer la stratégie'
    ],
    needsLawyer: typeof audit?.needsLawyer === 'boolean' ? audit.needsLawyer : (urg >= 7),
    lawyerSpecialty: audit?.lawyerSpecialty || (cat.toLowerCase().includes('travail') ? 'Droit du travail' :
      cat.toLowerCase().includes('immobilier') ? 'Immobilier' :
      cat.toLowerCase().includes('consommation') ? 'Droit de la consommation' : 'Généraliste'),
    recommendedTemplateId: audit?.recommendedTemplateId || (
      cat.toLowerCase().includes('travail') ? 'contrat-travail' :
      cat.toLowerCase().includes('immobilier') ? 'mise-en-demeure-bailleur' :
      cat.toLowerCase().includes('consommation') ? 'reclamation-consommateur' : 'mise-en-demeure-generale'
    ),
    diagnostic: {
      probleme_principal: audit?.diagnostic?.probleme_principal || 'Défaut de stratégie et de preuve',
      schema_recurrent: audit?.diagnostic?.schema_recurrent || 'Approche réactive au lieu de proactive',
      risque_critique: audit?.diagnostic?.risque_critique || 'Prescription ou affaiblissement probatoire',
      niveau_urgence: audit?.diagnostic?.niveau_urgence || (urg >= 7 ? 'Élevé' : 'Modéré'),
    },
    analyse_strategique: audit?.analyse_strategique || 'Consolider la preuve, clarifier la qualification juridique et engager une séquence amiable structurée avant toute procédure.',
    pieges_juridiques: Array.isArray(audit?.pieges_juridiques) && audit.pieges_juridiques.length ? audit.pieges_juridiques : [
      'Délais de prescription mal maîtrisés', 'Preuves non admissibles', 'Mise en demeure insuffisante'
    ],
    predictions_echec: Array.isArray(audit?.predictions_echec) && audit.predictions_echec.length ? audit.predictions_echec : [
      'Négociation directe sans base probatoire', 'Retard d’action jusqu’à l’échéance', 'Réclamation vague sans pièces'
    ],
    protocole_solution: audit?.protocole_solution || {
      nom: 'Protocole Preuve & Mise en Demeure',
      mécanisme: 'Structurer la preuve et enclencher une mise en demeure conforme',
      jalons: 'Collecte pièces → Chronologie → Modèle de mise en demeure → Envoi AR',
      metriques_succes: 'Pièces réunies, AR envoyé, réponse reçue sous 8-15j'
    },
    risk_matrix: audit?.risk_matrix || {
      severity: urg >= 7 ? 'Élevé' : 'Moyen',
      urgency: urg,
      proof_strength: 'Moyen',
      main_risks: ['Prescription', 'Preuves insuffisantes']
    },
    estimated_costs: audit?.estimated_costs || { amiable: '€200-800', judiciaire: '€2150-6000' },
    prognosis_if_no_action: audit?.prognosis_if_no_action || 'Risque d’aggravation de la position et perte d’effet utile.',
    next_critical_step: audit?.next_critical_step || 'Envoyer une mise en demeure structurée avec pièces en 7 jours.'
  };
  return result;
}



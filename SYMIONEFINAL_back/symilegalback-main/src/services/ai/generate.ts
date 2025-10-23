import type { ContractTemplate } from '@/types/contracts';

// Builds the AI prompt from template and inputs; supports lawyer mode
export function buildPrompt(
  template: ContractTemplate,
  userInputs: Record<string, any>,
  lawyerMode: boolean = false,
): string {
  const { metadata, clauses } = template;

  let prompt = `You are an expert contract drafting assistant. Draft the contract titled "${metadata.title}" for jurisdiction ${metadata.jurisdiction} under governing law ${metadata.governing_law}. Use the inputs and clauses as guidance and produce a cohesive contract.`;

  prompt += `\n\nUSER INPUTS (JSON):\n${JSON.stringify(userInputs, null, 2)}`;

  prompt += `\n\nBASE CLAUSES (JSON):\n${JSON.stringify(
    clauses.map((c) => ({ id: c.id, title: c.title, body: c.body })),
    null,
    2,
  )}`;

  if (lawyerMode) {
    prompt += `\n\nLAWYER MODE INSTRUCTIONS:\n`;
    prompt += `- Use precise legal terminology appropriate for ${metadata.jurisdiction} jurisdiction\n`;
    prompt += `- Include detailed annotations explaining the legal significance of each clause\n`;
    prompt += `- Provide alternative phrasing options for key clauses\n`;
    prompt += `- Include preliminary risk assessments for clauses that may require further review\n`;
  } else {
    prompt += `\n\nSTANDARD MODE INSTRUCTIONS:\n`;
    prompt += `- Use clear, understandable language suitable for non-lawyers\n`;
    prompt += `- Focus on practical application rather than legal theory\n`;
    prompt += `- Avoid unnecessary legal jargon\n`;
  }

  prompt += `\n\nOUTPUT REQUIREMENTS:\n- Return the contract as plain text, organized with headings.\n- Do not include the JSON from above.\n- Incorporate user inputs in the appropriate places.\n`;

  return prompt;
}

// Suggests appropriate contract templates based on French legal description
export async function suggestContractFR(description: string): Promise<string[]> {
  const prompt = `Analysez cette description de besoin juridique français et suggérez les modèles de contrats les plus appropriés.

Description: "${description}"

Répondez UNIQUEMENT avec un tableau JSON des IDs de contrats pertinents, par exemple:
["contrat-de-travail-dur-e-ind-termin-e-cdi", "freelance-services-agreement"]

Modèles disponibles (France):
- contrat-de-travail-dur-e-ind-termin-e-cdi
- contrat-de-travail-dur-e-d-termin-e-cdd
- contrat-de-travail-temporaire-int-rim
- convention-de-stage
- contrat-d-apprentissage
- convention-de-rupture-conventionnelle
- attestation-de-fin-de-contrat-et-solde-de-tout-compte
- avenant-au-contrat-de-travail
- lettre-de-licenciement-pour-faute-grave
- lettre-de-licenciement-pour-motif-personnel
- bail-d-habitation-non-meubl
- bail-de-location-meubl-e
- bail-commercial
- bail-commercial-3-6-9
- bail-professionnel
- contrat-de-location-d-habitation-bail-r-sidence-principale
- contrat-de-location-meubl-e-de-courte-dur-e
- contrat-de-colocation
- contrat-de-cautionnement
- mandat-de-gestion-locative
- mandat-de-vente-immobili-re
- promesse-synallagmatique-de-vente-immobili-re
- tat-des-lieux-d-entr-e-et-de-sortie
- contrat-de-prestation-de-services
- freelance-services-agreement
- partnership-agreement
- mutual-non-disclosure-agreement
- one-way-non-disclosure-agreement
- terms-of-service
- contrat-de-mariage-r-gime-de-s-paration-des-biens
- convention-de-pacs-pacte-civil-de-solidarit
- convention-de-divorce-par-consentement-mutuel
- convention-de-s-paration-de-corps
- convention-de-garde-d-enfant
- contrat-de-pr-t-entre-particuliers
- reconnaissance-de-dette

Retournez seulement le JSON, pas d'explications.`;

  // This would normally call an AI service, but for now return a simple suggestion
  // In production, this should call OpenAI or another AI provider
  const suggestions = [];
  
  if (description.toLowerCase().includes('travail') || description.toLowerCase().includes('emploi') || description.toLowerCase().includes('salarié')) {
    suggestions.push('contrat-de-travail-dur-e-ind-termin-e-cdi');
  }
  if (description.toLowerCase().includes('location') || description.toLowerCase().includes('bail') || description.toLowerCase().includes('logement')) {
    suggestions.push('bail-d-habitation-non-meubl');
  }
  if (description.toLowerCase().includes('freelance') || description.toLowerCase().includes('prestation') || description.toLowerCase().includes('service')) {
    suggestions.push('contrat-de-prestation-de-services');
  }
  if (description.toLowerCase().includes('confidentialité') || description.toLowerCase().includes('secret')) {
    suggestions.push('mutual-non-disclosure-agreement');
  }
  if (description.toLowerCase().includes('partenariat') || description.toLowerCase().includes('collaboration')) {
    suggestions.push('partnership-agreement');
  }
  
  // Default fallback
  if (suggestions.length === 0) {
    suggestions.push('contrat-de-prestation-de-services');
  }
  
  return suggestions;
}


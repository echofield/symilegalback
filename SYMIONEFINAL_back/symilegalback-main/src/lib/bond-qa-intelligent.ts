// bond-qa-intelligent.ts
import bondQuestionsData from './data/bond-questions-enhanced.json';

// Types pour le système Q&A
interface Question {
  id: string;
  question: string;
  type: 'select' | 'multiselect' | 'text' | 'number' | 'date' | 'conditional';
  options?: string[];
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    customValidator?: (value: any) => boolean;
  };
  conditions?: {
    dependsOn: string;
    showIf: any;
  };
  help?: string;
  legalImplication?: string;
  defaultValue?: any;
  dynamicOptions?: (context: any) => string[];
}

interface QAFlow {
  templateId: string;
  sections: QASection[];
  validationRules: ValidationRule[];
}

interface QASection {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  order: number;
}

interface ValidationRule {
  id: string;
  description: string;
  validate: (answers: any) => boolean;
  errorMessage: string;
}

// Base de questions enrichie par type de contrat
export const intelligentQASystem: Record<string, Question[]> = bondQuestionsData as Record<string, Question[]>;

// Classe pour gérer le flux Q&A
export class IntelligentQAManager {
  private currentFlow: QAFlow;
  private answers: Record<string, any> = {};
  private currentSectionIndex: number = 0;

  constructor(templateId: string) {
    const flow = this.buildQAFlow(templateId);
    if (!flow) {
      throw new Error(`Template ${templateId} not found`);
    }
    this.currentFlow = flow;
  }

  private buildQAFlow(templateId: string): QAFlow | null {
    const questions = intelligentQASystem[templateId];
    if (!questions) return null;

    // Organiser les questions en sections logiques
    const sections = this.organizeQuestionsIntoSections(questions, templateId);
    
    return {
      templateId,
      sections,
      validationRules: this.getValidationRules(templateId)
    };
  }

  private organizeQuestionsIntoSections(questions: Question[], templateId: string): QASection[] {
    const sections: QASection[] = [];
    
    // Section 1: Identification des parties
    sections.push({
      id: 'parties',
      title: 'Identification des parties',
      description: 'Informations sur les parties contractantes',
      order: 1,
      questions: questions.filter(q => 
        ['client_type', 'client_name', 'client_id', 'provider_name', 'provider_qualification'].includes(q.id)
      )
    });

    // Section 2: Description du projet
    sections.push({
      id: 'project',
      title: 'Description du projet',
      description: 'Détails sur le projet et les livrables',
      order: 2,
      questions: questions.filter(q => 
        ['service_nature', 'service_description', 'work_nature', 'work_description', 'creation_type', 'brief_description', 'project_description', 'project_type'].includes(q.id)
      )
    });

    // Section 3: Conditions financières
    sections.push({
      id: 'financial',
      title: 'Conditions financières',
      description: 'Budget et modalités de paiement',
      order: 3,
      questions: questions.filter(q => 
        ['total_amount', 'milestone_type', 'stake_amount'].includes(q.id)
      )
    });

    // Section 4: Planning
    sections.push({
      id: 'timeline',
      title: 'Planning et jalons',
      description: 'Dates et organisation des jalons',
      order: 4,
      questions: questions.filter(q => 
        ['start_date', 'end_date', 'duration', 'deadline_type'].includes(q.id)
      )
    });

    // Section 5: Aspects juridiques
    sections.push({
      id: 'legal',
      title: 'Aspects juridiques',
      description: 'Clauses légales et responsabilités',
      order: 5,
      questions: questions.filter(q => 
        ['ip_ownership', 'confidentiality_level', 'warranty_duration', 'termination_notice', 'legal_clauses', 'governing_law', 'applicable_law'].includes(q.id)
      )
    });

    return sections.filter(section => section.questions.length > 0);
  }

  private getValidationRules(templateId: string): ValidationRule[] {
    const rules: ValidationRule[] = [
      {
        id: 'dates_coherence',
        description: 'La date de fin doit être après la date de début',
        validate: (answers) => {
          if (!answers.start_date || !answers.end_date) return true;
          return new Date(answers.end_date) > new Date(answers.start_date);
        },
        errorMessage: 'La date de fin doit être postérieure à la date de début'
      },
      {
        id: 'amount_minimum',
        description: 'Montant minimum pour un contrat',
        validate: (answers) => {
          return !answers.total_amount || answers.total_amount >= 100;
        },
        errorMessage: 'Le montant minimum d\'un contrat est de 100€'
      }
    ];

    return rules;
  }

  getCurrentSection(): QASection {
    return this.currentFlow.sections[this.currentSectionIndex];
  }

  getVisibleQuestions(): Question[] {
    const section = this.getCurrentSection();
    return section.questions.filter(q => this.isQuestionVisible(q));
  }

  private isQuestionVisible(question: Question): boolean {
    if (!question.conditions) return true;
    
    const { dependsOn, showIf } = question.conditions;
    const dependencyValue = this.answers[dependsOn];
    
    if (Array.isArray(showIf)) {
      return showIf.includes(dependencyValue);
    }
    
    return dependencyValue === showIf;
  }

  validateAnswer(questionId: string, value: any): string | null {
    const question = this.findQuestion(questionId);
    if (!question || !question.validation) return null;

    const { required, min, max, pattern, customValidator } = question.validation;

    if (required && !value) {
      return 'Ce champ est obligatoire';
    }

    if (min !== undefined) {
      if (typeof value === 'string' && value.length < min) {
        return `Minimum ${min} caractères requis`;
      }
      if (typeof value === 'number' && value < min) {
        return `La valeur minimum est ${min}`;
      }
    }

    if (max !== undefined) {
      if (typeof value === 'string' && value.length > max) {
        return `Maximum ${max} caractères autorisés`;
      }
      if (typeof value === 'number' && value > max) {
        return `La valeur maximum est ${max}`;
      }
    }

    if (pattern && typeof value === 'string') {
      const regex = new RegExp(pattern);
      if (!regex.test(value)) {
        return 'Format invalide';
      }
    }

    if (customValidator && !customValidator(value)) {
      return 'Valeur invalide';
    }

    return null;
  }

  setAnswer(questionId: string, value: any): void {
    const error = this.validateAnswer(questionId, value);
    if (error) throw new Error(error);
    
    this.answers[questionId] = value;
  }

  private findQuestion(questionId: string): Question | undefined {
    for (const section of this.currentFlow.sections) {
      const question = section.questions.find(q => q.id === questionId);
      if (question) return question;
    }
    return undefined;
  }

  canMoveToNextSection(): boolean {
    const currentQuestions = this.getVisibleQuestions();
    
    for (const question of currentQuestions) {
      if (question.validation?.required && !this.answers[question.id]) {
        return false;
      }
    }
    
    return true;
  }

  moveToNextSection(): boolean {
    if (this.canMoveToNextSection() && 
        this.currentSectionIndex < this.currentFlow.sections.length - 1) {
      this.currentSectionIndex++;
      return true;
    }
    return false;
  }

  moveToPreviousSection(): boolean {
    if (this.currentSectionIndex > 0) {
      this.currentSectionIndex--;
      return true;
    }
    return false;
  }

  isComplete(): boolean {
    return this.currentSectionIndex === this.currentFlow.sections.length - 1 &&
           this.canMoveToNextSection();
  }

  validateAllRules(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const rule of this.currentFlow.validationRules) {
      if (!rule.validate(this.answers)) {
        errors.push(rule.errorMessage);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  getAnswers(): Record<string, any> {
    return { ...this.answers };
  }

  getProgress(): number {
    const totalSections = this.currentFlow.sections.length;
    const completedSections = this.currentSectionIndex;
    const currentSectionQuestions = this.getVisibleQuestions();
    const answeredInCurrent = currentSectionQuestions.filter(
      q => this.answers[q.id] !== undefined
    ).length;
    
    const currentSectionProgress = currentSectionQuestions.length > 0
      ? answeredInCurrent / currentSectionQuestions.length
      : 0;
    
    return ((completedSections + currentSectionProgress) / totalSections) * 100;
  }

  getSummary(): any {
    return {
      templateId: this.currentFlow.templateId,
      totalSections: this.currentFlow.sections.length,
      currentSection: this.currentSectionIndex + 1,
      progress: this.getProgress(),
      answersCount: Object.keys(this.answers).length,
      isComplete: this.isComplete()
    };
  }
}

// Générateur de contrat intelligent basé sur les réponses
export async function generateSmartContract(
  templateId: string,
  answers: Record<string, any>
): Promise<string> {
  const contractPrompt = buildContractPrompt(templateId, answers);
  
  // Appel à OpenAI pour générer le contrat
  const contract = await generateWithOpenAI(contractPrompt);
  
  // Post-traitement et validation juridique
  return postProcessContract(contract, answers);
}

function buildContractPrompt(templateId: string, answers: Record<string, any>): string {
  const basePrompt = `Tu es un expert juridique français spécialisé dans les contrats avec système d'escrow/jalons. 
Tu génères des contrats juridiquement solides et professionnels.

CONTEXTE DU PROJET :
- Type de contrat : ${templateId}
- Réponses utilisateur : ${JSON.stringify(answers, null, 2)}

GÉNÈRE un contrat complet en JSON avec ce format EXACT :

{
  "title": "Titre du contrat",
  "parties": {
    "client": {
      "name": "Nom du client",
      "role": "Client/Commanditaire",
      "address": "Adresse complète",
      "siret": "SIRET si applicable"
    },
    "provider": {
      "name": "Nom du prestataire", 
      "role": "Prestataire/Freelance",
      "address": "Adresse complète",
      "siret": "SIRET si applicable"
    }
  },
  "object": "Objet précis du contrat",
  "milestones": [
    {
      "id": "milestone_1",
      "title": "Titre du jalon",
      "description": "Description détaillée des livrables",
      "amount": 250000,
      "deadline": "2024-02-15",
      "deliverables": ["Livrable 1", "Livrable 2"],
      "acceptanceCriteria": "Critères d'acceptation précis"
    }
  ],
  "terms": {
    "duration": "Durée du contrat",
    "paymentTerms": "Modalités de paiement",
    "intellectualProperty": "Clause propriété intellectuelle",
    "confidentiality": "Clause confidentialité",
    "liability": "Clause responsabilité",
    "termination": "Clause résiliation",
    "disputes": "Clause litiges",
    "governingLaw": "Droit applicable (France)"
  },
  "legalClauses": [
    "Clause légale spécifique 1",
    "Clause légale spécifique 2"
  ],
  "risks": [
    {
      "risk": "Type de risque",
      "mitigation": "Mesure de mitigation"
    }
  ],
  "totalAmount": 1000000,
  "currency": "EUR",
  "createdAt": "2024-01-20T10:00:00Z"
}

RÈGLES IMPORTANTES :
- Montants en centimes (ex: 1000000 = 10000€)
- Jalons équilibrés selon le budget
- Clauses juridiques françaises complètes
- Délais réalistes et négociables
- Propriété intellectuelle clairement définie
- Responsabilité limitée et équilibrée
- Résiliation avec préavis raisonnable`;

  return basePrompt;
}

async function generateWithOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert juridique français. Tu génères des contrats juridiquement solides en JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function postProcessContract(contract: string, answers: Record<string, any>): string {
  // Validation et enrichissement du contrat
  try {
    const contractData = JSON.parse(contract);
    
    // Enrichir avec les réponses utilisateur
    if (answers.client_name) {
      contractData.parties.client.name = answers.client_name;
    }
    if (answers.provider_name) {
      contractData.parties.provider.name = answers.provider_name;
    }
    if (answers.total_amount) {
      contractData.totalAmount = answers.total_amount * 100; // Convertir en centimes
    }
    
    return JSON.stringify(contractData, null, 2);
  } catch (error) {
    console.error('Error processing contract:', error);
    return contract;
  }
}
export const DOCUMENTS_PRICING = {
  cdi: { name: 'CDI', price: 119, category: 'emploi', stripe_price_id: 'price_cdi_119' },
  cdd: { name: 'CDD', price: 119, category: 'emploi', stripe_price_id: 'price_cdd_119' },
  stage: { name: 'Stage', price: 119, category: 'emploi', stripe_price_id: 'price_stage_119' },
  freelance: { name: 'Freelance', price: 119, category: 'entreprise', stripe_price_id: 'price_freelance_119' },
  nda: { name: 'NDA', price: 119, category: 'entreprise', stripe_price_id: 'price_nda_119' },
  nda_mutuel: { name: 'NDA Mutuel', price: 119, category: 'entreprise', stripe_price_id: 'price_nda_mutuel_119' },
  rupture_conventionnelle: { name: 'Rupture conventionnelle', price: 119, category: 'emploi', stripe_price_id: 'price_rupture_119' },
  cgu_cgv: { name: 'CGU/CGV', price: 119, category: 'entreprise', stripe_price_id: 'price_cgu_119' },
  prestation_services: { name: 'Prestation services', price: 119, category: 'entreprise', stripe_price_id: 'price_prestation_119' },
  bail_habitation: { name: 'Bail habitation', price: 119, category: 'immobilier', stripe_price_id: 'price_bail_119' },
  promesse_vente: { name: 'Promesse vente', price: 119, category: 'immobilier', stripe_price_id: 'price_promesse_119' },
  pacte_associes: { name: 'Pacte associés', price: 119, category: 'entreprise', stripe_price_id: 'price_pacte_119' },
  reconnaissance_dette: { name: 'Reconnaissance dette', price: 119, category: 'personnel', stripe_price_id: 'price_dette_119' }
} as const;

export const BOND_PRICING = {
  setup: { amount: 149, currency: 'eur', stripe_price_id: 'price_bond_setup_149' },
  commission_rate: 0.03,
  types: [
    {
      id: 'service',
      name: 'Prestation de service',
      description: 'Pour missions de conseil, développement, design, marketing...',
      icon: '💼'
    },
    {
      id: 'travaux',
      name: 'Travaux',
      description: 'Construction, rénovation, aménagements...',
      icon: '🏗️'
    },
    {
      id: 'creation',
      name: 'Création artistique',
      description: 'Design, illustration, musique, vidéo...',
      icon: '🎨'
    },
    {
      id: 'event',
      name: 'Événementiel',
      description: 'Organisation événements, traiteur, location matériel...',
      icon: '🎪'
    }
  ]
} as const;

export const CABINET_PRICING = {
  monthly: 350,
  stripe_price_id: 'price_cabinet_350',
  features: [
    'Rapport BODACC hebdomadaire',
    'Veille juridique entreprises',
    'Référencement prioritaire (Top 3 suggestions)',
    'Support prioritaire 48h',
    'Accès API données entreprises'
  ]
} as const;

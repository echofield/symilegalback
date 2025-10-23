export type DocumentCategory =
  | 'emploi'
  | 'confidentialite'
  | 'creation'
  | 'rh'
  | 'commercial'
  | 'immobilier';

export interface DocumentPricing {
  id: string;
  name: string;
  price: number;
  category: DocumentCategory;
  description?: string;
  stripe_price_id: string;
}

export const DOCUMENTS_PRICING: Record<string, DocumentPricing> = {
  // === CONTRATS EMPLOI ===
  cdi: {
    id: 'cdi',
    name: 'CDI',
    price: 79,
    category: 'emploi',
    description: 'Contrat à durée indéterminée',
    stripe_price_id: 'price_cdi_79',
  },
  cdd: {
    id: 'cdd',
    name: 'CDD',
    price: 79,
    category: 'emploi',
    description: 'Contrat à durée déterminée',
    stripe_price_id: 'price_cdd_79',
  },
  stage: {
    id: 'stage',
    name: 'Stage / Alternance',
    price: 59,
    category: 'emploi',
    description: 'Convention de stage ou contrat alternance',
    stripe_price_id: 'price_stage_59',
  },
  freelance: {
    id: 'freelance',
    name: 'Contrat freelance / Prestation',
    price: 149,
    category: 'emploi',
    description: 'Pour missions de conseil, développement, design...',
    stripe_price_id: 'price_freelance_149',
  },
  rupture_conventionnelle: {
    id: 'rupture_conventionnelle',
    name: 'Rupture conventionnelle',
    price: 99,
    category: 'emploi',
    description: 'Procédure de rupture conventionnelle homologuée',
    stripe_price_id: 'price_rupture_99',
  },
  promesse_embauche: {
    id: 'promesse_embauche',
    name: "Promesse d'embauche",
    price: 49,
    category: 'emploi',
    description: "Engagement formel d'embauche",
    stripe_price_id: 'price_promesse_49',
  },

  // === CONFIDENTIALITÉ ===
  nda_standard: {
    id: 'nda_standard',
    name: 'NDA Standard',
    price: 49,
    category: 'confidentialite',
    description: 'Accord de non-divulgation unilatéral',
    stripe_price_id: 'price_nda_standard_49',
  },
  nda_mutual: {
    id: 'nda_mutual',
    name: 'NDA Mutuel',
    price: 59,
    category: 'confidentialite',
    description: 'Accord de confidentialité réciproque',
    stripe_price_id: 'price_nda_mutual_59',
  },
  clause_confidentialite: {
    id: 'clause_confidentialite',
    name: 'Clause de confidentialité',
    price: 39,
    category: 'confidentialite',
    description: 'Clause de confidentialité additionnelle',
    stripe_price_id: 'price_clause_conf_39',
  },

  // === CRÉATION ENTREPRISE ===
  statuts_sasu: {
    id: 'statuts_sasu',
    name: 'Statuts SASU',
    price: 199,
    category: 'creation',
    description: 'Société par Actions Simplifiée Unipersonnelle',
    stripe_price_id: 'price_sasu_199',
  },
  statuts_sarl: {
    id: 'statuts_sarl',
    name: 'Statuts SARL',
    price: 249,
    category: 'creation',
    description: 'Société à Responsabilité Limitée',
    stripe_price_id: 'price_sarl_249',
  },
  statuts_sas: {
    id: 'statuts_sas',
    name: 'Statuts SAS',
    price: 299,
    category: 'creation',
    description: 'Société par Actions Simplifiée',
    stripe_price_id: 'price_sas_299',
  },
  pacte_associes: {
    id: 'pacte_associes',
    name: "Pacte d'associés",
    price: 349,
    category: 'creation',
    description: 'Pacte organisant les relations entre associés',
    stripe_price_id: 'price_pacte_349',
  },
  pv_ag: {
    id: 'pv_ag',
    name: 'PV Assemblée Générale',
    price: 79,
    category: 'creation',
    description: 'Procès-verbal d’assemblée générale',
    stripe_price_id: 'price_pv_ag_79',
  },

  // === RH & DOCUMENTS ===
  reglement_interieur: {
    id: 'reglement_interieur',
    name: 'Règlement intérieur',
    price: 149,
    category: 'rh',
    description: "Règlement intérieur d'entreprise",
    stripe_price_id: 'price_reglement_149',
  },
  charte_teletravail: {
    id: 'charte_teletravail',
    name: 'Charte télétravail',
    price: 79,
    category: 'rh',
    description: 'Charte encadrant le télétravail',
    stripe_price_id: 'price_teletravail_79',
  },
  avenant_contrat: {
    id: 'avenant_contrat',
    name: 'Avenant au contrat',
    price: 69,
    category: 'rh',
    description: 'Avenant pour modifier un contrat de travail',
    stripe_price_id: 'price_avenant_69',
  },
  attestation_employeur: {
    id: 'attestation_employeur',
    name: 'Attestation employeur',
    price: 29,
    category: 'rh',
    description: 'Attestation employeur standard',
    stripe_price_id: 'price_attestation_29',
  },
  certificat_travail: {
    id: 'certificat_travail',
    name: 'Certificat de travail',
    price: 29,
    category: 'rh',
    description: 'Certificat de travail salarié sortant',
    stripe_price_id: 'price_certificat_29',
  },
  solde_tout_compte: {
    id: 'solde_tout_compte',
    name: 'Solde de tout compte',
    price: 39,
    category: 'rh',
    description: 'Reçu pour solde de tout compte',
    stripe_price_id: 'price_solde_39',
  },

  // === COMMERCIAL ===
  cgv: {
    id: 'cgv',
    name: 'CGV (Conditions Générales de Vente)',
    price: 149,
    category: 'commercial',
    description: 'Conditions générales de vente',
    stripe_price_id: 'price_cgv_149',
  },
  cgu: {
    id: 'cgu',
    name: "CGU (Conditions Générales d'Utilisation)",
    price: 149,
    category: 'commercial',
    description: "Conditions générales d'utilisation",
    stripe_price_id: 'price_cgu_149',
  },
  contrat_prestation: {
    id: 'contrat_prestation',
    name: 'Contrat de prestation de services',
    price: 149,
    category: 'commercial',
    description: 'Contrat de prestation pour services B2B/B2C',
    stripe_price_id: 'price_prestation_149',
  },
  mandat_vente: {
    id: 'mandat_vente',
    name: 'Mandat de vente',
    price: 79,
    category: 'commercial',
    description: 'Mandat de vente et de représentation',
    stripe_price_id: 'price_mandat_79',
  },

  // === IMMOBILIER ===
  bail_habitation: {
    id: 'bail_habitation',
    name: 'Bail habitation',
    price: 79,
    category: 'immobilier',
    description: 'Bail de location habitation principale',
    stripe_price_id: 'price_bail_hab_79',
  },
  bail_commercial: {
    id: 'bail_commercial',
    name: 'Bail commercial',
    price: 149,
    category: 'immobilier',
    description: 'Bail commercial 3/6/9',
    stripe_price_id: 'price_bail_com_149',
  },
  etat_lieux: {
    id: 'etat_lieux',
    name: 'État des lieux',
    price: 29,
    category: 'immobilier',
    description: 'Modèle d’état des lieux',
    stripe_price_id: 'price_etat_lieux_29',
  },
  quittance_loyer: {
    id: 'quittance_loyer',
    name: 'Quittance de loyer',
    price: 19,
    category: 'immobilier',
    description: 'Quittance pour loyers perçus',
    stripe_price_id: 'price_quittance_19',
  },
};

export const BOND_PRICING = {
  setup: {
    amount: 149,
    currency: 'eur',
    stripe_price_id: 'price_bond_setup_149',
  },
  commission_rate: 0.03,
  types: [
    {
      id: 'service',
      name: 'Prestation de service',
      description: 'Pour missions de conseil, développement, design, marketing...',
    },
    {
      id: 'travaux',
      name: 'Travaux',
      description: 'Construction, rénovation, aménagements...',
    },
    {
      id: 'creation',
      name: 'Création artistique',
      description: 'Design, illustration, musique, vidéo...',
    },
  ],
};

export const DOCUMENTS_BY_CATEGORY: Record<DocumentCategory, DocumentPricing[]> = {
  emploi: Object.values(DOCUMENTS_PRICING).filter((doc) => doc.category === 'emploi'),
  confidentialite: Object.values(DOCUMENTS_PRICING).filter((doc) => doc.category === 'confidentialite'),
  creation: Object.values(DOCUMENTS_PRICING).filter((doc) => doc.category === 'creation'),
  rh: Object.values(DOCUMENTS_PRICING).filter((doc) => doc.category === 'rh'),
  commercial: Object.values(DOCUMENTS_PRICING).filter((doc) => doc.category === 'commercial'),
  immobilier: Object.values(DOCUMENTS_PRICING).filter((doc) => doc.category === 'immobilier'),
};

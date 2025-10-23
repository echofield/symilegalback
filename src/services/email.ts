import { DOCUMENTS_PRICING } from '@/config/pricing';

type SendEmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(payload: SendEmailPayload) {
  // Placeholder: plug into actual email provider (SendGrid, Resend, etc.)
  if (process.env.NODE_ENV !== 'production') {
    console.info('sendEmail called', payload);
  }
  // In production, integrate with your email service here.
}

export async function sendDocumentEmail(email: string, pdfUrl: string, documentType: string) {
  const documentConfig = DOCUMENTS_PRICING[documentType];

  if (!documentConfig) {
    throw new Error(`Configuration inconnue pour le document ${documentType}`);
  }

  await sendEmail({
    to: email,
    subject: `Votre ${documentConfig.name} - SYMIONE`,
    html: `
      <h1>Document généré avec succès</h1>
      <p>Votre ${documentConfig.name} est prêt.</p>
      <p>
        <a href="${pdfUrl}" 
           style="background: #1d4ed8; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          Télécharger le PDF
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
        <strong>Important:</strong> Ce document est généré par IA et validé 
        juridiquement. Pour des situations complexes, consultez un avocat 
        (recherche gratuite sur symione.com/conseiller).
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">
        Ce lien est valide pendant 30 jours.
      </p>
    `,
  });
}

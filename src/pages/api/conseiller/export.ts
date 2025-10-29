import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { jsPDF } from 'jspdf';

/**
 * /api/conseiller/export - Export chat session as PDF
 * 
 * Generates a professional legal analysis report from the completed chat session.
 */

interface SessionData {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: Record<string, string>;
  questionCount: number;
}

const sessions = (global as any).__SYMI_CHAT_SESSIONS__ || new Map<string, SessionData>();
(global as any).__SYMI_CHAT_SESSIONS__ = sessions;

const RequestSchema = z.object({
  sessionId: z.string().min(1).optional(),
  answers: z.record(z.unknown()).optional(),
  analysis: z.record(z.unknown()).optional(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = RequestSchema.parse(req.body);
    const { sessionId, answers: fallbackAnswers, analysis: fallbackAnalysis } = body;

    const sessionData = sessionId ? sessions.get(sessionId) : null;

    // Generate PDF using jsPDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;

    // Helper to add text with word wrap
    const addText = (text: string, fontSize: number, fontStyle: 'normal' | 'bold' = 'normal', color: [number, number, number] = [0, 0, 0]) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', fontStyle);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
    };

    // Header
    addText('ANALYSE JURIDIQUE SYMIONE', 18, 'bold', [59, 130, 246]);
    yPosition += 5;
    addText(`Session: ${sessionId}`, 10, 'normal', [107, 114, 128]);
    addText(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 10, 'normal', [107, 114, 128]);
    yPosition += 10;

    // Description initiale
    const initialDesc = (sessionData as any)?.context?.initialDescription || (fallbackAnswers as any)?.situation || (fallbackAnalysis as any)?.summary;
    if (initialDesc) {
      addText('DESCRIPTION DE LA SITUATION', 14, 'bold');
      yPosition += 3;
      addText(String(initialDesc), 11, 'normal');
      yPosition += 10;
    }

    // Informations collectées
    addText('INFORMATIONS COLLECTÉES', 14, 'bold');
    yPosition += 3;
    const infoEntries = (sessionData as any)?.context ? Object.entries((sessionData as any).context) : Object.entries((fallbackAnswers as any) || {});
    infoEntries.forEach(([key, value]: any) => {
      if (key !== 'initialDescription' && typeof value !== 'undefined' && value !== null && value !== '') {
        addText(`• ${key}: ${String(value)}`, 11, 'normal');
        yPosition += 2;
      }
    });
    yPosition += 10;

    // Conversation (derniers 10 messages max)
    addText('EXTRAIT DE LA CONVERSATION', 14, 'bold');
    yPosition += 3;
    const recentMessages = (sessionData as any)?.messages?.slice(-10) || [];
    if (recentMessages.length > 0) {
      recentMessages.forEach((msg: any) => {
        const role = msg.role === 'user' ? 'VOUS' : 'SYMIONE';
        addText(`[${role}]`, 10, 'bold', msg.role === 'user' ? [59, 130, 246] : [139, 92, 246]);
        addText(msg.content, 10, 'normal');
        yPosition += 3;
      });
    } else {
      addText('Conversation issue du mode questionnaire (18 questions).', 10, 'normal');
    }

    // Footer
    yPosition = pageHeight - 20;
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('Document généré par Symione - Assistant juridique intelligent', margin, yPosition);
    doc.text('https://www.symione.com', margin, yPosition + 5);

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="analyse-juridique-${sessionId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.status(200).send(pdfBuffer);
  } catch (error: any) {
    console.error('[export] Error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: true,
        message: 'Validation error',
        details: error.errors,
      });
    }
    return res.status(500).json({
      error: true,
      message: error.message || 'Internal server error',
    });
  }
}

export default handler;


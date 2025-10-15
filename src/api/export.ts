import type { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '@/lib/http/cors';
import { rateLimit } from '@/middleware/rateLimit';
import { ExportRequestSchema } from '@/lib/validation/schemas';
import { ErrorCode, sendError } from '@/lib/errors';
import { buildHtmlFallback, generateWithJsPdf, generateWithPdfKit, type PdfMetadata } from '@/services/export/pdf';
import { exportDocx } from '@/services/export/docx';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 405, ErrorCode.METHOD_NOT_ALLOWED, 'Method not allowed');
  }

  const rateLimited = await rateLimit(req, res);
  if (rateLimited) return rateLimited;

  try {
    const parseResult = ExportRequestSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid export request', parseResult.error.flatten());
    }

    const { contract_text, format, metadata, html } = parseResult.data;
    const headerParts = [metadata?.version ? `Version ${metadata.version}` : null, metadata?.author]
      .filter(Boolean)
      .join(' • ');

    const normalizedMetadata: PdfMetadata = {
      title: metadata?.title ?? 'Contrat généré',
      header: headerParts || undefined,
      footer: metadata?.date ?? new Date().toISOString().split('T')[0],
      author: metadata?.author,
      version: metadata?.version,
      date: metadata?.date,
    };

    if (format === 'docx') {
      const buffer = await exportDocx(contract_text, {
        title: normalizedMetadata.title,
        header: normalizedMetadata.header,
        footer: normalizedMetadata.footer,
      });
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="contract.docx"');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send(buffer);
      return;
    }

    const failures: unknown[] = [];
    let pdfBuffer: Buffer | null = null;

    try {
      pdfBuffer = await generateWithPdfKit(contract_text, normalizedMetadata);
    } catch (error) {
      failures.push(error);
      console.error('[/api/export] PDFKit generation failed', error);
    }

    if (!pdfBuffer) {
      try {
        pdfBuffer = await generateWithJsPdf(contract_text, normalizedMetadata);
      } catch (error) {
        failures.push(error);
        console.error('[/api/export] jsPDF generation failed', error);
      }
    }

    if (pdfBuffer) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="contract.pdf"');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send(pdfBuffer);
      return;
    }

    const fallbackHtml = html?.trim() ? html : buildHtmlFallback(contract_text, normalizedMetadata);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="contract.html"');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(fallbackHtml);

    if (failures.length) {
      console.warn('[/api/export] Falling back to HTML after PDF failures', failures.map((err) => String(err)));
    }
  } catch (error) {
    console.error('[/api/export] Unexpected error', error);
    return sendError(res, 500, ErrorCode.EXPORT_FAILED, 'Failed to generate document');
  }
}

export default withCors(handler);


import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { withCors } from '@/lib/http/cors';
import { GenerateRequestSchema, GenerateResponseSchema } from '@/lib/validation/schemas';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getAIClient } from '@/services/ai/adapter';
import { loadContractTemplate } from '@/services/templates/loader';
import { buildPrompt } from '@/services/ai/generate';
import { rateLimit } from '@/middleware/rateLimit';
import { startMonitor, endMonitor, logAIUsage } from '@/lib/monitoring';
import { supabaseAdmin, getUserFromRequestAuth } from '@/lib/supabase';
import type { ContractTemplate } from '@/types/contracts';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  await rateLimit(req, res);
  const { requestId, startTime } = startMonitor('/api/generate');
  try {
    // Enforce plan & monthly limits only for authenticated users
    const user = await getUserFromRequestAuth(req as any);
    const userId = user?.id;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('plan')
        .eq('id', userId)
        .maybeSingle();
      const plan = (profile?.plan as 'free' | 'pro' | 'cabinet' | 'entreprise' | undefined) || 'free';
      if (plan !== 'cabinet' && plan !== 'entreprise') {
        const limit = plan === 'pro' ? 20 : 10; // temporarily allow 10 for free plan
        const { data: row } = await supabaseAdmin
          .from('contracts_generated')
          .select('count')
          .eq('user_id', userId)
          .eq('month_key', monthKey)
          .maybeSingle();
        const current = row?.count || 0;
        if (current >= limit) {
          return res.status(403).json({ error: true, message: 'Monthly limit reached', code: 'LIMIT_REACHED' });
        }
      }
    }

    const { contract_id, user_inputs, lawyer_mode = false } = req.body;
    logger.info(`Generating contract ${contract_id}`, { lawyer_mode });

    const template = await loadContractTemplate(contract_id);
    const prompt = buildPrompt(template, user_inputs, lawyer_mode);
    const aiClient = getAIClient();
    let generatedContract = await aiClient.generate(prompt);
    logAIUsage(requestId, '/api/generate', Math.min(prompt.length / 4, 4000), process.env.AI_PROVIDER || 'local');

    // Fallback: if provider returned prompt/JSON echoes, render a clean contract from template
    const looksLikeRaw = /OPENAI_OUTPUT|USER INPUTS \(JSON\)|BASE CLAUSES|\{[\s\S]*\}/.test(generatedContract.slice(0, 800));
    if (looksLikeRaw) {
      const content = renderFromTemplate(template, user_inputs);
      if (content) generatedContract = content;
    }

    const response = {
      contract_id,
      generated_text: generatedContract,
      timestamp: new Date().toISOString(),
      lawyer_mode,
    };
    // Record generation for authenticated users only
    if (userId) {
      await supabaseAdmin
        .from('contracts_generated')
        .upsert({ user_id: userId, month_key: monthKey, count: 1 }, { onConflict: 'user_id,month_key' });
      try {
        await supabaseAdmin.rpc('increment_generation_count', { p_user_id: userId, p_month_key: monthKey });
      } catch {}
    }
    return res.status(200).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error generating contract');
    const status = (error as any)?.statusCode || 500;
    const message = (error as any)?.message || 'Failed to generate contract';
    const code = (error as any)?.code || 'GENERATION_FAILED';
    return res.status(status).json({ error: true, message, code });
  } finally {
    endMonitor(requestId, '/api/generate', startTime);
  }
}

function renderFromTemplate(tpl: ContractTemplate, inputs: Record<string, any>): string {
  const header = `${tpl.metadata.title}\nGoverning law: ${tpl.metadata.governing_law} • Jurisdiction: ${tpl.metadata.jurisdiction}\n`;
  const parties = Object.entries(inputs || {})
    .map(([k, v]) => `${k}: ${String(v ?? '')}`)
    .join('\n');
  const body = (tpl.clauses || [])
    .map((c, i) => `\n${i + 1}. ${c.title}\n${String(c.body || '').replace(/\{\{(.*?)\}\}/g, (_, key) => String((inputs || {})[String(key).trim()] ?? ''))}`)
    .join('\n');
  return `${header}\n${parties}\n${body}`;
}

export default withCors(withValidation(GenerateRequestSchema, GenerateResponseSchema, handler));


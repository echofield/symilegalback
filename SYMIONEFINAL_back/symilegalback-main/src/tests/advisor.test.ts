import { runAdvisorLoop } from '@/services/ai/advisor';

(async () => {
  const result = await runAdvisorLoop('Je veux rompre un contrat de travail.', { jurisdiction: 'FR', language: 'fr' });
  // eslint-disable-next-line no-console
  console.log('Advisor output:', result);
})();


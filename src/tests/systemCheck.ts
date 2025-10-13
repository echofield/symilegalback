import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('Testing environment variables...');
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌');

async function main() {
  try {
    console.log('Connecting to Supabase...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, anon);

    // Network health: call auth health endpoint
    const healthRes = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: anon },
    });
    if (healthRes.ok) console.log('✅ Supabase reachable (auth health)');
    else console.error('❌ Supabase auth health failed:', healthRes.status);

    // Metadata call via RPC-free lightweight check: list buckets (works even if none exist)
    const storageRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    if (storageRes.ok) console.log('✅ Supabase REST reachable (storage)');
    else console.error('❌ Supabase REST storage failed:', storageRes.status);
  } catch (e: any) {
    console.error('❌ Supabase check error:', e.message);
  }
}

main();


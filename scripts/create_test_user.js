const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

function parseEnv(path) {
  const raw = fs.readFileSync(path, 'utf8');
  const lines = raw.split(/\r?\n/);
  const out = {};
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const [kRaw, ...rest] = line.split('=');
    const k = kRaw.replace(/^\uFEFF/, '').trim();
    out[k] = rest.join('=').trim();
  }
  return out;
}

(async () => {
  const env = parseEnv('.env.local');
  console.log('parsed env keys:', Object.keys(env));
  const url = env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = env['SUPABASE_SERVICE_ROLE_KEY'];
  console.log('env object:', env);
  console.log('SUPABASE_URL:', url && url.substring(0, 30) + '...');
  console.log('SERVICE_ROLE_KEY present:', !!key);
  if (!url || !key) {
    console.error('Missing SUPABASE env in .env.local');
    process.exit(1);
  }

  const supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });

  try {
    const email = `autocreate+${Date.now()}@example.com`;
    const password = 'Password1!';

    // Use anon client signup to mimic UI signup
    const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
    const supabaseClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const signup = await supabaseClient.auth.signUp({ email, password });
    console.log('signup response:', JSON.stringify(signup, null, 2));

    // Use admin client to fetch the user id (list users may be restricted),
    // fallback: if signup returns user id, use it; otherwise try admin list.
    let userId = signup?.data?.user?.id;
    if (!userId) {
      // Try to find user via admin API (may fail depending on permissions)
      try {
        const list = await supabaseAdmin.auth.admin.listUsers();
        const found = (list?.data?.users || []).find(u => u.email === email);
        userId = found?.id;
      } catch (err) {
        console.warn('Could not list users via admin API:', err.message || err);
      }
    }

    if (userId) {
      const fetch = require('node-fetch');
      const apiRes = await fetch('http://localhost:3001/api/admin/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, email, full_name: 'Auto Test' }),
      });
      const apiJson = await apiRes.text();
      console.log('create-profile response:', apiRes.status, apiJson);
    } else {
      console.warn('User id not available after signup; profile creation deferred.');
    }
  } catch (err) {
    console.error('error creating user:', err);
  }
})();

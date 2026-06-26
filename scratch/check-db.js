const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
let supabaseUrl = '';
let supabaseAnonKey = '';
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = val;
    }
  }
} catch (e) {
  console.error('Failed to read .env.local', e);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data: sa, error: saError } = await supabase
      .from('stock_alerts')
      .select('*')
      .limit(1);

    if (saError) {
      console.log('stock_alerts table does not exist or error:', saError.message);
    } else {
      console.log('stock_alerts table exists. Columns:', sa.length > 0 ? Object.keys(sa[0]) : 'no rows to inspect');
    }

    const { data: sp, error: spError } = await supabase
      .from('store_prices')
      .select('*')
      .limit(1);

    if (spError) {
      console.log('store_prices table does not exist or error:', spError.message);
    } else {
      console.log('store_prices table exists. Columns:', sp.length > 0 ? Object.keys(sp[0]) : 'no rows to inspect');
    }

    const { data: ph, error: phError } = await supabase
      .from('price_history')
      .select('*')
      .limit(1);

    if (phError) {
      console.log('price_history table does not exist or error:', phError.message);
    } else {
      console.log('price_history table exists. Columns:', ph.length > 0 ? Object.keys(ph[0]) : 'no rows to inspect');
    }

    const { data: pa, error: paError } = await supabase
      .from('price_alerts')
      .select('*')
      .limit(1);

    if (paError) {
      console.log('price_alerts table does not exist or error:', paError.message);
    } else {
      console.log('price_alerts table exists. Columns:', pa.length > 0 ? Object.keys(pa[0]) : 'no rows to inspect');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();

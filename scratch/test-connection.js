const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  try {
    console.log('Querying phones table...');
    const { data, error } = await supabase.from('phones').select('*').limit(1);
    if (error) {
      console.error('Error querying phones:', error);
    } else {
      console.log('Successfully queried phones table.');
      if (data && data.length > 0) {
        console.log('Columns in phones table:', Object.keys(data[0]));
      } else {
        console.log('phones table is empty.');
      }
    }

    console.log('Querying sync_logs table...');
    const { data: logs, error: logsError } = await supabase.from('sync_logs').select('*').limit(1);
    if (logsError) {
      console.error('Error querying sync_logs:', logsError.message);
    } else {
      console.log('Successfully queried sync_logs table. Row count is >0:', logs.length > 0);
    }

    console.log('Querying analytics_events table...');
    const { data: events, error: eventsError } = await supabase.from('analytics_events').select('*').limit(1);
    if (eventsError) {
      console.error('Error querying analytics_events:', eventsError.message);
    } else {
      console.log('Successfully queried analytics_events table. Row count is >0:', events.length > 0);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

check();

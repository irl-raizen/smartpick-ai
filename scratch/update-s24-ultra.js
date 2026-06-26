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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const brand = 'Samsung';
  const model = 'Galaxy S24 Ultra';
  const newAmazonLink = 'https://amzn.to/4xOZ4m3';
  const newImageUrl = 'https://vlebazaar.in/image/cache/catalog/Samsung-Galaxy-S24-Ultra-5G-AI-Smartphone-Titanium-Gray-12GB-256GB-Stora/Samsung-Galaxy-S24-Ultra-5G-AI-Smartphone-Titanium-Gray-12GB-256GB-Storage-S928B-1500x1500.jpg';

  console.log(`Updating ${brand} ${model} availability and metadata...`);
  
  // First, let's fetch the existing record to see if it exists.
  const { data: phone, error: fetchError } = await supabase
    .from('phones')
    .select('id, brand, model')
    .eq('brand', brand)
    .eq('model', model)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching phone:', fetchError);
    process.exit(1);
  }

  if (!phone) {
    console.error(`Phone ${brand} ${model} not found in database!`);
    process.exit(1);
  }

  // Perform update for amazon_link, image_url, and active status/availability.
  const payload = {
    amazon_link: newAmazonLink,
    image_url: newImageUrl,
    active: true,
    market_status: 'ACTIVE',
    amazon_available: true
  };

  console.log('Updating with payload:', payload);
  const { data: updated, error: updateError } = await supabase
    .from('phones')
    .update(payload)
    .eq('id', phone.id)
    .select();

  if (updateError) {
    console.error('Error updating phone:', updateError);
    process.exit(1);
  }

  console.log('Update successful! Updated record:', updated);
}

run();

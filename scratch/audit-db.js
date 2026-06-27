const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let supabaseUrl = '';
let supabaseServiceKey = '';

try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const k = parts[0].trim();
      const v = parts.slice(1).join('=').trim();
      if (k === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = v;
      if (k === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = v;
    }
  });
} catch (e) {
  console.error('Failed to read .env.local', e);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Credentials missing');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: phones, error } = await client.from('phones').select('*');
  if (error) {
    console.error('Error fetching phones:', error);
    return;
  }

  console.log(`Total phones in database: ${phones.length}`);

  const counts = {
    image_url: 0,
    thumbnail_url: 0,
    amazon_link: 0,
    flipkart_link: 0,
    processor: 0,
    ram: 0,
    storage: 0,
    battery: 0,
    display: 0,
    ai_review: 0,
    rating: 0,
    slug: 0
  };

  phones.forEach(p => {
    if (p.image_url) counts.image_url++;
    if (p.thumbnail_url) counts.thumbnail_url++;
    if (p.amazon_link) counts.amazon_link++;
    if (p.flipkart_link) counts.flipkart_link++;
    if (p.processor || p.chipset) counts.processor++;
    if (p.ram) counts.ram++;
    if (p.storage) counts.storage++;
    if (p.battery) counts.battery++;
    if (p.display) counts.display++;
    if (p.ai_review) counts.ai_review++;
    if (p.rating) counts.rating++;
    if (p.slug) counts.slug++;
  });

  console.log('AUDIT RESULTS (Filled fields count):');
  console.log(JSON.stringify(counts, null, 2));

  console.log('\nCOMPLETENESS REPORT (Missing fields count):');
  console.log({
    total_phones: phones.length,
    missing_image_url: phones.length - counts.image_url,
    missing_thumbnail_url: phones.length - counts.thumbnail_url,
    missing_amazon_links: phones.length - counts.amazon_link,
    missing_flipkart_links: phones.length - counts.flipkart_link,
    missing_specifications: phones.length - Math.min(counts.processor || counts.chipset ? phones.length : 0, counts.battery ? phones.length : 0, counts.display ? phones.length : 0),
    missing_ai_reviews: phones.length - counts.ai_review,
    missing_ratings: phones.length - counts.rating,
    missing_slugs: phones.length - counts.slug
  });
}

run();

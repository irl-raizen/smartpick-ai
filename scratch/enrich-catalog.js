const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. Manually parse .env.local for Supabase credentials
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
  console.error('Supabase Service Role Key or URL missing in .env.local!');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Dynamic slug generator
function generatePhoneSlug(brand, model) {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Generate realistic fallback data based on price, brand, and model
function generateFallbackData(brand, model, price) {
  const brandLower = brand.toLowerCase();
  const modelLower = model.toLowerCase();

  let chipset = 'MediaTek Dimensity 7200';
  let battery = 5000;
  let display = '6.67 inch AMOLED, 120Hz, FHD+';
  let camera = '50MP Main + 8MP Ultra-Wide';
  let ram = '8GB';
  let storage = '128GB';
  let os = 'Android 14';
  let rating = 4.2;
  let imageUrl = `https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80`; // Standard fallback phone image

  // Brand-specific adjustments
  if (brandLower === 'apple') {
    os = 'iOS 17';
    battery = 3200;
    display = '6.1 inch Super Retina XDR OLED';
    chipset = 'Apple A16 Bionic';
    ram = '6GB';
    storage = '128GB';
    camera = '48MP Main + 12MP Ultra-Wide';
    imageUrl = 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80';

    if (modelLower.includes('pro') || modelLower.includes('max')) {
      chipset = 'Apple A17 Pro';
      ram = '8GB';
      storage = '256GB';
      battery = 4400;
      display = '6.7 inch Super Retina XDR OLED, 120Hz';
      camera = '48MP Main + 12MP Ultra-Wide + 12MP Telephoto';
      rating = 4.8;
    }
  } else if (brandLower === 'samsung') {
    if (modelLower.includes('ultra')) {
      chipset = 'Snapdragon 8 Gen 3';
      battery = 5000;
      display = '6.8 inch Dynamic AMOLED 2X, 120Hz, QHD+';
      camera = '200MP Main + 50MP Telephoto + 12MP Ultra-Wide';
      ram = '12GB';
      storage = '256GB';
      rating = 4.9;
      imageUrl = 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80';
    } else if (modelLower.includes('s2') || modelLower.includes('s25')) {
      chipset = 'Snapdragon 8 Gen 2';
      battery = 4000;
      display = '6.2 inch Dynamic AMOLED 2X, 120Hz';
      ram = '8GB';
      storage = '128GB';
      rating = 4.6;
    } else if (modelLower.includes('a55') || modelLower.includes('a35')) {
      chipset = 'Exynos 1480';
      battery = 5000;
      display = '6.6 inch Super AMOLED, 120Hz';
      ram = '8GB';
      storage = '128GB';
      rating = 4.3;
    }
  } else if (brandLower === 'oneplus') {
    if (modelLower.includes('12') || modelLower.includes('13')) {
      chipset = 'Snapdragon 8 Gen 3';
      battery = 5400;
      display = '6.82 inch LTPO AMOLED, 120Hz, QHD+';
      camera = '50MP Main + 64MP Telephoto + 48MP Ultra-Wide';
      ram = '16GB';
      storage = '256GB';
      rating = 4.7;
    } else {
      chipset = 'Snapdragon 7+ Gen 3';
      battery = 5500;
      display = '6.78 inch AMOLED, 120Hz';
      ram = '8GB';
      storage = '128GB';
      rating = 4.4;
    }
  } else if (brandLower === 'google') {
    chipset = 'Google Tensor G3';
    os = 'Android 14 (Pure)';
    battery = 4500;
    display = '6.2 inch Actua OLED, 120Hz';
    camera = '50MP Main + 12MP Ultra-Wide';
    ram = '8GB';
    storage = '128GB';
    rating = 4.5;
    imageUrl = 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80';

    if (modelLower.includes('pro')) {
      chipset = 'Google Tensor G4';
      ram = '16GB';
      storage = '256GB';
      battery = 5060;
      display = '6.8 inch Super Actua OLED, 120Hz';
      camera = '50MP Main + 48MP Telephoto + 48MP Ultra-Wide';
      rating = 4.7;
    }
  }

  // Adjustments based on price tier if not brand-specific
  if (price > 80000 && chipset.startsWith('MediaTek')) {
    chipset = 'Snapdragon 8 Gen 3';
    ram = '12GB';
    storage = '256GB';
    display = '6.78 inch LTPO AMOLED, 120Hz';
    rating = 4.7;
  } else if (price > 40000 && chipset.startsWith('MediaTek')) {
    chipset = 'Snapdragon 8 Gen 2';
    ram = '8GB';
    storage = '256GB';
    display = '6.7 inch AMOLED, 120Hz';
    rating = 4.5;
  } else if (price < 15000) {
    chipset = 'MediaTek Helio G85';
    ram = '4GB';
    storage = '64GB';
    battery = 5000;
    display = '6.56 inch IPS LCD, 90Hz';
    camera = '13MP Main + 2MP Depth';
    rating = 3.9;
  }

  return {
    chipset,
    processor: chipset,
    battery,
    display,
    camera,
    ram,
    storage,
    os,
    rating,
    imageUrl
  };
}

// Generate a high-quality AI review based on the specs
function generateAiReview(brand, model, specs) {
  const templates = [
    `The ${brand} ${model} is a highly capable smartphone featuring the ${specs.processor} processor. With its smooth ${specs.display} and massive ${specs.battery}mAh battery, this device delivers exceptional performance and longevity. It boasts a versatile ${specs.camera} setup, making it a stellar choice for photography enthusiasts and power users alike. Highly recommended in this segment.`,
    `Powered by the advanced ${specs.processor} chipset, the ${brand} ${model} offers a fluid multitasking experience with its ${specs.ram || '8GB'} of RAM. Its vibrant ${specs.display} is perfect for media consumption, and the long-lasting ${specs.battery}mAh battery ensures you stay connected all day. Complete with a premium build and ${specs.camera}, this phone provides outstanding value.`,
    `The ${brand} ${model} stands out as a premium contender in the market, combining the raw power of the ${specs.processor} with a gorgeous ${specs.display}. Offering a comprehensive ${specs.camera} setup and solid ${specs.os} software support, it stands as a reliable daily driver. Users will appreciate the robust ${specs.battery}mAh battery capacity and fast charging capabilities.`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

async function run() {
  console.log('Starting catalog enrichment audit and population...');

  // 1. Fetch all phones
  const { data: phones, error } = await supabaseAdmin.from('phones').select('*');
  if (error) {
    console.error('Failed to fetch phones:', error);
    process.exit(1);
  }

  console.log(`Auditing ${phones.length} phones for missing fields...`);

  const existingSlugs = new Set();
  phones.forEach(p => {
    if (p.slug) {
      existingSlugs.add(p.slug.toLowerCase().trim());
    }
  });

  let enrichedCount = 0;
  let imagesAdded = 0;
  let specsAdded = 0;
  let amazonAdded = 0;
  let flipkartAdded = 0;
  let reviewsGenerated = 0;

  for (const phone of phones) {
    const brand = phone.brand;
    const model = phone.model;
    const price = phone.price || 19999;

    const needsSlug = !phone.slug;
    const needsImage = !phone.image_url;
    const needsAmazon = !phone.amazon_link;
    const needsFlipkart = !phone.flipkart_link;
    const needsSpecs = !phone.processor || phone.chipset === 'Unknown';
    const needsReview = !phone.ai_review;
    const needsRating = !phone.rating;

    // If everything is already filled, skip this phone
    if (!needsSlug && !needsImage && !needsAmazon && !needsFlipkart && !needsSpecs && !needsReview && !needsRating) {
      continue;
    }

    console.log(`Enriching ${brand} ${model} (ID: ${phone.id})...`);

    // Generate enrichment data
    const fallback = generateFallbackData(brand, model, price);
    const updatePayload = {};

    if (needsSlug) {
      let baseSlug = generatePhoneSlug(brand, model);
      if (existingSlugs.has(baseSlug)) {
        baseSlug = `${baseSlug}-${phone.id}`;
      }
      updatePayload.slug = baseSlug;
      existingSlugs.add(baseSlug);
    }

    if (needsImage) {
      updatePayload.image_url = fallback.imageUrl;
      updatePayload.thumbnail_url = fallback.imageUrl;
      updatePayload.image_source = 'fallback';
      imagesAdded++;
    }

    if (needsAmazon) {
      updatePayload.amazon_link = `https://www.amazon.in/s?k=${encodeURIComponent(brand + ' ' + model)}&tag=smartpickai02-21`;
      amazonAdded++;
    }

    if (needsFlipkart) {
      updatePayload.flipkart_link = `https://www.flipkart.com/search?q=${encodeURIComponent(brand + ' ' + model)}&otracker=search`;
      flipkartAdded++;
    }

    if (needsSpecs) {
      updatePayload.chipset = fallback.chipset;
      updatePayload.processor = fallback.processor;
      // Convert battery string to integer if needed
      updatePayload.battery = typeof fallback.battery === 'number' ? fallback.battery : parseInt(fallback.battery, 10) || 5000;
      updatePayload.display = fallback.display;
      updatePayload.camera = fallback.camera;
      updatePayload.ram = fallback.ram;
      updatePayload.storage = fallback.storage;
      updatePayload.os = fallback.os;
      updatePayload.launch_year = fallback.launchYear || 2024;
      specsAdded++;
    }

    // Merge active specs for AI review generation
    const activeSpecs = {
      processor: phone.chipset && phone.chipset !== 'Unknown' ? phone.chipset : fallback.chipset,
      display: phone.display && phone.display !== 'Unknown' ? phone.display : fallback.display,
      battery: phone.battery || fallback.battery,
      camera: phone.camera && phone.camera !== 'Unknown' ? phone.camera : fallback.camera,
      ram: phone.ram || fallback.ram,
      storage: phone.storage || fallback.storage,
      os: phone.os || fallback.os
    };

    if (needsReview) {
      updatePayload.ai_review = generateAiReview(brand, model, activeSpecs);
      reviewsGenerated++;
    }

    if (needsRating) {
      updatePayload.rating = fallback.rating;
    }

    // Run the update query using supabaseAdmin
    const { error: updateError } = await supabaseAdmin
      .from('phones')
      .update(updatePayload)
      .eq('id', phone.id);

    if (updateError) {
      console.error(`Failed to update ${brand} ${model}:`, updateError.message);
    } else {
      enrichedCount++;
    }
  }

  // Double check how many phones are still incomplete
  const { data: finalPhones } = await supabaseAdmin.from('phones').select('*');
  let incompleteCount = 0;
  finalPhones.forEach(p => {
    if (!p.image_url || !p.amazon_link || !p.flipkart_link || !p.processor || !p.ai_review || !p.slug) {
      incompleteCount++;
    }
  });

  console.log('\n==================================================');
  console.log('CATALOG ENRICHMENT FINAL REPORT:');
  console.log(`- Total Phones Processed       : ${phones.length}`);
  console.log(`- Total Phones Enriched        : ${enrichedCount}`);
  console.log(`- Images Added                 : ${imagesAdded}`);
  console.log(`- Specifications Populated     : ${specsAdded}`);
  console.log(`- Amazon Links Added           : ${amazonAdded}`);
  console.log(`- Flipkart Links Added          : ${flipkartAdded}`);
  console.log(`- AI Reviews Generated         : ${reviewsGenerated}`);
  console.log(`- Phones Still Incomplete      : ${incompleteCount}`);
  console.log('==================================================\n');
}

run();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Manually parse .env.local for Supabase credentials
let supabaseUrl = '';
let supabaseServiceKey = '';

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
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = val;
    }
  }
} catch (e) {
  console.error('Failed to read .env.local', e);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase Service Role Key or URL missing in .env.local!');
  process.exit(1);
}

// Create dedicated admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Simple CSV parser that handles quotes and commas
function parseCSV(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)//g) || line.split(',');
    // Clean up matches
    const row = matches.map(v => v.trim().replace(/^"|"$/g, ''));

    if (row.length === 0 || row.join('') === '') continue;

    const record = {};
    headers.forEach((h, index) => {
      record[h] = row[index] || '';
    });
    records.push(record);
  }
  return records;
}

// Dynamic slug generator fallback
function generatePhoneSlug(brand, model) {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Dynamic configuration of missing columns to avoid repeated attempts
const missingColumns = new Set();

async function insertWithFallback(payload) {
  let attemptPayload = { ...payload };
  
  // Remove columns we already know are missing
  missingColumns.forEach(col => {
    delete attemptPayload[col];
  });

  while (true) {
    const { error } = await supabaseAdmin.from('phones').insert(attemptPayload);
    if (!error) return { success: true };

    const msg = error.message || '';
    let columnRemoved = false;

    // Check for PostgREST schema cache missing column error
    const matchCache = msg.match(/Could not find the '(.*?)' column/);
    if (matchCache && matchCache[1] && matchCache[1] in attemptPayload) {
      const col = matchCache[1];
      missingColumns.add(col);
      delete attemptPayload[col];
      columnRemoved = true;
    }

    // Check for standard PostgreSQL undefined_column code
    if (!columnRemoved && error.code === '42703') {
      const matchDb = msg.match(/column "(.*?)"/);
      if (matchDb && matchDb[1] && matchDb[1] in attemptPayload) {
        const col = matchDb[1];
        missingColumns.add(col);
        delete attemptPayload[col];
        columnRemoved = true;
      }
    }

    // If we removed a column, try again. Otherwise return the failure.
    if (columnRemoved) {
      continue;
    }

    return { success: false, error: error.message };
  }
}

async function updateWithFallback(id, payload) {
  let attemptPayload = { ...payload };

  // Remove columns we already know are missing
  missingColumns.forEach(col => {
    delete attemptPayload[col];
  });

  while (true) {
    if (Object.keys(attemptPayload).length === 0) return { success: true };

    const { error } = await supabaseAdmin.from('phones').update(attemptPayload).eq('id', id);
    if (!error) return { success: true };

    const msg = error.message || '';
    let columnRemoved = false;

    const matchCache = msg.match(/Could not find the '(.*?)' column/);
    if (matchCache && matchCache[1] && matchCache[1] in attemptPayload) {
      const col = matchCache[1];
      missingColumns.add(col);
      delete attemptPayload[col];
      columnRemoved = true;
    }

    if (!columnRemoved && error.code === '42703') {
      const matchDb = msg.match(/column "(.*?)"/);
      if (matchDb && matchDb[1] && matchDb[1] in attemptPayload) {
        const col = matchDb[1];
        missingColumns.add(col);
        delete attemptPayload[col];
        columnRemoved = true;
      }
    }

    if (columnRemoved) {
      continue;
    }

    return { success: false, error: error.message };
  }
}

async function run() {
  console.log('Starting catalog import using supabaseAdmin...');

  // 2. Fetch all existing phones to match by brand/model
  console.log('Fetching current database phones...');
  const { data: dbPhones, error: fetchError } = await supabaseAdmin
    .from('phones')
    .select('id, brand, model');

  if (fetchError) {
    console.error('Failed to fetch existing phones from DB:', fetchError);
    process.exit(1);
  }

  console.log(`Loaded ${dbPhones.length} existing phones from database.`);

  const existingMap = new Map();
  dbPhones.forEach(p => {
    const key = `${p.brand.toLowerCase().trim()}|${p.model.toLowerCase().trim()}`;
    existingMap.set(key, p.id);
  });

  // 3. Read CSV file
  const csvPath = path.join(__dirname, '..', 'phones_links_update.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  
  // Custom parsing loop since split may miss quotes
  const lines = csvContent.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    console.error('Empty CSV file.');
    process.exit(1);
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const csvRecords = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const row = [];
    let currentVal = '';
    let inQuotes = false;

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const c = line[charIdx];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        row.push(currentVal.trim().replace(/^"|"$/g, ''));
        currentVal = '';
      } else {
        currentVal += c;
      }
    }
    row.push(currentVal.trim().replace(/^"|"$/g, ''));

    if (row.length === 0 || row.join('') === '') continue;

    const record = {};
    headers.forEach((h, index) => {
      record[h] = row[index] || '';
    });
    csvRecords.push(record);
  }

  console.log(`Parsed ${csvRecords.length} records from CSV.`);

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let imagesImported = 0;
  let errorCount = 0;
  const errorsList = [];

  for (const record of csvRecords) {
    const brand = record.brand || '';
    const model = record.model || '';
    const imageUrl = record.image_url || '';
    const amazonLink = record.amazon_link || '';

    if (!brand || !model) {
      skippedCount++;
      continue;
    }

    const key = `${brand.toLowerCase().trim()}|${model.toLowerCase().trim()}`;
    const existingId = existingMap.get(key);

    if (existingId) {
      // Phone exists -> Update it (specifically links/images from CSV)
      const payload = {};
      if (amazonLink) payload.amazon_link = amazonLink;
      if (imageUrl) {
        payload.image_url = imageUrl;
        payload.thumbnail_url = imageUrl;
        payload.image_source = 'csv';
      }

      if (Object.keys(payload).length > 0) {
        const result = await updateWithFallback(existingId, payload);
        if (!result.success) {
          console.error(`Failed to update ${brand} ${model} (ID: ${existingId}):`, result.error);
          errorCount++;
          errorsList.push({ phone: `${brand} ${model}`, op: 'update', error: result.error });
        } else {
          updatedCount++;
          if (imageUrl && !missingColumns.has('image_url')) {
            imagesImported++;
          }
        }
      } else {
        skippedCount++;
      }
    } else {
      // Phone does not exist -> Insert it
      const payload = {
        brand,
        model,
        price: 19999,
        chipset: 'Unknown',
        battery: 5000,
        camera: 'Unknown',
        display: 'Unknown',
        score_camera: 5,
        score_gaming: 5,
        score_battery: 5,
        image_url: imageUrl || null,
        thumbnail_url: imageUrl || null,
        image_source: imageUrl ? 'csv' : null,
        amazon_link: amazonLink || null,
        active: true,
        market_status: 'ACTIVE',
        slug: generatePhoneSlug(brand, model)
      };

      const result = await insertWithFallback(payload);
      if (!result.success) {
        console.error(`Failed to insert new phone ${brand} ${model}:`, result.error);
        errorCount++;
        errorsList.push({ phone: `${brand} ${model}`, op: 'insert', error: result.error });
      } else {
        insertedCount++;
        if (imageUrl && !missingColumns.has('image_url')) {
          imagesImported++;
        }
      }
    }
  }

  console.log('\n==================================================');
  console.log('IMPORT CATALOG SUMMARY REPORT:');
  console.log(`- Total Phones Processed : ${csvRecords.length}`);
  console.log(`- Total Phones Inserted  : ${insertedCount}`);
  console.log(`- Total Phones Updated   : ${updatedCount}`);
  console.log(`- Total Phones Skipped   : ${skippedCount}`);
  console.log(`- Total Images Imported  : ${imagesImported}`);
  console.log(`- Total Failures         : ${errorCount}`);
  console.log(`- Detected Missing DB Columns (Stripped): [ ${Array.from(missingColumns).join(', ')} ]`);
  if (errorsList.length > 0) {
    console.log('\nFAILURES DETAILS:');
    errorsList.forEach((e, idx) => {
      console.log(`  ${idx + 1}. [${e.op.toUpperCase()}] ${e.phone}: ${e.error}`);
    });
  }
  console.log('==================================================\n');
}

run();

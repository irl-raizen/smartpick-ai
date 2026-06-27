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

function parseCSV(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const headers = lines[0].split(',');
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const row = [];
    let insideQuotes = false;
    let currentVal = '';

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row.push(currentVal.trim());
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    row.push(currentVal.trim());

    if (row.length === headers.length) {
      const rec = {};
      headers.forEach((h, idx) => {
        rec[h] = row[idx];
      });
      records.push(rec);
    }
  }
  return records;
}

// Escapes single quotes for SQL insertion
function sqlEscape(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/'/g, "''");
}

async function run() {
  // 1. Fetch existing phones from DB to prevent duplicates
  console.log('Fetching existing phones from DB...');
  const { data: dbPhones, error } = await supabase
    .from('phones')
    .select('brand, model');

  if (error) {
    console.error('Error fetching phones from DB:', error.message);
    process.exit(1);
  }

  const existingSet = new Set(
    dbPhones.map(p => `${p.brand.toLowerCase().trim()}|${p.model.toLowerCase().trim()}`)
  );
  console.log(`Loaded ${existingSet.size} existing phones from DB.`);

  // 2. Read CSV file
  const csvPath = path.join(__dirname, '..', 'phones_links_update.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at: ${csvPath}`);
    process.exit(1);
  }

  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const csvRecords = parseCSV(csvContent);
  console.log(`Parsed ${csvRecords.length} records from CSV.`);

  // 3. Filter out duplicates
  const toInsert = [];
  for (const r of csvRecords) {
    if (!r.brand || !r.model) {
      // Skip empty rows
      continue;
    }
    const key = `${r.brand.toLowerCase().trim()}|${r.model.toLowerCase().trim()}`;
    if (!existingSet.has(key)) {
      toInsert.push(r);
    }
  }

  console.log(`Found ${toInsert.length} new phones to insert.`);

  if (toInsert.length === 0) {
    console.log('No new phones to insert.');
    return;
  }

  // 4. Generate SQL statements in chunks of 100
  const sqlLines = [];
  sqlLines.push('-- SQL Migration: Insert new phones from CSV catalog update');
  sqlLines.push('-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/eujxuoexexbzgqstnfft/sql/new)\n');

  const chunkSize = 100;
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);
    
    sqlLines.push('INSERT INTO phones (brand, model, price, chipset, battery, camera, display, score_camera, score_gaming, score_battery, image_url, amazon_link, active, market_status) VALUES');
    
    const valuesList = chunk.map((p, idx) => {
      const isLast = idx === chunk.length - 1;
      const cleanImg = p.image_url ? p.image_url.replace(/"/g, '') : '';
      const cleanAmzn = p.amazon_link ? p.amazon_link.replace(/"/g, '') : '';
      
      const brandStr = sqlEscape(p.brand);
      const modelStr = sqlEscape(p.model);
      const imgStr = sqlEscape(cleanImg);
      const amznStr = sqlEscape(cleanAmzn);

      return `('${brandStr}', '${modelStr}', 19999, 'Unknown', 5000, 'Unknown', 'Unknown', 5, 5, 5, '${imgStr}', '${amznStr}', true, 'ACTIVE')${isLast ? ';' : ','}`;
    });

    sqlLines.push(valuesList.join('\n'));
    sqlLines.push(''); // spacing
  }

  const sqlContent = sqlLines.join('\n');
  const outputPath = path.join(__dirname, '..', 'scratch', 'insert_new_phones.sql');
  fs.writeFileSync(outputPath, sqlContent, 'utf8');
  console.log(`Successfully generated SQL insert script at: ${outputPath}`);
}

run();

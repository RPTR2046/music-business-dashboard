/**
 * Script to generate a large test CSV file
 * Run with: npx tsx tests/fixtures/generate-large-csv.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_FILE = path.join(__dirname, 'distrokid-large.csv');
const ROW_COUNT = 10000; // Adjust as needed for testing

const stores = ['Spotify', 'Apple Music', 'Amazon Music', 'YouTube Music', 'TikTok', 'Deezer', 'Tidal', 'Pandora'];
const countries = ['US', 'GB', 'DE', 'FR', 'CA', 'AU', 'JP', 'MX', 'BR', 'ES', 'IT', 'NL', 'SE', 'NO'];
const artists = ['Test Artist', 'Demo Band', 'Sample Singer', 'Synthetic Sounds', 'Generated Music'];
const titles = [
  'Midnight Dreams', 'Ocean Waves', 'City Lights', 'Starlight', 'Mountain High',
  'River Flow', 'Desert Wind', 'Forest Rain', 'Thunder Storm', 'Gentle Breeze',
  'Morning Sun', 'Evening Moon', 'Spring Bloom', 'Summer Heat', 'Autumn Leaves',
  'Winter Snow', 'Electric Night', 'Acoustic Day', 'Distant Memory', 'Future Vision'
];
const months = ['2024-10', '2024-11', '2024-12', '2025-01'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomEarnings(): string {
  return (Math.random() * 2).toFixed(8);
}

function generateISRC(index: number): string {
  return `USTEST${String(index).padStart(7, '0')}`;
}

function generateUPC(index: number): string {
  return `1234567${String(index).padStart(5, '0')}`;
}

function generateRow(index: number): string {
  const date = '2025-01-15';
  const saleMonth = randomItem(months);
  const store = randomItem(stores);
  const artist = randomItem(artists);
  const title = randomItem(titles);
  const isrc = generateISRC(index % 100); // Reuse ISRCs to create realistic grouping
  const upc = generateUPC(index % 50);
  const quantity = randomInt(1, 500);
  const teamPct = randomItem([50, 100]);
  const country = randomItem(countries);
  const earnings = randomEarnings();

  return `"${date}","${date}","${saleMonth}","${store}","${artist}","${title}","${isrc}","${upc}","${quantity}","${teamPct}","Song","${country}","0.00000","${earnings}",""`;
}

function generateCSV() {
  console.log(`Generating ${ROW_COUNT} rows...`);

  const header = '"Date Inserted","Reporting Date","Sale Month","Store","Artist","Title","ISRC","UPC","Quantity","Team Percentage","Source Type","Country of Sale","Songwriter Royalties Withheld (USD)","Earnings (USD)","Recoup (USD)"';

  const rows = [header];
  for (let i = 0; i < ROW_COUNT; i++) {
    rows.push(generateRow(i));
    if (i % 1000 === 0) {
      process.stdout.write(`\rGenerated ${i} rows...`);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, rows.join('\n'));
  console.log(`\nWritten to ${OUTPUT_FILE}`);
  console.log(`File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);
}

generateCSV();

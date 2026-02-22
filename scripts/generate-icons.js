/**
 * Icon Generation Script for NAPLAN Prep PWA
 * 
 * This script generates placeholder PNG icons for the PWA.
 * For production, replace these with properly designed icons
 * using the SVG source at src/icons/icon-source.svg
 * 
 * Usage: node scripts/generate-icons.js
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple PNG encoder for solid color placeholder icons
function createPNG(width, height, r, g, b) {
  // PNG file structure
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdr = createChunk('IHDR', ihdrData);
  
  // IDAT chunk - create raw image data
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      // Create a simple gradient effect for visibility
      const factor = Math.min(1, (x / width) * 0.3 + (y / height) * 0.3);
      rawData.push(Math.floor(r * (1 - factor * 0.3)));
      rawData.push(Math.floor(g * (1 - factor * 0.3)));
      rawData.push(Math.floor(b * (1 - factor * 0.3)));
    }
  }
  
  // Compress using deflate
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = createChunk('IDAT', compressed);
  
  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  
  return Buffer.concat([length, typeBuffer, data, crc]);
}

// CRC32 calculation
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = makeCRCTable();
  
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
  }
  
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeCRCTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
  return table;
}

// Create icons directory
const iconsDir = join(__dirname, '..', 'src', 'icons');
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Generate icons with app theme colors (purple gradient: #667eea)
const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 }
];

console.log('Generating placeholder icons...');

for (const { name, size } of sizes) {
  const png = await createPNG(size, size, 102, 126, 234); // #667eea
  const path = join(iconsDir, name);
  writeFileSync(path, png);
  console.log(`Created ${path}`);
}

console.log('\nNote: These are placeholder icons.');
console.log('For production, replace with icons generated from src/icons/icon-source.svg');
console.log('You can use online tools like https://realfavicongenerator.net/');

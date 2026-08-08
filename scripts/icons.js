const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <path d="M14,42 L14,22 C14,12 22,4 32,4 C42,4 50,12 50,22 L50,42 Z" fill="#3c5b0a"/>
  <rect x="10" y="42" width="44" height="14" rx="3" fill="#3c5b0a"/>
  <circle cx="24" cy="24" r="2.5" fill="#fee348"/>
  <circle cx="40" cy="32" r="2.5" fill="#fee348"/>
  <line x1="27" y1="32" x2="37" y2="24" stroke="#fee348" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const dir = path.join(__dirname, '..', 'public');

async function generate() {
  const sizes = [16, 32, 48, 180, 192, 512];
  for (const size of sizes) {
    await sharp(Buffer.from(SVG))
      .resize(size, size)
      .png()
      .toFile(path.join(dir, size === 180 ? 'apple-touch-icon.png' : `favicon-${size}x${size}.png`));
    console.log(`  favicon-${size}x${size}.png`);
  }

  const ico16 = await sharp(Buffer.from(SVG)).resize(16, 16).png().toBuffer();
  const ico32 = await sharp(Buffer.from(SVG)).resize(32, 32).png().toBuffer();
  const ico48 = await sharp(Buffer.from(SVG)).resize(48, 48).png().toBuffer();

  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(3, 4);

  const entries = [];
  const images = [ico16, ico32, ico48];
  const dims = [16, 32, 48];
  let dataOffset = 6 + (3 * 16);
  for (let i = 0; i < 3; i++) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(dims[i], 0);
    entry.writeUInt8(dims[i], 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(images[i].length, 8);
    entry.writeUInt32LE(dataOffset, 12);
    entries.push(entry);
    dataOffset += images[i].length;
  }

  const ico = Buffer.concat([icoHeader, ...entries, ...images]);
  fs.writeFileSync(path.join(dir, 'favicon.ico'), ico);
  console.log('  favicon.ico');

  const manifest = {
    name: 'Kitchen Deals',
    short_name: 'Kitchen Deals',
    icons: [
      { src: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/favicon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    theme_color: '#3c5b0a',
    background_color: '#ffffff',
    display: 'standalone',
  };
  fs.writeFileSync(path.join(dir, 'site.webmanifest'), JSON.stringify(manifest, null, 2));
  console.log('  site.webmanifest');

  console.log('Done! All favicon assets generated.');
}

generate().catch(err => { console.error(err); process.exit(1); });

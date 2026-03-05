const fs = require('fs');
const path = require('path');

// Create a simple 1x1 transparent PNG for each size
// In production, you'd want proper icons, but this allows the PWA to work
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Minimal PNG header for a 1x1 transparent pixel (scaled up)
// This is a base64 encoded 1x1 transparent PNG
const transparentPixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// For now, copy the SVG for all sizes and let the browser handle it
// In production, you'd generate proper PNGs
const svgContent = fs.readFileSync(path.join(iconsDir, 'icon.svg'), 'utf8');

sizes.forEach(size => {
  // Create a sized version of the SVG
  const sizedSvg = svgContent.replace('viewBox="0 0 512 512"', `width="${size}" height="${size}" viewBox="0 0 512 512"`);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), sizedSvg);
  console.log(`Created icon-${size}x${size}.svg`);
});

console.log('Icons generated successfully!');

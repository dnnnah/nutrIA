scripts// scripts/generate-icons.mjs
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

// SVG del ícono NUTRIA — letra N azul sobre fondo blanco
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Fondo con bordes redondeados -->
  <rect width="512" height="512" rx="115" ry="115" fill="#FFFFFF"/>
  
  <!-- Letra N en azul Apple -->
  <text
    x="256"
    y="365"
    font-family="-apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif"
    font-size="320"
    font-weight="700"
    fill="#007AFF"
    text-anchor="middle"
    dominant-baseline="auto"
    letter-spacing="-8"
  >N</text>
  
  <!-- Punto verde — indica app activa/clínica -->
  <circle cx="390" cy="140" r="42" fill="#34C759"/>
</svg>
`;

const svgBuffer = Buffer.from(svgIcon);

async function generateIcons() {
  // 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');
  console.log('✅ icon-192.png generado');

  // 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');
  console.log('✅ icon-512.png generado');

  // Bonus: apple-touch-icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('✅ apple-touch-icon.png generado');
}

generateIcons().catch(console.error);
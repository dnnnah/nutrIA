import sharp from 'sharp';

const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="115" ry="115" fill="#FFFFFF"/>
  <text
    x="256"
    y="365"
    font-family="Helvetica Neue, sans-serif"
    font-size="320"
    font-weight="700"
    fill="#007AFF"
    text-anchor="middle"
  >N</text>
  <circle cx="390" cy="140" r="42" fill="#34C759"/>
</svg>
`;

const svgBuffer = Buffer.from(svgIcon);

await sharp(svgBuffer).resize(192, 192).png().toFile('public/icon-192.png');
console.log('✅ icon-192.png');

await sharp(svgBuffer).resize(512, 512).png().toFile('public/icon-512.png');
console.log('✅ icon-512.png');

await sharp(svgBuffer).resize(180, 180).png().toFile('public/apple-touch-icon.png');
console.log('✅ apple-touch-icon.png');

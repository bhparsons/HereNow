const sharp = require("sharp");
const path = require("path");

const ASSETS = path.join(__dirname, "..", "assets");
const STRIPE_WIDTH = 40;
const BORDER_SIZE = 60;

/**
 * Generate a caution-tape SVG overlay (yellow/black diagonal stripes around the border).
 * The center is transparent so the original icon shows through.
 */
function cautionTapeSvg(size) {
  // Build diagonal stripe pattern — 45-degree yellow/black bars
  const stripeSpacing = STRIPE_WIDTH * 2;
  // We need stripes covering the full diagonal, so extend range
  const diag = size * 2;
  const stripes = [];
  for (let offset = -diag; offset < diag; offset += stripeSpacing) {
    stripes.push(
      `<rect x="${offset}" y="0" width="${STRIPE_WIDTH}" height="${diag}" fill="#000000"/>`
    );
  }

  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="caution" width="${stripeSpacing}" height="${stripeSpacing}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="${stripeSpacing}" height="${stripeSpacing}" fill="#FFD600"/>
      <rect width="${STRIPE_WIDTH}" height="${stripeSpacing}" fill="#000000"/>
    </pattern>
    <mask id="borderMask">
      <!-- Full white = visible -->
      <rect width="${size}" height="${size}" fill="white"/>
      <!-- Black center = transparent hole -->
      <rect x="${BORDER_SIZE}" y="${BORDER_SIZE}" width="${size - BORDER_SIZE * 2}" height="${size - BORDER_SIZE * 2}" rx="40" fill="black"/>
    </mask>
  </defs>
  <!-- Caution tape border -->
  <rect width="${size}" height="${size}" fill="url(#caution)" mask="url(#borderMask)"/>
</svg>`;
}

async function generateDevIcon(inputPath, outputPath) {
  const meta = await sharp(inputPath).metadata();
  const size = meta.width;

  const overlay = Buffer.from(cautionTapeSvg(size));

  await sharp(inputPath)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toFile(outputPath);

  console.log(`Generated ${outputPath} (${size}x${size})`);
}

async function main() {
  // Main app icon
  await generateDevIcon(
    path.join(ASSETS, "icon-light.png"),
    path.join(ASSETS, "icon-light-dev.png")
  );

  // Android adaptive foreground
  await generateDevIcon(
    path.join(ASSETS, "android-icon-foreground.png"),
    path.join(ASSETS, "android-icon-foreground-dev.png")
  );
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

import sharp from "sharp";
import path from "path";
import fs from "fs";

const OUTPUT_DIR = path.join(__dirname, "..", "assets", "mockups");
const SIZE = 1024;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Option 1: Vibrant Lettermark — Bold "HN" on lime-to-purple gradient
const option1Svg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A3E635"/>
      <stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" rx="220" fill="url(#bg1)"/>
  <text x="512" y="580" font-family="Arial Black, Impact, sans-serif" font-weight="900"
        font-size="480" fill="white" text-anchor="middle" letter-spacing="-20">HN</text>
</svg>`;

// Option 2: Vibrant Pulse Dot — Glowing green dot with purple pulse rings on dark bg
const option2Svg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#0d0d1a"/>
    </radialGradient>
    <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4ADE80"/>
      <stop offset="60%" stop-color="#22C55E"/>
      <stop offset="100%" stop-color="#16A34A"/>
    </radialGradient>
    <filter id="blur2" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="20"/>
    </filter>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" rx="220" fill="url(#glow2)"/>
  <!-- Outer pulse ring -->
  <circle cx="512" cy="512" r="340" fill="none" stroke="#7C3AED" stroke-width="3" opacity="0.25"/>
  <!-- Middle pulse ring -->
  <circle cx="512" cy="512" r="260" fill="none" stroke="#A78BFA" stroke-width="4" opacity="0.4"/>
  <!-- Inner pulse ring -->
  <circle cx="512" cy="512" r="180" fill="none" stroke="#C4B5FD" stroke-width="5" opacity="0.55"/>
  <!-- Glow behind dot -->
  <circle cx="512" cy="512" r="120" fill="#4ADE80" opacity="0.3" filter="url(#blur2)"/>
  <!-- Main dot -->
  <circle cx="512" cy="512" r="90" fill="url(#dotGlow)"/>
  <!-- Highlight -->
  <circle cx="490" cy="490" r="30" fill="white" opacity="0.3"/>
</svg>`;

// Option 2b: Vibrant Pulse Dot with faint HN behind
const option2bSvg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow2b" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#0d0d1a"/>
    </radialGradient>
    <radialGradient id="dotGlow2b" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4ADE80"/>
      <stop offset="60%" stop-color="#22C55E"/>
      <stop offset="100%" stop-color="#16A34A"/>
    </radialGradient>
    <filter id="blur2b" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="20"/>
    </filter>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" rx="220" fill="url(#glow2b)"/>
  <!-- Faint HN lettermark behind everything — vertically centered -->
  <text x="512" y="680" font-family="Arial Black, Impact, sans-serif" font-weight="900"
        font-size="520" fill="white" text-anchor="middle" letter-spacing="-20" opacity="0.06">HN</text>
  <!-- Outer pulse ring -->
  <circle cx="512" cy="512" r="340" fill="none" stroke="#7C3AED" stroke-width="3" opacity="0.25"/>
  <!-- Middle pulse ring -->
  <circle cx="512" cy="512" r="260" fill="none" stroke="#A78BFA" stroke-width="4" opacity="0.4"/>
  <!-- Inner pulse ring -->
  <circle cx="512" cy="512" r="180" fill="none" stroke="#C4B5FD" stroke-width="5" opacity="0.55"/>
  <!-- Glow behind dot -->
  <circle cx="512" cy="512" r="120" fill="#4ADE80" opacity="0.3" filter="url(#blur2b)"/>
  <!-- Main dot -->
  <circle cx="512" cy="512" r="90" fill="url(#dotGlow2b)"/>
  <!-- Highlight -->
  <circle cx="490" cy="490" r="30" fill="white" opacity="0.3"/>
</svg>`;

// Option 3: Minimal Signal — Black bg, single lime green dot with subtle ring
const option3Svg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="dotGlow3" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#BFFF00"/>
      <stop offset="100%" stop-color="#84CC16"/>
    </radialGradient>
    <filter id="blur3" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" rx="220" fill="#0A0A0A"/>
  <!-- Subtle outer ring -->
  <circle cx="512" cy="512" r="200" fill="none" stroke="#BFFF00" stroke-width="3" opacity="0.2"/>
  <!-- Soft glow -->
  <circle cx="512" cy="512" r="100" fill="#BFFF00" opacity="0.15" filter="url(#blur3)"/>
  <!-- Core dot -->
  <circle cx="512" cy="512" r="80" fill="url(#dotGlow3)"/>
</svg>`;

// Option 4: Warm Chat Bubble — Peach/coral gradient bg with white chat bubble + green dot
const option4Svg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FED7AA"/>
      <stop offset="50%" stop-color="#FDBA74"/>
      <stop offset="100%" stop-color="#FB923C"/>
    </linearGradient>
    <filter id="shadow4" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="15" flood-color="#00000033"/>
    </filter>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" rx="220" fill="url(#bg4)"/>
  <!-- Chat bubble — vertically centered -->
  <rect x="160" y="220" width="704" height="440" rx="90" fill="white" filter="url(#shadow4)"/>
  <!-- Bubble tail — left side -->
  <polygon points="230,660 310,660 200,760" fill="white"/>
  <!-- Ellipsis dots -->
  <circle cx="370" cy="440" r="36" fill="#AAAAAA"/>
  <circle cx="512" cy="440" r="36" fill="#AAAAAA"/>
  <circle cx="654" cy="440" r="36" fill="#AAAAAA"/>
  <!-- Green availability dot — top-right corner of bubble -->
  <circle cx="790" cy="290" r="58" fill="#22C55E"/>
  <!-- Dot highlight -->
  <circle cx="776" cy="276" r="19" fill="white" opacity="0.35"/>
</svg>`;

// Option 2c: Coral/Teal Pulse Dot with faint HN — warm palette variant
const option2cSvg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow2c" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0f0f1a"/>
      <stop offset="100%" stop-color="#060610"/>
    </radialGradient>
    <radialGradient id="dotGlow2c" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#34D399"/>
      <stop offset="60%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#059669"/>
    </radialGradient>
    <filter id="blur2c" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="20"/>
    </filter>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" rx="220" fill="url(#glow2c)"/>
  <!-- Faint HN lettermark behind everything — vertically centered -->
  <text x="512" y="680" font-family="Arial Black, Impact, sans-serif" font-weight="900"
        font-size="520" fill="#FF6B6B" text-anchor="middle" letter-spacing="-20" opacity="0.07">HN</text>
  <!-- Outer pulse ring — Coral -->
  <circle cx="512" cy="512" r="340" fill="none" stroke="#FF6B6B" stroke-width="3" opacity="0.25"/>
  <!-- Middle pulse ring — Coral/Indigo blend -->
  <circle cx="512" cy="512" r="260" fill="none" stroke="#FF8F8F" stroke-width="4" opacity="0.35"/>
  <!-- Inner pulse ring — lighter Coral -->
  <circle cx="512" cy="512" r="180" fill="none" stroke="#FFB3B3" stroke-width="5" opacity="0.45"/>
  <!-- Glow behind dot — Teal -->
  <circle cx="512" cy="512" r="120" fill="#10B981" opacity="0.3" filter="url(#blur2c)"/>
  <!-- Main dot — Teal -->
  <circle cx="512" cy="512" r="90" fill="url(#dotGlow2c)"/>
  <!-- Highlight -->
  <circle cx="490" cy="490" r="30" fill="white" opacity="0.3"/>
</svg>`;

// Light mode icon — realistic glow, full square (iOS applies its own mask)
const iconLightSvg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Subtle warm-to-cool radial background -->
    <radialGradient id="lightBg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#F0EEF5"/>
      <stop offset="100%" stop-color="#E4E0ED"/>
    </radialGradient>

    <!-- Center dot gradient: light purple to deep indigo -->
    <radialGradient id="dotGradLight" cx="45%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#B794F6"/>
      <stop offset="50%" stop-color="#7C3AED"/>
      <stop offset="100%" stop-color="#4C1D95"/>
    </radialGradient>

    <!-- Wide ambient haze -->
    <filter id="glowWide" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="80" result="blur"/>
    </filter>

    <!-- Medium glow spread -->
    <filter id="glowMed" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="40" result="blur"/>
    </filter>

    <!-- Tight bright core glow -->
    <filter id="glowTight" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="15" result="blur"/>
    </filter>

    <!-- Ring glow filters -->
    <filter id="ringGlowOuter" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
    </filter>
    <filter id="ringGlowMid" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
    </filter>
    <filter id="ringGlowInner" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
    </filter>
  </defs>

  <!-- Background — full square, no rx -->
  <rect width="${SIZE}" height="${SIZE}" fill="url(#lightBg)"/>

  <!-- Faint HN watermark at ~12% opacity -->
  <text x="512" y="680" font-family="Arial Black, Impact, sans-serif" font-weight="900"
        font-size="520" fill="#7C3AED" text-anchor="middle" letter-spacing="-20" opacity="0.12">HN</text>

  <!-- Outer ring glow -->
  <circle cx="512" cy="512" r="340" fill="none" stroke="#7C3AED" stroke-width="8" opacity="0.15" filter="url(#ringGlowOuter)"/>
  <!-- Outer ring -->
  <circle cx="512" cy="512" r="340" fill="none" stroke="#7C3AED" stroke-width="6" opacity="0.18"/>

  <!-- Middle ring glow -->
  <circle cx="512" cy="512" r="260" fill="none" stroke="#8B5CF6" stroke-width="8" opacity="0.2" filter="url(#ringGlowMid)"/>
  <!-- Middle ring -->
  <circle cx="512" cy="512" r="260" fill="none" stroke="#8B5CF6" stroke-width="7" opacity="0.3"/>

  <!-- Inner ring glow -->
  <circle cx="512" cy="512" r="180" fill="none" stroke="#A78BFA" stroke-width="10" opacity="0.25" filter="url(#ringGlowInner)"/>
  <!-- Inner ring -->
  <circle cx="512" cy="512" r="180" fill="none" stroke="#A78BFA" stroke-width="8" opacity="0.45"/>

  <!-- Multi-layer glow behind center dot -->
  <!-- Layer 1: Wide ambient haze -->
  <circle cx="512" cy="512" r="160" fill="#7C3AED" opacity="0.12" filter="url(#glowWide)"/>
  <!-- Layer 2: Medium spread -->
  <circle cx="512" cy="512" r="120" fill="#8B5CF6" opacity="0.2" filter="url(#glowMed)"/>
  <!-- Layer 3: Tight bright core -->
  <circle cx="512" cy="512" r="100" fill="#A78BFA" opacity="0.35" filter="url(#glowTight)"/>

  <!-- Main center dot with rich gradient -->
  <circle cx="512" cy="512" r="90" fill="url(#dotGradLight)"/>

  <!-- Specular highlight — off-center for 3D depth -->
  <circle cx="488" cy="488" r="28" fill="white" opacity="0.35"/>
</svg>`;

async function generate() {
  const options = [
    { name: "option-1-vibrant-lettermark", svg: option1Svg },
    { name: "option-2-vibrant-pulse-dot", svg: option2Svg },
    { name: "option-2b-pulse-dot-hn", svg: option2bSvg },
    { name: "option-2c-coral-teal-hn", svg: option2cSvg },
    { name: "option-3-minimal-signal", svg: option3Svg },
    { name: "option-4-warm-chat-bubble", svg: option4Svg },
  ];

  for (const opt of options) {
    const outPath = path.join(OUTPUT_DIR, `${opt.name}.png`);
    await sharp(Buffer.from(opt.svg)).resize(SIZE, SIZE).png().toFile(outPath);
    console.log(`✓ Generated ${outPath}`);
  }

  // Generate light mode icon to assets/icon-light.png
  const lightIconPath = path.join(__dirname, "..", "assets", "icon-light.png");
  await sharp(Buffer.from(iconLightSvg)).resize(SIZE, SIZE).png().toFile(lightIconPath);
  console.log(`✓ Generated ${lightIconPath}`);
}

generate().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});

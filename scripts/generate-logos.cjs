#!/usr/bin/env node

// Generate brand logos as 128x128 PNG files with brand colors and initials
// Uses sharp to convert SVG to PNG

const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const LOGOS_DIR = path.join(__dirname, '..', 'client', 'public', 'logos')

// Brand definitions: [filename, initials, background color, text color]
const brands = [
  // Grande Distribution - International
  ['aldi', 'A', '#00005f', '#ff6600'],
  ['costco', 'C', '#e31837', '#ffffff'],
  ['metro', 'M', '#003d7a', '#ffc72c'],
  ['spar', 'S', '#00843d', '#ffffff'],
  ['walmart', 'W', '#0071dc', '#ffc220'],

  // Grande Distribution - France
  ['auchan', 'A', '#e10016', '#ffffff'],
  ['intermarche', 'I', '#ec1b23', '#ffffff'],
  ['systemeu', 'U', '#e2001a', '#ffffff'],
  ['casino', 'C', '#e4002b', '#ffffff'],
  ['monoprix', 'M', '#9b2335', '#ffffff'],
  ['picard', 'P', '#003da5', '#ffffff'],
  ['cora', 'C', '#e30613', '#ffffff'],
  ['franprix', 'F', '#ff0000', '#ffffff'],
  ['netto', 'N', '#ffe600', '#000000'],

  // Grande Distribution - Allemagne
  ['rewe', 'R', '#cc071e', '#ffffff'],
  ['edeka', 'E', '#fdc300', '#1d4370'],
  ['kaufland', 'K', '#e10a0a', '#ffffff'],
  ['penny', 'P', '#cd1719', '#ffffff'],

  // Grande Distribution - UK
  ['tesco', 'T', '#00539f', '#ee1c2e'],
  ['sainsburys', "S'", '#f06c00', '#ffffff'],
  ['asda', 'A', '#7ab648', '#ffffff'],
  ['morrisons', 'M', '#007a33', '#ffd100'],
  ['waitrose', 'W', '#006747', '#ffffff'],
  ['marks-spencer', 'M&S', '#000000', '#ffffff'],

  // Grande Distribution - Espagne / Portugal
  ['mercadona', 'M', '#35b44a', '#ffffff'],
  ['elcorteingles', 'CI', '#00843d', '#ffffff'],
  ['dia', 'D', '#e30613', '#ffffff'],
  ['pingo-doce', 'PD', '#008c44', '#ffffff'],
  ['continente', 'C', '#e4002b', '#ffffff'],

  // Grande Distribution - Italie
  ['coop', 'C', '#e30613', '#ffffff'],
  ['conad', 'C', '#e72e2d', '#ffffff'],
  ['esselunga', 'E', '#005ba6', '#ffffff'],

  // Grande Distribution - Suède / Nordiques
  ['ica', 'ICA', '#e3000b', '#ffffff'],
  ['willys', 'W', '#e30613', '#ffd100'],

  // Grande Distribution - USA
  ['target', 'T', '#cc0000', '#ffffff'],
  ['kroger', 'K', '#0067a0', '#ffffff'],
  ['wholefoods', 'WF', '#00674b', '#ffffff'],
  ['traderjoes', 'TJ', '#c8102e', '#ffffff'],

  // E-commerce - Généralistes
  ['ebay', 'e', '#e53238', '#ffffff'],
  ['aliexpress', 'Ae', '#ff4747', '#ffffff'],
  ['temu', 'T', '#f05a28', '#ffffff'],
  ['shein', 'S', '#000000', '#ffffff'],
  ['wish', 'W', '#2fb7ec', '#ffffff'],

  // E-commerce - Tech / Électronique
  ['fnac', 'F', '#e1a400', '#000000'],
  ['darty', 'D', '#ce0e2d', '#ffffff'],
  ['boulanger', 'B', '#003da5', '#ffffff'],
  ['samsung', 'S', '#1428a0', '#ffffff'],
  ['google', 'G', '#4285f4', '#ffffff'],
  ['dell', 'D', '#007db8', '#ffffff'],

  // E-commerce - Mode / Fashion
  ['zalando', 'Z', '#ff6900', '#ffffff'],
  ['asos', 'A', '#2d2d2d', '#ffffff'],
  ['hm', 'H&M', '#e50010', '#ffffff'],
  ['zara', 'Z', '#000000', '#ffffff'],
  ['uniqlo', 'U', '#ff0000', '#ffffff'],
  ['vinted', 'V', '#09b1ba', '#ffffff'],

  // Bricolage / Maison
  ['leroymerlin', 'LM', '#78be20', '#ffffff'],
  ['ikea', 'I', '#0051ba', '#ffdb00'],
  ['castorama', 'C', '#0066b3', '#ffffff'],

  // Services / Divertissement
  ['deezer', 'D', '#a238ff', '#ffffff'],
  ['leboncoin', 'lbc', '#ff6e14', '#ffffff'],
]

function generateSvg(initials, bgColor, textColor) {
  const fontSize = initials.length <= 2 ? 56 : (initials.length === 3 ? 42 : 36)
  const fontWeight = 700

  return `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="clip">
      <rect width="128" height="128" rx="24" ry="24"/>
    </clipPath>
  </defs>
  <rect width="128" height="128" rx="24" ry="24" fill="${bgColor}" clip-path="url(#clip)"/>
  <text x="64" y="64" dy="0.35em" text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${fontSize}" font-weight="${fontWeight}"
    fill="${textColor}" letter-spacing="-1">
    ${initials.replace(/&/g, '&amp;')}
  </text>
</svg>`
}

async function main() {
  if (!fs.existsSync(LOGOS_DIR)) {
    fs.mkdirSync(LOGOS_DIR, { recursive: true })
  }

  let created = 0
  let skipped = 0

  for (const [filename, initials, bgColor, textColor] of brands) {
    const outputPath = path.join(LOGOS_DIR, `${filename}.png`)

    // Skip if file already exists
    if (fs.existsSync(outputPath)) {
      console.log(`  SKIP ${filename}.png (already exists)`)
      skipped++
      continue
    }

    const svg = generateSvg(initials, bgColor, textColor)
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath)

    console.log(`  OK   ${filename}.png`)
    created++
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`)
}

main().catch(console.error)

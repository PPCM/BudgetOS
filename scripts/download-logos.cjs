#!/usr/bin/env node

// Download real brand logos from Google Favicon API and resize to 128x128 PNG
// Falls back to existing placeholder if download fails
// Usage: node scripts/download-logos.cjs [--force]

const sharp = require('sharp')
const path = require('path')
const fs = require('fs')
const https = require('https')

const LOGOS_DIR = path.join(__dirname, '..', 'client', 'public', 'logos')
const FORCE = process.argv.includes('--force')

// [filename, domain]
const brands = [
  // Grande Distribution - International
  ['aldi', 'aldi.com'],
  ['costco', 'costco.com'],
  ['metro', 'metro.de'],
  ['spar', 'spar.com'],
  ['walmart', 'walmart.com'],

  // Grande Distribution - France
  ['auchan', 'auchan.fr'],
  ['casino', 'casino.fr'],
  ['cora', 'cora.fr'],
  ['franprix', 'franprix.fr'],
  ['intermarche', 'intermarche.com'],
  ['monoprix', 'monoprix.fr'],
  ['netto', 'netto.fr'],
  ['picard', 'picard.fr'],
  ['systemeu', 'magasins-u.com'],

  // Grande Distribution - Allemagne
  ['edeka', 'edeka.de'],
  ['kaufland', 'kaufland.de'],
  ['penny', 'penny.de'],
  ['rewe', 'rewe.de'],

  // Grande Distribution - UK
  ['asda', 'asda.com'],
  ['marks-spencer', 'marksandspencer.com'],
  ['morrisons', 'morrisons.com'],
  ['sainsburys', 'sainsburys.co.uk'],
  ['tesco', 'tesco.com'],
  ['waitrose', 'waitrose.com'],

  // Grande Distribution - Espagne / Portugal
  ['continente', 'continente.pt'],
  ['dia', 'dia.es'],
  ['elcorteingles', 'elcorteingles.es'],
  ['mercadona', 'mercadona.es'],
  ['pingo-doce', 'pingodoce.pt'],

  // Grande Distribution - Italie
  ['conad', 'conad.it'],
  ['coop', 'e-coop.it'],
  ['esselunga', 'esselunga.it'],

  // Grande Distribution - Suède / Nordiques
  ['ica', 'ica.se'],
  ['willys', 'willys.se'],

  // Grande Distribution - USA
  ['kroger', 'kroger.com'],
  ['target', 'target.com'],
  ['traderjoes', 'traderjoes.com'],
  ['wholefoods', 'wholefoodsmarket.com'],

  // E-commerce - Généralistes
  ['aliexpress', 'aliexpress.com'],
  ['ebay', 'ebay.com'],
  ['shein', 'shein.com'],
  ['temu', 'temu.com'],
  ['wish', 'wish.com'],

  // E-commerce - Tech / Électronique
  ['boulanger', 'boulanger.com'],
  ['darty', 'darty.com'],
  ['dell', 'dell.com'],
  ['fnac', 'fnac.com'],
  ['google', 'google.com'],
  ['samsung', 'samsung.com'],

  // E-commerce - Mode / Fashion
  ['asos', 'asos.com'],
  ['hm', 'hm.com'],
  ['uniqlo', 'uniqlo.com'],
  ['vinted', 'vinted.fr'],
  ['zalando', 'zalando.com'],
  ['zara', 'zara.com'],

  // Bricolage / Maison
  ['castorama', 'castorama.fr'],
  ['ikea', 'ikea.com'],
  ['leroymerlin', 'leroymerlin.fr'],

  // Services / Divertissement
  ['deezer', 'deezer.com'],
  ['leboncoin', 'leboncoin.fr'],
]

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const doRequest = (requestUrl) => {
      const proto = requestUrl.startsWith('https') ? https : require('http')
      proto.get(requestUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doRequest(res.headers.location)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => resolve(Buffer.concat(chunks)))
        res.on('error', reject)
      }).on('error', reject)
    }
    doRequest(url)
  })
}

async function downloadAndResize(filename, domain) {
  const outputPath = path.join(LOGOS_DIR, `${filename}.png`)

  // Google Favicon API - returns high quality favicons up to 256px
  const googleUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`

  try {
    const buffer = await downloadBuffer(googleUrl)

    // Validate it's a real image
    const metadata = await sharp(buffer).metadata()
    if (!metadata.width || metadata.width < 16) {
      throw new Error('Image too small or invalid')
    }

    // Resize to 128x128 with white background, keep aspect ratio, round corners
    await sharp(buffer)
      .resize(128, 128, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .composite([{
        input: Buffer.from(
          `<svg width="128" height="128">
            <rect x="0" y="0" width="128" height="128" rx="24" ry="24" fill="white"/>
          </svg>`
        ),
        blend: 'dest-in',
      }])
      .png()
      .toFile(outputPath)

    return 'google'
  } catch (err) {
    return null
  }
}

async function main() {
  if (!fs.existsSync(LOGOS_DIR)) {
    fs.mkdirSync(LOGOS_DIR, { recursive: true })
  }

  console.log(`Downloading ${brands.length} brand logos from Google Favicon API...`)
  if (FORCE) console.log('(--force: overwriting existing files)\n')
  else console.log('(use --force to overwrite existing files)\n')

  let success = 0
  let skipped = 0
  let failed = 0
  const failures = []

  for (const [filename, domain] of brands) {
    const outputPath = path.join(LOGOS_DIR, `${filename}.png`)
    process.stdout.write(`  ${filename.padEnd(20)}`)

    if (!FORCE && fs.existsSync(outputPath)) {
      // Check if existing file is a real logo (>5KB) or a placeholder (<5KB)
      const stats = fs.statSync(outputPath)
      if (stats.size > 5000) {
        console.log('SKIP (already has real logo)')
        skipped++
        continue
      }
    }

    const result = await downloadAndResize(filename, domain)
    if (result) {
      console.log(`OK (${result})`)
      success++
    } else {
      console.log('FAILED (keeping placeholder)')
      failed++
      failures.push(filename)
    }
  }

  console.log(`\nDone: ${success} downloaded, ${skipped} skipped, ${failed} failed`)
  if (failures.length > 0) {
    console.log(`Failed: ${failures.join(', ')}`)
  }
}

main().catch(console.error)

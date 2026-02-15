import { describe, it, expect } from 'vitest'
import knownLogos, { findKnownLogo } from '../../src/lib/knownLogos.js'
import fs from 'fs'
import path from 'path'

const LOGOS_DIR = path.resolve(__dirname, '../../public/logos')

describe('knownLogos', () => {
  it('should export a non-empty object', () => {
    expect(typeof knownLogos).toBe('object')
    expect(Object.keys(knownLogos).length).toBeGreaterThan(50)
  })

  it('should have all logo files on disk', () => {
    const uniquePaths = [...new Set(Object.values(knownLogos))]
    for (const logoPath of uniquePaths) {
      const filePath = path.join(LOGOS_DIR, path.basename(logoPath))
      expect(fs.existsSync(filePath), `Missing file: ${filePath}`).toBe(true)
    }
  })

  it('should have all values starting with /logos/', () => {
    for (const [key, val] of Object.entries(knownLogos)) {
      expect(val, `Invalid path for '${key}'`).toMatch(/^\/logos\/[\w-]+\.png$/)
    }
  })
})

describe('findKnownLogo', () => {
  // Exact match
  it('should find logo by exact name', () => {
    expect(findKnownLogo('amazon')).toBe('/logos/amazon.png')
    expect(findKnownLogo('ikea')).toBe('/logos/ikea.png')
    expect(findKnownLogo('deezer')).toBe('/logos/deezer.png')
    expect(findKnownLogo('leboncoin')).toBe('/logos/leboncoin.png')
  })

  // Case insensitive
  it('should find logo case-insensitively', () => {
    expect(findKnownLogo('AMAZON')).toBe('/logos/amazon.png')
    expect(findKnownLogo('Ikea')).toBe('/logos/ikea.png')
    expect(findKnownLogo('LEROY MERLIN')).toBe('/logos/leroymerlin.png')
  })

  // Substring match
  it('should find logo when brand name is contained in input', () => {
    expect(findKnownLogo('Carrefour Market')).toBe('/logos/carrefour.png')
    expect(findKnownLogo('Auchan Supermarché')).toBe('/logos/auchan.png')
    expect(findKnownLogo('IKEA Paris Nord')).toBe('/logos/ikea.png')
    expect(findKnownLogo('Lidl France')).toBe('/logos/lidl.png')
  })

  // Variant names
  it('should match variant names', () => {
    expect(findKnownLogo('E.Leclerc')).toBe('/logos/leclerc.png')
    expect(findKnownLogo('TotalEnergies')).toBe('/logos/total.png')
    expect(findKnownLogo('Super U')).toBe('/logos/systemeu.png')
    expect(findKnownLogo("Sainsbury's")).toBe('/logos/sainsburys.png')
    expect(findKnownLogo('Le Bon Coin')).toBe('/logos/leboncoin.png')
    expect(findKnownLogo('Géant Casino')).toBe('/logos/casino.png')
    expect(findKnownLogo('Aldi Süd')).toBe('/logos/aldi.png')
  })

  // New brands
  it('should find all new retail brands', () => {
    const retailBrands = {
      'auchan': '/logos/auchan.png',
      'cora': '/logos/cora.png',
      'tesco': '/logos/tesco.png',
      'mercadona': '/logos/mercadona.png',
      'walmart': '/logos/walmart.png',
      'target': '/logos/target.png',
      'costco': '/logos/costco.png',
      'edeka': '/logos/edeka.png',
      'rewe': '/logos/rewe.png',
      'ica': '/logos/ica.png',
    }
    for (const [name, expectedPath] of Object.entries(retailBrands)) {
      expect(findKnownLogo(name), `Brand '${name}' not found`).toBe(expectedPath)
    }
  })

  it('should find all new e-commerce brands', () => {
    const ecommerceBrands = {
      'ebay': '/logos/ebay.png',
      'aliexpress': '/logos/aliexpress.png',
      'temu': '/logos/temu.png',
      'shein': '/logos/shein.png',
      'zalando': '/logos/zalando.png',
      'vinted': '/logos/vinted.png',
      'fnac': '/logos/fnac.png',
      'samsung': '/logos/samsung.png',
    }
    for (const [name, expectedPath] of Object.entries(ecommerceBrands)) {
      expect(findKnownLogo(name), `Brand '${name}' not found`).toBe(expectedPath)
    }
  })

  it('should find home improvement brands', () => {
    expect(findKnownLogo('Leroy Merlin')).toBe('/logos/leroymerlin.png')
    expect(findKnownLogo('IKEA')).toBe('/logos/ikea.png')
    expect(findKnownLogo('Castorama')).toBe('/logos/castorama.png')
  })

  // No match
  it('should return null for unknown names', () => {
    expect(findKnownLogo('Unknown Store')).toBeNull()
    expect(findKnownLogo('Restaurant du Coin')).toBeNull()
  })

  // Edge cases
  it('should return null for short or empty names', () => {
    expect(findKnownLogo('')).toBeNull()
    expect(findKnownLogo('ab')).toBeNull()
    expect(findKnownLogo(null)).toBeNull()
    expect(findKnownLogo(undefined)).toBeNull()
  })
})

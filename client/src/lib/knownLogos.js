// Mapping des noms d'entreprises connues vers leurs logos
// Les noms sont en minuscules pour la comparaison

const knownLogos = {
  // Grande Distribution - International
  'aldi': '/logos/aldi.png',
  'aldi sud': '/logos/aldi.png',
  'aldi nord': '/logos/aldi.png',
  'aldi süd': '/logos/aldi.png',
  'carrefour': '/logos/carrefour.png',
  'costco': '/logos/costco.png',
  'lidl': '/logos/lidl.png',
  'metro': '/logos/metro.png',
  'spar': '/logos/spar.png',
  'walmart': '/logos/walmart.png',

  // Grande Distribution - France
  'auchan': '/logos/auchan.png',
  'casino': '/logos/casino.png',
  'géant casino': '/logos/casino.png',
  'geant casino': '/logos/casino.png',
  'cora': '/logos/cora.png',
  'franprix': '/logos/franprix.png',
  'intermarché': '/logos/intermarche.png',
  'intermarche': '/logos/intermarche.png',
  'itm': '/logos/intermarche.png',
  'leclerc': '/logos/leclerc.png',
  'e.leclerc': '/logos/leclerc.png',
  'e leclerc': '/logos/leclerc.png',
  'monoprix': '/logos/monoprix.png',
  'monop': '/logos/monoprix.png',
  'netto': '/logos/netto.png',
  'picard': '/logos/picard.png',
  'système u': '/logos/systemeu.png',
  'systeme u': '/logos/systemeu.png',
  'super u': '/logos/systemeu.png',
  'hyper u': '/logos/systemeu.png',
  'u express': '/logos/systemeu.png',

  // Grande Distribution - Allemagne
  'edeka': '/logos/edeka.png',
  'kaufland': '/logos/kaufland.png',
  'penny': '/logos/penny.png',
  'rewe': '/logos/rewe.png',

  // Grande Distribution - UK
  'asda': '/logos/asda.png',
  'marks & spencer': '/logos/marks-spencer.png',
  'marks and spencer': '/logos/marks-spencer.png',
  'm&s': '/logos/marks-spencer.png',
  'morrisons': '/logos/morrisons.png',
  'sainsbury': '/logos/sainsburys.png',
  "sainsbury's": '/logos/sainsburys.png',
  'tesco': '/logos/tesco.png',
  'waitrose': '/logos/waitrose.png',

  // Grande Distribution - Espagne / Portugal
  'continente': '/logos/continente.png',
  'dia': '/logos/dia.png',
  'el corte inglés': '/logos/elcorteingles.png',
  'el corte ingles': '/logos/elcorteingles.png',
  'mercadona': '/logos/mercadona.png',
  'pingo doce': '/logos/pingo-doce.png',

  // Grande Distribution - Italie
  'conad': '/logos/conad.png',
  'coop': '/logos/coop.png',
  'esselunga': '/logos/esselunga.png',

  // Grande Distribution - Suède / Nordiques
  'ica': '/logos/ica.png',
  'willys': '/logos/willys.png',

  // Grande Distribution - USA
  'kroger': '/logos/kroger.png',
  'target': '/logos/target.png',
  "trader joe's": '/logos/traderjoes.png',
  'trader joes': '/logos/traderjoes.png',
  'whole foods': '/logos/wholefoods.png',

  // E-commerce - Généralistes
  'aliexpress': '/logos/aliexpress.png',
  'amazon': '/logos/amazon.png',
  'ebay': '/logos/ebay.png',
  'shein': '/logos/shein.png',
  'temu': '/logos/temu.png',
  'wish': '/logos/wish.png',

  // E-commerce - Tech / Électronique
  'apple': '/logos/apple.png',
  'boulanger': '/logos/boulanger.png',
  'darty': '/logos/darty.png',
  'dell': '/logos/dell.png',
  'fnac': '/logos/fnac.png',
  'google': '/logos/google.png',
  'microsoft': '/logos/microsoft.png',
  'samsung': '/logos/samsung.png',

  // E-commerce - Mode / Fashion
  'asos': '/logos/asos.png',
  'h&m': '/logos/hm.png',
  'hm': '/logos/hm.png',
  'h et m': '/logos/hm.png',
  'uniqlo': '/logos/uniqlo.png',
  'vinted': '/logos/vinted.png',
  'zalando': '/logos/zalando.png',
  'zara': '/logos/zara.png',

  // Bricolage / Maison
  'castorama': '/logos/castorama.png',
  'ikea': '/logos/ikea.png',
  'leroy merlin': '/logos/leroymerlin.png',

  // Énergie / Télécom
  'edf': '/logos/edf.png',
  'free': '/logos/free.png',
  'orange': '/logos/orange.png',
  'sfr': '/logos/sfr.png',
  'total': '/logos/total.png',
  'totalenergies': '/logos/total.png',

  // Services / Divertissement
  'deezer': '/logos/deezer.png',
  'leboncoin': '/logos/leboncoin.png',
  'le bon coin': '/logos/leboncoin.png',
  'netflix': '/logos/netflix.png',
  'spotify': '/logos/spotify.png',
}

/**
 * Recherche un logo connu pour un nom de tiers donné
 * @param {string} name - Nom du tiers
 * @returns {string|null} - URL du logo ou null si non trouvé
 */
export function findKnownLogo(name) {
  if (!name || name.length < 3) return null
  
  const normalized = name.toLowerCase().trim()
  
  // Recherche exacte d'abord
  if (knownLogos[normalized]) {
    return knownLogos[normalized]
  }
  
  // Recherche : le nom saisi contient le nom complet d'une entreprise connue
  // (ex: "Carrefour Market" contient "carrefour")
  // On trie par longueur décroissante pour matcher le plus spécifique d'abord
  const sortedCompanies = Object.keys(knownLogos).sort((a, b) => b.length - a.length)
  
  for (const company of sortedCompanies) {
    // Le nom doit contenir le mot complet de l'entreprise (pas juste quelques lettres)
    // On vérifie que c'est un mot complet avec des limites de mots
    const regex = new RegExp(`\\b${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (regex.test(normalized)) {
      return knownLogos[company]
    }
  }
  
  return null
}

export default knownLogos

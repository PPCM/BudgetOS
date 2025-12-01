// Mapping des noms d'entreprises connues vers leurs logos
// Les noms sont en minuscules pour la comparaison

const knownLogos = {
  'amazon': '/logos/amazon.png',
  'apple': '/logos/apple.png',
  'carrefour': '/logos/carrefour.png',
  'edf': '/logos/edf.png',
  'free': '/logos/free.png',
  'leclerc': '/logos/leclerc.png',
  'e.leclerc': '/logos/leclerc.png',
  'e leclerc': '/logos/leclerc.png',
  'lidl': '/logos/lidl.png',
  'microsoft': '/logos/microsoft.png',
  'netflix': '/logos/netflix.png',
  'orange': '/logos/orange.png',
  'sfr': '/logos/sfr.png',
  'spotify': '/logos/spotify.png',
  'total': '/logos/total.png',
  'totalenergies': '/logos/total.png',
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

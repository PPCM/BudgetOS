import { v4 as uuidv4 } from 'uuid';
import { format, addDays, addMonths, differenceInDays, startOfMonth, endOfMonth, setDate, subDays } from 'date-fns';

/**
 * Génère un UUID v4
 */
export const generateId = () => uuidv4();

/**
 * Formate un montant avec devise
 */
export const formatCurrency = (amount, currency = 'EUR', locale = 'fr-FR') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Arrondit un montant à 2 décimales
 */
export const roundAmount = (amount) => {
  return Math.round(amount * 100) / 100;
};

/**
 * Formate une date en ISO
 */
export const formatDateISO = (date) => {
  return format(new Date(date), 'yyyy-MM-dd');
};

/**
 * Formate une date en format français
 */
export const formatDateFR = (date) => {
  return format(new Date(date), 'dd/MM/yyyy');
};

/**
 * Calcule la date de débit d'une carte à débit différé
 * @param {Date} purchaseDate - Date d'achat
 * @param {Object} cardConfig - Configuration de la carte
 * @param {number} cardConfig.cycleStartDay - Jour de début de cycle (ex: 26)
 * @param {number} cardConfig.debitDay - Jour de prélèvement (ex: 5)
 * @param {number} cardConfig.debitDaysBeforeEnd - Alternative: J-X avant fin de mois
 */
export const calculateDeferredDebitDate = (purchaseDate, cardConfig) => {
  const purchase = new Date(purchaseDate);
  const purchaseDay = purchase.getDate();
  
  let billingMonth;
  let debitDate;
  
  // Déterminer le mois de facturation selon le cycle
  if (purchaseDay >= cardConfig.cycleStartDay) {
    // Achat dans le nouveau cycle -> facturé le mois suivant
    billingMonth = addMonths(purchase, 1);
  } else {
    // Achat avant la date de cycle -> facturé ce mois
    billingMonth = purchase;
  }
  
  // Calculer la date de débit
  if (cardConfig.debitDay) {
    // Jour fixe du mois
    debitDate = setDate(addMonths(billingMonth, 1), cardConfig.debitDay);
  } else if (cardConfig.debitDaysBeforeEnd) {
    // J-X avant fin de mois
    const monthEnd = endOfMonth(addMonths(billingMonth, 1));
    debitDate = subDays(monthEnd, cardConfig.debitDaysBeforeEnd);
  } else {
    // Par défaut: le 5 du mois suivant
    debitDate = setDate(addMonths(billingMonth, 1), 5);
  }
  
  return debitDate;
};

/**
 * Détermine le cycle de facturation d'une opération carte
 * @param {Date} purchaseDate - Date d'achat
 * @param {number} cycleStartDay - Jour de début de cycle
 */
export const getCycleForPurchase = (purchaseDate, cycleStartDay) => {
  const purchase = new Date(purchaseDate);
  const purchaseDay = purchase.getDate();
  
  let cycleStart, cycleEnd;
  
  if (purchaseDay >= cycleStartDay) {
    // Nouveau cycle commencé
    cycleStart = setDate(purchase, cycleStartDay);
    cycleEnd = subDays(setDate(addMonths(purchase, 1), cycleStartDay), 1);
  } else {
    // Cycle du mois précédent
    cycleStart = setDate(addMonths(purchase, -1), cycleStartDay);
    cycleEnd = subDays(setDate(purchase, cycleStartDay), 1);
  }
  
  return {
    start: formatDateISO(cycleStart),
    end: formatDateISO(cycleEnd),
    label: `${format(cycleStart, 'dd/MM')} - ${format(cycleEnd, 'dd/MM/yyyy')}`,
  };
};

/**
 * Calcule les prévisions de trésorerie
 * @param {number} currentBalance - Solde actuel
 * @param {Array} plannedTransactions - Transactions planifiées
 * @param {Array} deferredDebits - Débits différés à venir
 * @param {number} days - Horizon en jours
 */
export const calculateForecast = (currentBalance, plannedTransactions, deferredDebits, days) => {
  const today = new Date();
  const horizon = addDays(today, days);
  
  let balance = currentBalance;
  const dailyBalances = [];
  
  // Combiner toutes les opérations futures
  const futureOperations = [
    ...plannedTransactions.map(t => ({ date: new Date(t.date), amount: t.amount })),
    ...deferredDebits.map(d => ({ date: new Date(d.debitDate), amount: -d.amount })),
  ].filter(op => op.date >= today && op.date <= horizon)
   .sort((a, b) => a.date - b.date);
  
  // Calculer le solde jour par jour
  let currentDate = today;
  let opIndex = 0;
  
  while (currentDate <= horizon) {
    while (opIndex < futureOperations.length && 
           formatDateISO(futureOperations[opIndex].date) === formatDateISO(currentDate)) {
      balance += futureOperations[opIndex].amount;
      opIndex++;
    }
    
    dailyBalances.push({
      date: formatDateISO(currentDate),
      balance: roundAmount(balance),
    });
    
    currentDate = addDays(currentDate, 1);
  }
  
  return {
    currentBalance,
    forecastBalance: roundAmount(balance),
    minBalance: Math.min(...dailyBalances.map(d => d.balance)),
    maxBalance: Math.max(...dailyBalances.map(d => d.balance)),
    dailyBalances,
  };
};

/**
 * Détecte les doublons potentiels lors de l'import
 * @param {Object} importedTx - Transaction importée
 * @param {Array} existingTxs - Transactions existantes
 * @param {number} dateTolerance - Tolérance en jours pour la date
 * @param {number} amountTolerance - Tolérance en % pour le montant
 */
export const findPotentialDuplicates = (importedTx, existingTxs, dateTolerance = 2, amountTolerance = 0.01) => {
  const importDate = new Date(importedTx.date);
  const importAmount = Math.abs(importedTx.amount);
  
  return existingTxs.filter(tx => {
    const txDate = new Date(tx.date);
    const txAmount = Math.abs(tx.amount);
    
    // Vérifier la proximité de date
    const daysDiff = Math.abs(differenceInDays(importDate, txDate));
    if (daysDiff > dateTolerance) return false;
    
    // Vérifier la proximité du montant
    const amountDiff = Math.abs(importAmount - txAmount) / importAmount;
    if (amountDiff > amountTolerance) return false;
    
    return true;
  });
};

/**
 * Normalise une description pour la correspondance
 */
export const normalizeDescription = (description) => {
  if (!description) return '';
  return description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9\s]/g, '') // Garde lettres, chiffres, espaces
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Calcule un score de correspondance entre deux transactions
 */
export const calculateMatchScore = (tx1, tx2) => {
  let score = 0;
  
  // Correspondance exacte du montant: +50 points
  if (tx1.amount === tx2.amount) {
    score += 50;
  } else {
    // Correspondance proche: +30 points
    const amountDiff = Math.abs(tx1.amount - tx2.amount) / Math.abs(tx1.amount);
    if (amountDiff <= 0.01) score += 30;
  }
  
  // Correspondance de date exacte: +30 points
  const date1 = formatDateISO(tx1.date);
  const date2 = formatDateISO(tx2.date);
  if (date1 === date2) {
    score += 30;
  } else {
    // Date proche: +15 points
    const daysDiff = Math.abs(differenceInDays(new Date(date1), new Date(date2)));
    if (daysDiff <= 2) score += 15;
    else if (daysDiff <= 5) score += 5;
  }
  
  // Correspondance de description: +20 points
  const desc1 = normalizeDescription(tx1.description);
  const desc2 = normalizeDescription(tx2.description);
  if (desc1 && desc2) {
    if (desc1 === desc2) {
      score += 20;
    } else if (desc1.includes(desc2) || desc2.includes(desc1)) {
      score += 10;
    }
  }
  
  return score;
};

/**
 * Pagine un tableau
 */
export const paginate = (array, page = 1, limit = 20) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    data: array.slice(startIndex, endIndex),
    pagination: {
      page,
      limit,
      total: array.length,
      totalPages: Math.ceil(array.length / limit),
      hasNext: endIndex < array.length,
      hasPrev: page > 1,
    },
  };
};

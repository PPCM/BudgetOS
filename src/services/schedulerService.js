import cron from 'node-cron';
import { query } from '../database/connection.js';
import PlannedTransaction from '../models/PlannedTransaction.js';
import logger from '../utils/logger.js';
import { formatDateISO } from '../utils/helpers.js';

/**
 * Service de planification des transactions récurrentes
 */
class SchedulerService {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Démarre le scheduler
   * Exécute toutes les heures à la minute 0
   */
  start() {
    // Exécuter toutes les heures
    cron.schedule('0 * * * *', () => {
      this.processPlannedTransactions();
    });

    // Exécuter aussi au démarrage du serveur
    setTimeout(() => {
      this.processPlannedTransactions();
    }, 5000); // Attendre 5 secondes après le démarrage

    logger.info('Scheduler started - checking planned transactions every hour');
  }

  /**
   * Traite les transactions planifiées dues
   */
  async processPlannedTransactions() {
    if (this.isRunning) {
      logger.info('Scheduler already running, skipping');
      return;
    }

    this.isRunning = true;
    const today = formatDateISO(new Date());
    
    try {
      // Récupérer toutes les transactions planifiées actives dont la prochaine occurrence est <= aujourd'hui
      // et dont la date de fin n'est pas dépassée (ou pas de date de fin)
      const duePlanned = query.all(`
        SELECT pt.*, u.id as user_id
        FROM planned_transactions pt
        JOIN users u ON pt.user_id = u.id
        WHERE pt.is_active = 1 
          AND pt.next_occurrence IS NOT NULL
          AND pt.next_occurrence <= ?
          AND (pt.end_date IS NULL OR pt.end_date >= pt.next_occurrence)
      `, [today]);

      logger.info(`Found ${duePlanned.length} planned transactions due`);

      for (const pt of duePlanned) {
        try {
          // Vérifier si on doit ajuster la date pour les jours fériés
          let executionDate = pt.next_occurrence;
          
          if (pt.execute_before_holiday) {
            executionDate = this.getLastBusinessDay(pt.next_occurrence);
          }

          // Créer la transaction
          PlannedTransaction.createOccurrence(pt.id, pt.user_id, executionDate);
          
          logger.info(`Created transaction for planned ${pt.id}: ${pt.description}`);

          // Vérifier si la transaction planifiée doit être désactivée ou supprimée (date de fin atteinte)
          if (pt.end_date) {
            const updatedPt = query.get('SELECT next_occurrence, delete_on_end FROM planned_transactions WHERE id = ?', [pt.id]);
            if (updatedPt && updatedPt.next_occurrence && updatedPt.next_occurrence > pt.end_date) {
              if (updatedPt.delete_on_end) {
                // Supprimer la transaction récurrente si delete_on_end est activé
                query.run('DELETE FROM planned_transactions WHERE id = ?', [pt.id]);
                logger.info(`Deleted planned ${pt.id}: end date reached (delete_on_end enabled)`);
              } else {
                // Sinon, juste désactiver
                query.run('UPDATE planned_transactions SET is_active = 0 WHERE id = ?', [pt.id]);
                logger.info(`Deactivated planned ${pt.id}: end date reached`);
              }
            }
          }
        } catch (error) {
          logger.error(`Error creating occurrence for planned ${pt.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error processing planned transactions:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Retourne le dernier jour ouvré avant ou égal à la date donnée
   * (Exclut weekends et jours fériés français)
   */
  getLastBusinessDay(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    
    // Jours fériés français fixes
    const holidays = this.getFrenchHolidays(year);
    
    // Reculer si weekend ou jour férié
    while (this.isWeekend(date) || this.isHoliday(date, holidays)) {
      date.setDate(date.getDate() - 1);
    }
    
    return formatDateISO(date);
  }

  /**
   * Vérifie si c'est un weekend
   */
  isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // Dimanche ou Samedi
  }

  /**
   * Vérifie si c'est un jour férié
   */
  isHoliday(date, holidays) {
    const dateStr = formatDateISO(date);
    return holidays.includes(dateStr);
  }

  /**
   * Calcule les jours fériés français pour une année
   */
  getFrenchHolidays(year) {
    const holidays = [
      `${year}-01-01`, // Jour de l'an
      `${year}-05-01`, // Fête du travail
      `${year}-05-08`, // Victoire 1945
      `${year}-07-14`, // Fête nationale
      `${year}-08-15`, // Assomption
      `${year}-11-01`, // Toussaint
      `${year}-11-11`, // Armistice
      `${year}-12-25`, // Noël
    ];

    // Calcul de Pâques (algorithme de Meeus/Jones/Butcher)
    const easter = this.getEasterDate(year);
    
    // Lundi de Pâques (Pâques + 1)
    const easterMonday = new Date(easter);
    easterMonday.setDate(easterMonday.getDate() + 1);
    holidays.push(formatDateISO(easterMonday));

    // Ascension (Pâques + 39)
    const ascension = new Date(easter);
    ascension.setDate(ascension.getDate() + 39);
    holidays.push(formatDateISO(ascension));

    // Lundi de Pentecôte (Pâques + 50)
    const pentecost = new Date(easter);
    pentecost.setDate(pentecost.getDate() + 50);
    holidays.push(formatDateISO(pentecost));

    return holidays;
  }

  /**
   * Calcule la date de Pâques pour une année
   */
  getEasterDate(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    
    return new Date(year, month - 1, day);
  }
}

export const schedulerService = new SchedulerService();
export default schedulerService;

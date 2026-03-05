import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Email service for sending emails via SMTP
 * Supports configuration from DB (SystemSetting) with fallback to env vars
 */
class EmailService {
  constructor() {
    this._transporter = null;
  }

  /**
   * Load SMTP config: DB settings override env vars
   * @returns {Promise<Object>} SMTP configuration
   */
  async getSmtpConfig() {
    let dbSettings = {};

    try {
      const { default: SystemSetting } = await import('../models/SystemSetting.js');
      const allSettings = await SystemSetting.getAll();
      dbSettings = {
        host: allSettings.smtp_host || null,
        port: allSettings.smtp_port ? parseInt(allSettings.smtp_port, 10) : null,
        secure: allSettings.smtp_secure != null ? allSettings.smtp_secure === 'true' : null,
        user: allSettings.smtp_user || null,
        pass: allSettings.smtp_pass || null,
        from: allSettings.smtp_from || null,
      };
    } catch {
      // DB not available yet, use env vars only
    }

    return {
      host: dbSettings.host || config.smtp.host,
      port: dbSettings.port || config.smtp.port,
      secure: dbSettings.secure != null ? dbSettings.secure : config.smtp.secure,
      user: dbSettings.user || config.smtp.user,
      pass: dbSettings.pass || config.smtp.pass,
      from: dbSettings.from || config.smtp.from,
    };
  }

  /**
   * Create or refresh the nodemailer transporter
   * @returns {Promise<import('nodemailer').Transporter>}
   */
  async _getTransporter() {
    const smtpConfig = await this.getSmtpConfig();

    if (!smtpConfig.host) {
      throw new Error('SMTP not configured: no host defined');
    }

    const transportOptions = {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
    };

    if (smtpConfig.user && smtpConfig.pass) {
      transportOptions.auth = {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      };
    }

    return nodemailer.createTransport(transportOptions);
  }

  /**
   * Send an email
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} html - HTML body
   */
  async sendMail(to, subject, html) {
    const transporter = await this._getTransporter();
    const smtpConfig = await this.getSmtpConfig();

    const mailOptions = {
      from: smtpConfig.from || `BudgetOS <noreply@budgetos.local>`,
      to,
      subject,
      html,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      logger.info('Email sent', { to, subject, messageId: info.messageId });
      return info;
    } catch (error) {
      logger.error('Failed to send email', { to, subject, error: error.message });
      throw error;
    }
  }

  /**
   * Send a password reset email
   * @param {Object} user - User object (email, firstName)
   * @param {string} token - Raw reset token
   * @param {string} locale - User locale ('fr' or 'en')
   */
  async sendPasswordResetEmail(user, token, locale = 'fr') {
    const appUrl = config.smtp.appUrl || `http://${config.server.host}:${config.server.port}`;
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const isFr = locale === 'fr';
    const name = user.firstName || user.email;

    const subject = isFr
      ? 'BudgetOS - Réinitialisation de votre mot de passe'
      : 'BudgetOS - Reset your password';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-flex; align-items: center; justify-content: center; width: 60px; height: 60px; border-radius: 50%; background: #EEF2FF; margin-bottom: 10px;">
      <span style="font-size: 24px; font-weight: bold; color: #4F46E5;">B</span>
    </div>
    <h2 style="margin: 0; color: #111;">BudgetOS</h2>
  </div>

  <p>${isFr ? `Bonjour ${name},` : `Hello ${name},`}</p>

  <p>${isFr
    ? 'Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en définir un nouveau :'
    : 'You have requested a password reset. Click the button below to set a new password:'}</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetUrl}" style="display: inline-block; padding: 12px 30px; background: #4F46E5; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
      ${isFr ? 'Réinitialiser mon mot de passe' : 'Reset my password'}
    </a>
  </div>

  <p style="color: #666; font-size: 14px;">
    ${isFr
      ? 'Ce lien expirera dans 1 heure. Si vous n\'avez pas fait cette demande, ignorez simplement cet email.'
      : 'This link will expire in 1 hour. If you did not request this, simply ignore this email.'}
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
  <p style="color: #999; font-size: 12px; text-align: center;">BudgetOS</p>
</body>
</html>`;

    await this.sendMail(user.email, subject, html);
  }

  /**
   * Test SMTP connection
   * @returns {Promise<boolean>} true if connection successful
   */
  async testConnection() {
    const transporter = await this._getTransporter();
    await transporter.verify();
    logger.info('SMTP connection test successful');
    return true;
  }
}

const emailService = new EmailService();
export default emailService;

import User from '../models/User.js';
import { regenerateSession, destroySession } from '../middleware/session.js';
import { UnauthorizedError, BadRequestError } from '../utils/errors.js';
import logger from '../utils/logger.js';

export const register = async (req, res) => {
  const user = await User.create(req.body);
  
  // Créer la session
  req.session.userId = user.id;
  req.session.email = user.email;
  req.session.role = user.role;
  req.session.locale = user.locale;
  req.session.currency = user.currency;
  
  logger.info('User registered', { userId: user.id, email: user.email });
  
  res.status(201).json({
    success: true,
    data: { user },
  });
};

export const login = async (req, res) => {
  const { email, password, rememberMe } = req.body;
  
  const user = await User.findByEmail(email);
  if (!user) {
    throw new UnauthorizedError('Email ou mot de passe incorrect');
  }
  
  const isValid = await User.verifyPassword(password, user.passwordHash);
  if (!isValid) {
    logger.warn('Failed login attempt', { email });
    throw new UnauthorizedError('Email ou mot de passe incorrect');
  }
  
  // Régénérer la session pour prévenir la fixation de session
  await regenerateSession(req);
  
  // Configurer la session
  req.session.userId = user.id;
  req.session.email = user.email;
  req.session.role = user.role;
  req.session.locale = user.locale;
  req.session.currency = user.currency;
  
  if (rememberMe) {
    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 jours
  }
  
  // Mettre à jour la dernière connexion
  User.updateLastLogin(user.id);
  
  logger.info('User logged in', { userId: user.id });
  
  // Retirer le hash du mot de passe
  const { passwordHash, ...userWithoutPassword } = user;
  
  res.json({
    success: true,
    data: { user: userWithoutPassword },
  });
};

export const logout = async (req, res) => {
  const userId = req.session.userId;
  
  await destroySession(req);
  res.clearCookie(req.session?.name || 'budgetos.sid');
  
  logger.info('User logged out', { userId });
  
  res.json({
    success: true,
    message: 'Déconnexion réussie',
  });
};

export const getMe = async (req, res) => {
  const user = User.findById(req.user.id);
  if (!user) {
    throw new UnauthorizedError('Utilisateur non trouvé');
  }
  
  const settings = User.getSettings(req.user.id);
  
  res.json({
    success: true,
    data: { user, settings },
  });
};

export const updateProfile = async (req, res) => {
  const user = User.update(req.user.id, req.body);
  
  // Mettre à jour la session si nécessaire
  if (req.body.locale) req.session.locale = req.body.locale;
  if (req.body.currency) req.session.currency = req.body.currency;
  
  res.json({
    success: true,
    data: { user },
  });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  const user = await User.findByEmail(req.user.email);
  const isValid = await User.verifyPassword(currentPassword, user.passwordHash);
  
  if (!isValid) {
    throw new BadRequestError('Mot de passe actuel incorrect');
  }
  
  await User.changePassword(req.user.id, newPassword);
  
  logger.info('Password changed', { userId: req.user.id });
  
  res.json({
    success: true,
    message: 'Mot de passe modifié avec succès',
  });
};

export const updateSettings = async (req, res) => {
  const settings = User.updateSettings(req.user.id, req.body);
  
  res.json({
    success: true,
    data: { settings },
  });
};

export const getSettings = async (req, res) => {
  const settings = User.getSettings(req.user.id);
  
  res.json({
    success: true,
    data: { settings },
  });
};

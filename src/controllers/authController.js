import User from '../models/User.js';
import { regenerateSession, destroySession } from '../middleware/session.js';
import { UnauthorizedError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import logger from '../utils/logger.js';

export const register = async (req, res) => {
  // Dynamic imports to avoid circular dependencies
  const { default: knex } = await import('../database/connection.js');
  const { default: SystemSetting } = await import('../models/SystemSetting.js');
  const { default: Group } = await import('../models/Group.js');

  // Check if this is the first user (bootstrap mode)
  const userCount = await knex('users').count('* as count').first();
  const isFirstUser = Number(userCount?.count || 0) === 0;

  if (!isFirstUser) {
    // Check if public registration is enabled
    const allowRegistration = await SystemSetting.get('allow_public_registration');
    if (allowRegistration !== 'true') {
      throw new ForbiddenError('L\'inscription publique est désactivée');
    }
  }

  const user = await User.create(req.body);

  if (isFirstUser) {
    // First user becomes super_admin
    await knex('users').where('id', user.id).update({ role: 'super_admin' });
    user.role = 'super_admin';

    logger.info('First user registered as super_admin', { userId: user.id });
  } else {
    // Assign to default registration group
    const defaultGroupId = await SystemSetting.get('default_registration_group_id');
    if (defaultGroupId) {
      try {
        await Group.addMember(defaultGroupId, user.id, 'member');
      } catch (err) {
        logger.warn('Failed to add user to default group', {
          userId: user.id, groupId: defaultGroupId, error: err.message,
        });
      }
    }
  }

  // Create session
  req.session.userId = user.id;
  req.session.email = user.email;
  req.session.role = user.role;
  req.session.locale = user.locale;
  req.session.currency = user.currency;

  // Persist session to store before responding
  await new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });

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

  // Check if user account is active
  if (!user.isActive) {
    logger.warn('Login attempt on suspended account', { email });
    throw new ForbiddenError('Ce compte a été suspendu');
  }

  const isValid = await User.verifyPassword(password, user.passwordHash);
  if (!isValid) {
    logger.warn('Failed login attempt', { email });
    throw new UnauthorizedError('Email ou mot de passe incorrect');
  }

  // Regenerate session to prevent fixation
  await regenerateSession(req);

  // Configure session
  req.session.userId = user.id;
  req.session.email = user.email;
  req.session.role = user.role;
  req.session.locale = user.locale;
  req.session.currency = user.currency;

  if (rememberMe) {
    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  // Update last login
  await User.updateLastLogin(user.id);

  logger.info('User logged in', { userId: user.id });

  // Remove password hash from response
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
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new UnauthorizedError('Utilisateur non trouvé');
  }

  const settings = await User.getSettings(req.user.id);

  // Fetch user groups
  const { default: Group } = await import('../models/Group.js');
  const groups = await Group.findByUser(req.user.id);

  res.json({
    success: true,
    data: { user, settings, groups },
  });
};

export const updateProfile = async (req, res) => {
  const user = await User.update(req.user.id, req.body);

  // Update session if necessary
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
  const settings = await User.updateSettings(req.user.id, req.body);

  res.json({
    success: true,
    data: { settings },
  });
};

export const getSettings = async (req, res) => {
  const settings = await User.getSettings(req.user.id);

  res.json({
    success: true,
    data: { settings },
  });
};

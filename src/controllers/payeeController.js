import Payee from '../models/Payee.js';
import { createPayeeSchema, updatePayeeSchema, payeeQuerySchema } from '../validators/payees.js';
import { ValidationError } from '../utils/errors.js';

export const getPayees = async (req, res, next) => {
  try {
    const query = payeeQuerySchema.parse(req.query);
    const payees = Payee.findByUser(req.user.id, query);
    res.json({ data: payees });
  } catch (error) {
    next(error);
  }
};

export const getPayee = async (req, res, next) => {
  try {
    const payee = Payee.findByIdOrFail(req.params.id, req.user.id);
    res.json({ data: payee });
  } catch (error) {
    next(error);
  }
};

export const createPayee = async (req, res, next) => {
  try {
    const data = createPayeeSchema.parse(req.body);
    
    // Vérifier si un tiers avec ce nom existe déjà
    const existing = Payee.findByName(data.name, req.user.id);
    if (existing) {
      throw new ValidationError('Un tiers avec ce nom existe déjà');
    }
    
    const payee = Payee.create(req.user.id, data);
    res.status(201).json({ data: payee });
  } catch (error) {
    next(error);
  }
};

export const updatePayee = async (req, res, next) => {
  try {
    const data = updatePayeeSchema.parse(req.body);
    
    // Si le nom change, vérifier qu'il n'existe pas déjà
    if (data.name) {
      const existing = Payee.findByName(data.name, req.user.id);
      if (existing && existing.id !== req.params.id) {
        throw new ValidationError('Un tiers avec ce nom existe déjà');
      }
    }
    
    const payee = Payee.update(req.params.id, req.user.id, data);
    res.json({ data: payee });
  } catch (error) {
    next(error);
  }
};

export const getPayeeTransactionCount = async (req, res, next) => {
  try {
    const count = Payee.countTransactions(req.params.id, req.user.id);
    res.json({ data: { count } });
  } catch (error) {
    next(error);
  }
};

export const reassignPayeeTransactions = async (req, res, next) => {
  try {
    const { toPayeeId } = req.body;
    const result = Payee.reassignTransactions(req.params.id, toPayeeId, req.user.id);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const deletePayee = async (req, res, next) => {
  try {
    const result = Payee.delete(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

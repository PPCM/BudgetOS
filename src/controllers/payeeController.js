import Payee from '../models/Payee.js';
import { createPayeeSchema, updatePayeeSchema, payeeQuerySchema } from '../validators/payees.js';
import { ValidationError } from '../utils/errors.js';

export const getPayees = async (req, res, next) => {
  try {
    const query = payeeQuerySchema.parse(req.query);
    const payees = await Payee.findByUser(req.user.id, query);
    res.json({ data: payees });
  } catch (error) {
    next(error);
  }
};

export const getPayee = async (req, res, next) => {
  try {
    const payee = await Payee.findByIdOrFail(req.params.id, req.user.id);
    res.json({ data: payee });
  } catch (error) {
    next(error);
  }
};

export const createPayee = async (req, res, next) => {
  try {
    const data = createPayeeSchema.parse(req.body);

    // Check if a payee with this name already exists
    const existing = await Payee.findByName(data.name, req.user.id);
    if (existing) {
      throw new ValidationError('A payee with this name already exists', 'PAYEE_NAME_EXISTS');
    }

    const payee = await Payee.create(req.user.id, data);
    res.status(201).json({ data: payee });
  } catch (error) {
    next(error);
  }
};

export const updatePayee = async (req, res, next) => {
  try {
    const data = updatePayeeSchema.parse(req.body);

    // If the name changes, check it doesn't already exist
    if (data.name) {
      const existing = await Payee.findByName(data.name, req.user.id);
      if (existing && existing.id !== req.params.id) {
        throw new ValidationError('A payee with this name already exists', 'PAYEE_NAME_EXISTS');
      }
    }

    const payee = await Payee.update(req.params.id, req.user.id, data);
    res.json({ data: payee });
  } catch (error) {
    next(error);
  }
};

export const getPayeeTransactionCount = async (req, res, next) => {
  try {
    const count = await Payee.countTransactions(req.params.id, req.user.id);
    res.json({ data: { count } });
  } catch (error) {
    next(error);
  }
};

export const reassignPayeeTransactions = async (req, res, next) => {
  try {
    const { toPayeeId } = req.body;
    const result = await Payee.reassignTransactions(req.params.id, toPayeeId, req.user.id);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const deletePayee = async (req, res, next) => {
  try {
    const result = await Payee.delete(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

import Category from '../models/Category.js';

export const createCategory = async (req, res) => {
  const category = Category.create(req.user.id, req.body);
  res.status(201).json({ success: true, data: { category } });
};

export const getCategories = async (req, res) => {
  const categories = Category.findByUser(req.user.id, req.query);
  res.json({ success: true, data: { categories } });
};

export const getCategory = async (req, res) => {
  const category = Category.findByIdOrFail(req.params.id, req.user.id);
  res.json({ success: true, data: { category } });
};

export const updateCategory = async (req, res) => {
  const category = Category.update(req.params.id, req.user.id, req.body);
  res.json({ success: true, data: { category } });
};

export const deleteCategory = async (req, res) => {
  const result = Category.delete(req.params.id, req.user.id);
  res.json({ success: true, ...result });
};

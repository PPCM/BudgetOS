import Category from '../models/Category.js';

export const createCategory = async (req, res) => {
  const category = await Category.create(req.user.id, req.body);
  res.status(201).json({ success: true, data: { category } });
};

export const getCategories = async (req, res) => {
  const categories = await Category.findByUser(req.user.id, req.query);
  res.json({ success: true, data: { categories } });
};

export const getCategory = async (req, res) => {
  const category = await Category.findByIdOrFail(req.params.id, req.user.id);
  res.json({ success: true, data: { category } });
};

export const updateCategory = async (req, res) => {
  const category = await Category.update(req.params.id, req.user.id, req.body);
  res.json({ success: true, data: { category } });
};

export const deleteCategory = async (req, res) => {
  const result = await Category.delete(req.params.id, req.user.id);
  res.json({ success: true, ...result });
};

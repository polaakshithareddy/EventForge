import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { NotFoundError } from '../utils/AppError.js';

// Organizations

export const createOrganization = async (req, res) => {
  const { name } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const org = await Organization.create({ ...req.body, slug });
  res.status(201).json({ success: true, data: { organization: org } });
};

export const getOrganizations = async (req, res) => {
  const orgs = await Organization.find();
  res.json({ success: true, data: { organizations: orgs } });
};

export const getOrganization = async (req, res) => {
  const org = await Organization.findById(req.params.id);
  if (!org) throw new NotFoundError('Organization');
  res.json({ success: true, data: { organization: org } });
};

export const updateOrganization = async (req, res) => {
  const org = await Organization.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!org) throw new NotFoundError('Organization');
  res.json({ success: true, data: { organization: org } });
};

export const deleteOrganization = async (req, res) => {
  const org = await Organization.findByIdAndDelete(req.params.id);
  if (!org) throw new NotFoundError('Organization');
  res.json({ success: true, message: 'Organization deleted' });
};

// Users

export const getUsers = async (req, res) => {
  const users = await User.find().select('-passwordHash').populate('organization', 'name slug');
  res.json({ success: true, data: { users } });
};

export const getUser = async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash').populate('organization', 'name slug');
  if (!user) throw new NotFoundError('User');
  res.json({ success: true, data: { user } });
};

export const updateUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-passwordHash');
  if (!user) throw new NotFoundError('User');
  res.json({ success: true, data: { user } });
};

export const deleteUser = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new NotFoundError('User');
  res.json({ success: true, message: 'User deleted' });
};

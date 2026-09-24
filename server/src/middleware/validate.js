import { AppError } from '../utils/AppError.js';

export const validate = (schema) => (req, _res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    next(new AppError('Validation failed', 400, errors));
  }
};

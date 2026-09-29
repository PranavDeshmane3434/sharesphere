const authService = require('../services/auth.service');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

async function register(req, res, next) {
  try {
    const { email, password } = registerSchema.parse(req.body);
    const user = await authService.register(email, password);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
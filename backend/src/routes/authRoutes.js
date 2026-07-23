const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');

// Sem limite de tentativas, login/register eram alvo fácil de força bruta de
// senha e enumeração de e-mail em massa. 10 tentativas / 15min por IP é
// suficiente para uso legítimo e barra automação simples.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' }
});

router.post('/register', authLimiter, asyncHandler(authController.register));
router.post('/login', authLimiter, asyncHandler(authController.login));
router.get('/me', authenticateToken, authController.me);

module.exports = router;

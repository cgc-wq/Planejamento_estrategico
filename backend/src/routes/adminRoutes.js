const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticateToken = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');

router.get('/solicitacoes', authenticateToken, asyncHandler(adminController.listarSolicitacoes));
router.post('/solicitacoes/:id/aprovar', authenticateToken, asyncHandler(adminController.aprovarSolicitacao));
router.post('/solicitacoes/:id/rejeitar', authenticateToken, asyncHandler(adminController.rejeitarSolicitacao));

router.post('/cra-admins', authenticateToken, asyncHandler(adminController.criarCraAdmin));
router.get('/usuarios', authenticateToken, asyncHandler(adminController.listarUsuarios));
router.put('/usuarios/:id/status', authenticateToken, asyncHandler(adminController.atualizarStatusUsuario));

router.get('/nomes-custom', authenticateToken, asyncHandler(adminController.listarNomesCustom));
router.put('/nomes-custom', authenticateToken, asyncHandler(adminController.salvarNomeCustom));

router.get('/swot-items', authenticateToken, asyncHandler(adminController.listarSwotItems));
router.post('/swot-items', authenticateToken, asyncHandler(adminController.criarSwotItem));
router.put('/swot-items/:tipo/:id', authenticateToken, asyncHandler(adminController.salvarSwotItem));
router.delete('/swot-items/:tipo/:id', authenticateToken, asyncHandler(adminController.deletarSwotItem));

module.exports = router;

const express = require('express');
const router = express.Router();
const projetosController = require('../controllers/projetosController');
const authenticateToken = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');

router.get('/projetos', authenticateToken, asyncHandler(projetosController.listarProjetos));
router.get('/projetos/todos', authenticateToken, asyncHandler(projetosController.listarTodosProjetos));
router.post('/projetos', authenticateToken, asyncHandler(projetosController.criarProjeto));
router.put('/projetos/:id', authenticateToken, asyncHandler(projetosController.atualizarProjeto));
router.put('/projetos/:id/execucao', authenticateToken, asyncHandler(projetosController.atualizarExecucaoProjeto));
router.delete('/projetos/:id', authenticateToken, asyncHandler(projetosController.excluirProjeto));

router.get('/objetivos', authenticateToken, asyncHandler(projetosController.listarObjetivos));
router.put('/objetivos/:id', authenticateToken, asyncHandler(projetosController.atualizarObjetivo));

router.get('/objetivos/resultados', authenticateToken, asyncHandler(projetosController.listarResultadosObjetivo));
router.post('/objetivos/:id/resultados', authenticateToken, asyncHandler(projetosController.criarResultadoObjetivo));

module.exports = router;

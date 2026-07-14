const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const authenticateToken = require('../middlewares/auth');

router.post('/', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado ou formato inválido' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url, name: req.file.originalname });
});

module.exports = router;

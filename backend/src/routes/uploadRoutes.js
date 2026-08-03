const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const authenticateToken = require('../middlewares/auth');

router.post('/', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado ou formato inválido' });
  // encodeURIComponent evita que qualquer caractere especial no nome do arquivo
  // (mesmo já sanitizado) quebre a URL — ex: "#" seria interpretado como
  // fragmento e cortaria o resto do link no navegador.
  const url = `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(req.file.filename)}`;
  res.json({ url, name: Buffer.from(req.file.originalname, 'latin1').toString('utf8') });
});

module.exports = router;

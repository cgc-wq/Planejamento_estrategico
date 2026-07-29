const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Extensões permitidas, checadas a partir do nome do arquivo — o mimetype
// declarado no multipart/form-data é definido pelo cliente e pode ser
// forjado (ex: enviar um .svg/.html com Content-Type: image/png para burlar
// um filtro que confie só nisso). express.static decide o Content-Type de
// resposta pela EXTENSÃO do arquivo, então validar só o mimetype declarado
// deixaria passar arquivos .svg/.html capazes de rodar script quando abertos
// direto pela URL de /uploads (stored XSS).
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// Remove separadores de caminho e ".." do nome original antes de usá-lo — o
// multer não sanitiza travessia de diretório em file.originalname por conta própria.
const sanitizarNomeArquivo = (nome) => {
  return nome
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/\.\./g, '')
    .replace(/\s/g, '_');
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + sanitizarNomeArquivo(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Apenas imagens e documentos.'));
    }
  }
});

module.exports = upload;

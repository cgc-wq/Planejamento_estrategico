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

// Remove separadores de caminho e ".." do nome original — defesa contra
// travessia de diretório, que o multer não sanitiza em file.originalname
// por conta própria. A validação de espaço/caractere especial (abaixo, no
// fileFilter) já barra o resto antes de chegar aqui.
const sanitizarNomeArquivo = (nome) => {
  const nomeUtf8 = Buffer.from(nome, 'latin1').toString('utf8');
  return nomeUtf8
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/\.\./g, '');
};

// Letras (com acento), números, espaço, "_", "-" e "." (extensão) — espaço é
// seguro em URL (vira %20) e é o nome padrão de print de tela do Windows/Mac,
// então não faz sentido bloquear. O que quebra a URL gerada depois são os
// caracteres especiais tipo #, %, &, [, ], (, ) — # em especial vira fragmento
// e trunca o link no navegador ao abrir o anexo.
const NOME_ARQUIVO_VALIDO = /^[\p{L}\p{N}_.\- ]+$/u;

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
    const nomeUtf8 = Buffer.from(file.originalname, 'latin1').toString('utf8').normalize('NFC');
    if (!NOME_ARQUIVO_VALIDO.test(nomeUtf8)) {
      return cb(new Error('Nome do arquivo não pode ter caracteres especiais (ex: #, %, &, [, ], (, )). Renomeie usando apenas letras, números, espaço, "-" ou "_" e tente novamente.'));
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Apenas imagens e documentos.'));
    }
  }
});

module.exports = upload;

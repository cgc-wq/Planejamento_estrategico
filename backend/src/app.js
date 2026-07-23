const express = require('express');
const cors = require('cors');
const path = require('path');
const { errorHandler } = require('./middlewares/errorHandler');

const authRoutes = require('./routes/authRoutes');
const projetosRoutes = require('./routes/projetosRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// cors() sem opções reflete/permite qualquer origem — restringimos à(s)
// origem(ns) conhecida(s) do frontend (configurável via CORS_ORIGINS no .env).
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Requisições sem header Origin (ex: curl, apps mobile, mesma origem) são permitidas.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origem não permitida por CORS'));
  }
}));
app.use(express.json());

// X-Content-Type-Options: nosniff reduz o risco de um arquivo enviado (ex: um
// .svg/.html com mimetype forjado no upload) ser executado pelo navegador
// como HTML/script ao ser aberto diretamente pela URL de /uploads.
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff')
}));

// Serve o próprio frontend (index.html, js/, style.css) direto por este servidor.
// Isso elimina a necessidade de um dev server externo (ex: extensão Live Server)
// para abrir a página — e, principalmente, elimina o auto-reload que essas
// ferramentas disparam ao detectar qualquer arquivo novo no workspace (como os
// uploads salvos em backend/uploads), que estava interrompendo o envio do formulário
// de resultados no meio do processo.
app.use(express.static(path.join(__dirname, '../..')));


app.use('/api/auth', authRoutes);
app.use('/api', projetosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Tratamento global de erros
app.use(errorHandler);

module.exports = app;

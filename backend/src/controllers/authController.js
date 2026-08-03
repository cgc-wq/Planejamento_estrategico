const { pool } = require('../config/db');
const { sendResetPasswordEmail } = require('../services/emailService');
const { validarSenha } = require('../utils/validarSenha');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

exports.register = async (req, res) => {
  const { nome, email, senha, entidade, setor } = req.body;

  const erroSenha = validarSenha(senha);
  if (erroSenha) {
    return res.status(400).json({ message: erroSenha });
  }

  const userExists = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  if (userExists.rows.length > 0) {
    return res.status(400).json({ message: 'E-mail já cadastrado' });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  await pool.query(
    'INSERT INTO usuarios (nome, email, senha_hash, entidade, setor, status, role) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, nome, email',
    [nome, email, senhaHash, entidade, setor, 'pendente', 'usuario']
  );

  res.status(201).json({ message: 'Cadastro realizado com sucesso! Aguarde aprovação.' });
};

exports.login = async (req, res) => {
  const { email, senha } = req.body;
  const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user) return res.status(400).json({ message: 'Usuário não encontrado' });

  const validPassword = await bcrypt.compare(senha, user.senha_hash);
  if (!validPassword) return res.status(400).json({ message: 'Senha incorreta' });

  if (user.status !== 'aprovado' && user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ message: 'Sua conta ainda não foi aprovada pelo administrador' });
  }

  const isGlobalAdmin = user.email === process.env.ADMIN_EMAIL;
  const role = user.role || (isGlobalAdmin ? 'admin' : 'usuario');
  const grupoCalculado = isGlobalAdmin
    ? 'ADMIN'
    : (role === 'cra_admin'
        ? (user.cra_admin_scope || user.entidade)
        : (user.entidade === 'CFA' ? `CFA - ${user.setor}` : user.entidade));
        
  const userData = {
    id: user.id,
    nome: user.nome,
    email: user.email,
    entidade: user.entidade,
    setor: user.setor,
    role,
    cra_admin_scope: user.cra_admin_scope || null,
    grupo: grupoCalculado
  };

  const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '8h' });

  res.json({ token, user: userData });
};

// Mensagem de sucesso genérica — sempre a mesma, exista ou não o e-mail, para
// não permitir enumeração de contas cadastradas (OWASP A07).
const MENSAGEM_FORGOT_PASSWORD_GENERICA = 'Se este e-mail estiver cadastrado, enviaremos as instruções de redefinição de senha.';

// Token de curta duração — 20 min por padrão (configurável via .env). Antes
// era 1h; janelas mais curtas reduzem o tempo de exposição caso o e-mail seja
// interceptado ou o link fique esquecido em algum lugar (histórico, log etc.).
const RESET_TOKEN_EXPIRY_MINUTES = parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES || '20', 10);

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user) {
    // Mesma resposta do caminho de sucesso — não revela se o e-mail existe.
    return res.json({ message: MENSAGEM_FORGOT_PASSWORD_GENERICA });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  // Só o HASH do token vai para o banco — quem tiver acesso de leitura ao
  // banco (dump, backup, injeção) não consegue reconstituir o token válido.
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenExp = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await pool.query(
    'UPDATE usuarios SET reset_token = $1, reset_token_exp = $2 WHERE id = $3',
    [hashedToken, tokenExp, user.id]
  );

  // NUNCA usar req.headers.referer aqui: é um header controlado pelo próprio
  // cliente da requisição — um atacante pode forjá-lo para apontar para um
  // domínio próprio, fazendo o link de redefinição (com o token válido) ser
  // enviado por e-mail à vítima apontando para o site do atacante
  // ("password reset poisoning" → account takeover). A URL do frontend deve
  // vir de uma variável de ambiente fixa, nunca da requisição.
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const resetLink = `${baseUrl}/?token=${rawToken}`;
  const isDev = process.env.NODE_ENV !== 'production';

  try {
    // Falha de envio é registrada mas não muda a resposta ao cliente (mesma
    // mensagem genérica, sem vazar erro interno de infra).
    const { sent } = await sendResetPasswordEmail(user, resetLink, RESET_TOKEN_EXPIRY_MINUTES);
    if (sent) {
      console.log(`[FORGOT PASSWORD] E-mail de redefinição enviado (usuário id=${user.id}).`);
    } else if (isDev) {
      // Só em desenvolvimento: sem SMTP configurado, imprime o link no console
      // para permitir testar o fluxo localmente sem precisar de e-mail real.
      console.log(`[FORGOT PASSWORD] [DEV] SMTP não configurado — link para redefinir (id=${user.id}): ${resetLink}`);
    } else {
      // Em produção, SMTP ausente é uma falha operacional grave (o usuário
      // nunca vai receber o link) — loga como crítico para alertar o time,
      // mas SEM imprimir o token e sem mudar a resposta ao cliente.
      console.error(`[FORGOT PASSWORD] CRÍTICO: SMTP não configurado em produção — reset de senha do usuário id=${user.id} não pôde ser entregue.`);
    }
  } catch (err) {
    console.error(`[FORGOT PASSWORD] Falha ao ENVIAR e-mail (usuário id=${user.id}):`, err.message);
  }

  res.json({ message: MENSAGEM_FORGOT_PASSWORD_GENERICA });
};

exports.resetPassword = async (req, res) => {
  const { token, senha } = req.body;

  const erroSenha = validarSenha(senha);
  if (erroSenha) {
    return res.status(400).json({ message: erroSenha });
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const result = await pool.query(
    'SELECT * FROM usuarios WHERE reset_token = $1 AND reset_token_exp > CURRENT_TIMESTAMP',
    [hashedToken]
  );
  const user = result.rows[0];

  if (!user) {
    return res.status(400).json({ message: 'Token inválido ou expirado.' });
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  await pool.query(
    'UPDATE usuarios SET senha_hash = $1, reset_token = NULL, reset_token_exp = NULL WHERE id = $2',
    [senhaHash, user.id]
  );

  res.json({ message: 'Senha redefinida com sucesso!' });
};

exports.me = (req, res) => {
  res.json(req.user);
};

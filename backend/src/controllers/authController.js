const { pool } = require('../config/db');
const transporter = require('../config/mailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

exports.register = async (req, res) => {
  const { nome, email, senha, entidade, setor } = req.body;
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

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user) {
    return res.status(400).json({ message: 'E-mail não cadastrado' });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenExp = new Date(Date.now() + 3600000); // 1 hora

  await pool.query(
    'UPDATE usuarios SET reset_token = $1, reset_token_exp = $2 WHERE id = $3',
    [hashedToken, tokenExp, user.id]
  );

  const referer = req.headers.referer || 'http://localhost:5500/';
  const baseUrl = referer.split('?')[0];
  const separator = baseUrl.endsWith('/') ? '' : '/';
  const resetLink = `${baseUrl}${separator}?token=${rawToken}`;

  console.log(`[FORGOT PASSWORD] Token gerado para ${email}: ${rawToken}`);
  console.log(`[FORGOT PASSWORD] Link para redefinir: ${resetLink}`);

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const mailOptions = {
      from: '"Sistema PES 2026" <noreply@cfa.org.br>',
      to: email,
      subject: 'Redefinição de Senha - Sistema PES 2026',
      html: `
        <div style="font-family: 'Sora', Arial, sans-serif; color: #141A2E; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #D6E0F0; border-radius: 14px;">
          <h2 style="color: #0B2C6E; text-align: center;">Recuperação de Senha</h2>
          <p>Olá, <strong>${user.nome}</strong>,</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta no painel do PES 2026.</p>
          <p>Para prosseguir, clique no botão abaixo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #1756B8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Redefinir Minha Senha</a>
          </div>
          <p style="font-size: 12px; color: #4A5568;">Caso o botão acima não funcione, copie e cole o link abaixo no seu navegador:</p>
          <p style="font-size: 11px; color: #1756B8; word-break: break-all;">${resetLink}</p>
          <hr style="border: 0; border-top: 1px solid #D6E0F0; margin: 20px 0;">
          <p style="font-size: 11px; color: #4A5568;">Este link expira em 1 hora. Se você não solicitou esta alteração, ignore este e-mail.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'E-mail de recuperação enviado com sucesso!' });
  } else {
    res.json({ 
      message: 'Solicitação gerada com sucesso! (Modo Desenvolvimento: o link para redefinir foi impresso no console do backend).'
    });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, senha } = req.body;
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

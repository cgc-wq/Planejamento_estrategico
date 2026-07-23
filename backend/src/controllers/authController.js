const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

exports.me = (req, res) => {
  res.json(req.user);
};

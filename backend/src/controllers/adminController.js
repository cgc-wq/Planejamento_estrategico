const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

exports.listarSolicitacoes = async (req, res) => {
  const isGlobalAdmin = req.user.email === process.env.ADMIN_EMAIL;
  const isCraAdmin = req.user.role === 'cra_admin';
  const craScope = req.user.cra_admin_scope || '';

  if (!isGlobalAdmin && !isCraAdmin) return res.status(403).json({ message: 'Acesso negado' });
  if (isCraAdmin && !craScope) return res.status(403).json({ message: 'Escopo do CRA não configurado' });

  let query = `
    SELECT s.*, u.nome as usuario_nome, p.nome as projeto_nome_original
    FROM solicitacoes s
    JOIN usuarios u ON s.usuario_id = u.id
    LEFT JOIN projetos p ON s.projeto_id = p.id
    WHERE s.status = 'pendente'
  `;
  const params = [];

  if (isCraAdmin) {
    query += ' AND u.entidade = $1';
    params.push(craScope);
  }

  query += ' ORDER BY s.criado_em DESC';

  const result = await pool.query(query, params);
  res.json(result.rows);
};

exports.aprovarSolicitacao = async (req, res) => {
  const isGlobalAdmin = req.user.email === process.env.ADMIN_EMAIL;
  const isCraAdmin = req.user.role === 'cra_admin';
  const craScope = req.user.cra_admin_scope || '';

  if (!isGlobalAdmin && !isCraAdmin) return res.status(403).json({ message: 'Acesso negado' });
  if (isCraAdmin && !craScope) return res.status(403).json({ message: 'Escopo do CRA não configurado' });

  const { id } = req.params;

  const solResult = await pool.query(`
    SELECT s.*, u.entidade as usuario_entidade
    FROM solicitacoes s
    JOIN usuarios u ON s.usuario_id = u.id
    WHERE s.id = $1
  `, [id]);
  if (solResult.rows.length === 0) return res.status(404).json({ message: 'Solicitação não encontrada' });

  const sol = solResult.rows[0];
  if (isCraAdmin && sol.usuario_entidade !== craScope) {
    return res.status(403).json({ message: 'Você só pode aprovar solicitações do seu CRA' });
  }

  const data = sol.dados;

  if (sol.tipo === 'CRIACAO') {
    const query = `INSERT INTO projetos (unidade, tipo, frequencia, perspectiva, objetivo_id, nome, descricao, responsavel, prazo, orcamento, indicador_nome, indicador_tipo, meta_num, res_num, meta_data, res_data, meta_quali, res_quali, status, execucao, acoes_execucao, entregas_periodicas) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`;
    const values = [data.unidade, data.tipo, data.frequencia, data.perspectiva, data.objetivo, data.nome, data.descricao, data.responsavel, data.prazo || null, data.orcamento, data.indicador, data.indicador_tipo, data.meta, data.resultado, data.meta_data || null, data.resultado_data || null, data.meta_quali, data.progresso_quali, data.status, data.execucao, JSON.stringify(data.acoes_execucao || []), JSON.stringify(data.entregas_periodicas || {})];
    await pool.query(query, values);
  } else if (sol.tipo === 'EDICAO') {
    const query = `UPDATE projetos SET unidade = $1, tipo = $2, frequencia = $3, perspectiva = $4, objetivo_id = $5, nome = $6, descricao = $7, responsavel = $8, prazo = $9, orcamento = $10, indicador_nome = $11, indicador_tipo = $12, meta_num = $13, res_num = $14, meta_data = $15, res_data = $16, meta_quali = $17, res_quali = $18, status = $19, execucao = $20, acoes_execucao = $21, entregas_periodicas = $22 WHERE id = $23`;
    const values = [data.unidade, data.tipo, data.frequencia, data.perspectiva, data.objetivo, data.nome, data.descricao, data.responsavel, data.prazo || null, data.orcamento, data.indicador, data.indicador_tipo, data.meta, data.resultado, data.meta_data || null, data.resultado_data || null, data.meta_quali, data.progresso_quali, data.status, data.execucao, JSON.stringify(data.acoes_execucao || []), JSON.stringify(data.entregas_periodicas || {}), sol.projeto_id];
    await pool.query(query, values);
  } else if (sol.tipo === 'EXCLUSAO') {
    await pool.query('DELETE FROM projetos WHERE id = $1', [sol.projeto_id]);
  }

  await pool.query("UPDATE solicitacoes SET status = 'aprovado' WHERE id = $1", [id]);
  res.json({ message: 'Solicitação aprovada e aplicada com sucesso' });
};

exports.rejeitarSolicitacao = async (req, res) => {
  const isGlobalAdmin = req.user.email === process.env.ADMIN_EMAIL;
  const isCraAdmin = req.user.role === 'cra_admin';
  const craScope = req.user.cra_admin_scope || '';

  if (!isGlobalAdmin && !isCraAdmin) return res.status(403).json({ message: 'Acesso negado' });
  if (isCraAdmin && !craScope) return res.status(403).json({ message: 'Escopo do CRA não configurado' });

  const { id } = req.params;

  if (isCraAdmin) {
    const solResult = await pool.query(`
      SELECT u.entidade as usuario_entidade
      FROM solicitacoes s
      JOIN usuarios u ON s.usuario_id = u.id
      WHERE s.id = $1
    `, [id]);
    if (solResult.rows.length === 0) return res.status(404).json({ message: 'Solicitação não encontrada' });
    if (solResult.rows[0].usuario_entidade !== craScope) {
      return res.status(403).json({ message: 'Você só pode rejeitar solicitações do seu CRA' });
    }
  }

  await pool.query("UPDATE solicitacoes SET status = 'rejeitado' WHERE id = $1", [id]);
  res.json({ message: 'Solicitação rejeitada' });
};

exports.criarCraAdmin = async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ message: 'Acesso negado' });

  const { nome, email, senha, entidade } = req.body;
  if (!nome || !email || !senha || !entidade) {
    return res.status(400).json({ message: 'Nome, e-mail, senha e CRA são obrigatórios' });
  }

  const exists = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (exists.rows.length > 0) {
    return res.status(400).json({ message: 'Este e-mail já está cadastrado' });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  await pool.query(
    'INSERT INTO usuarios (nome, email, senha_hash, entidade, setor, status, role, cra_admin_scope) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [nome, email, senhaHash, entidade, null, 'aprovado', 'cra_admin', entidade]
  );

  res.status(201).json({ message: 'Administrador do CRA criado com sucesso' });
};

exports.listarUsuarios = async (req, res) => {
  const isGlobalAdmin = req.user.email === process.env.ADMIN_EMAIL;
  const isCraAdmin = req.user.role === 'cra_admin';
  const craScope = req.user.cra_admin_scope || '';

  if (!isGlobalAdmin && !isCraAdmin) return res.status(403).json({ message: 'Acesso negado' });
  if (isCraAdmin && !craScope) return res.status(403).json({ message: 'Escopo do CRA não configurado' });

  let query = 'SELECT id, nome, email, entidade, setor, status, role, created_at FROM usuarios';
  const params = [];

  if (isCraAdmin) {
    query += ' WHERE entidade = $1 AND status IN ($2, $3)';
    params.push(craScope, 'pendente', 'bloqueado');
  }

  const statusParamIndex = params.length + 1;
  query += ` ORDER BY CASE WHEN status = $${statusParamIndex} THEN 0 ELSE 1 END, created_at DESC`;
  params.push('pendente');

  const result = await pool.query(query, params);
  res.json(result.rows);
};

exports.atualizarStatusUsuario = async (req, res) => {
  const isGlobalAdmin = req.user.email === process.env.ADMIN_EMAIL;
  const isCraAdmin = req.user.role === 'cra_admin';
  const craScope = req.user.cra_admin_scope || '';

  if (!isGlobalAdmin && !isCraAdmin) return res.status(403).json({ message: 'Acesso negado' });
  if (isCraAdmin && !craScope) return res.status(403).json({ message: 'Escopo do CRA não configurado' });

  const { status } = req.body;
  const target = await pool.query('SELECT id, entidade, role, email FROM usuarios WHERE id = $1', [req.params.id]);
  if (target.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' });

  const usuario = target.rows[0];

  if (isCraAdmin) {
    if (usuario.entidade !== craScope) return res.status(403).json({ message: 'Você só pode aprovar usuários do seu CRA' });
    if (usuario.role === 'cra_admin' && usuario.email !== req.user.email) return res.status(403).json({ message: 'Acesso negado' });
  }

  await pool.query('UPDATE usuarios SET status = $1 WHERE id = $2', [status, req.params.id]);
  res.json({ message: 'Status do usuário atualizado' });
};

exports.listarNomesCustom = async (req, res) => {
  const result = await pool.query('SELECT chave, nome_custom FROM perspectivas_custom');
  const mapa = {};
  result.rows.forEach(row => {
    mapa[row.chave] = row.nome_custom;
  });
  res.json(mapa);
};

exports.salvarNomeCustom = async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ message: 'Acesso negado' });
  }
  const { chave, nome } = req.body;
  if (!chave || !nome || !nome.trim()) {
    return res.status(400).json({ message: 'Chave e nome são obrigatórios' });
  }
  await pool.query(
    `INSERT INTO perspectivas_custom (chave, nome_custom, atualizado_em) 
     VALUES ($1, $2, CURRENT_TIMESTAMP) 
     ON CONFLICT (chave) DO UPDATE SET nome_custom = $2, atualizado_em = CURRENT_TIMESTAMP`,
    [chave, nome.trim()]
  );
  res.json({ message: 'Nome atualizado com sucesso' });
};

exports.listarSwotItems = async (req, res) => {
  const result = await pool.query('SELECT id, tipo, posicao, descricao FROM swot_items ORDER BY tipo, posicao');
  const swotMap = { forcas: [], fraquezas: [], oportunidades: [], ameacas: [] };

  result.rows.forEach(row => {
    const tipoMap = { forcas: 'forcas', fraquezas: 'fraquezas', oportunidades: 'oportunidades', ameacas: 'ameacas' };
    if (tipoMap[row.tipo]) {
      swotMap[row.tipo].push({ id: row.id, descricao: row.descricao, posicao: row.posicao });
    }
  });
  return res.json(swotMap);
};

exports.salvarSwotItem = async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ message: 'Acesso negado' });
  }
  const { tipo, id } = req.params;
  const { descricao } = req.body;
  if (!descricao || !descricao.trim()) {
    return res.status(400).json({ message: 'Descrição é obrigatória' });
  }
  const result = await pool.query(
    'UPDATE swot_items SET descricao = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2 AND tipo = $3 RETURNING id',
    [descricao.trim(), id, tipo]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Item não encontrado' });
  }
  res.json({ message: 'Item atualizado com sucesso', id: result.rows[0].id });
};

exports.criarSwotItem = async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ message: 'Acesso negado' });
  }
  const { tipo, descricao } = req.body;
  if (!tipo || !descricao || !descricao.trim()) {
    return res.status(400).json({ message: 'Tipo e descrição são obrigatórios' });
  }
  const posResult = await pool.query('SELECT MAX(posicao) as max_pos FROM swot_items WHERE tipo = $1', [tipo]);
  const nextPos = (posResult.rows[0]?.max_pos || 0) + 1;
  const result = await pool.query(
    'INSERT INTO swot_items (tipo, posicao, descricao, atualizado_em) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id',
    [tipo, nextPos, descricao.trim()]
  );
  res.status(201).json({ message: 'Item criado com sucesso', id: result.rows[0].id });
};

exports.deletarSwotItem = async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ message: 'Acesso negado' });
  }
  const { tipo, id } = req.params;
  const result = await pool.query(
    'DELETE FROM swot_items WHERE id = $1 AND tipo = $2 RETURNING id',
    [id, tipo]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Item não encontrado' });
  }
  res.json({ message: 'Item deletado com sucesso' });
};

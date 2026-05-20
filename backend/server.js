const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configuração do PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuração do Multer para uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Middleware de Autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Token não fornecido' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
};

// Função para comparar alterações em projetos
const gerarResumoAlteracao = (antigo, novo) => {
  const campos = {
    unidade: 'Unidade',
    tipo: 'Tipo',
    frequencia: 'Frequência',
    perspectiva: 'Perspectiva',
    objetivo_id: 'Objetivo',
    nome: 'Nome',
    descricao: 'Descrição',
    responsavel: 'Responsável',
    prazo: 'Prazo',
    orcamento: 'Orçamento',
    indicador_nome: 'Indicador',
    indicador_tipo: 'Tipo de Indicador',
    meta_num: 'Meta Numérica',
    res_num: 'Resultado Numérico',
    meta_data: 'Meta (Data)',
    res_data: 'Resultado (Data)',
    meta_quali: 'Meta Qualitativa',
    res_quali: 'Resultado Qualitativo',
    status: 'Status',
    execucao: 'Execução (%)'
  };

  let resumo = [];
  
  const mapaNovo = {
    unidade: novo.unidade,
    tipo: novo.tipo,
    frequencia: novo.frequencia,
    perspectiva: novo.perspectiva,
    objetivo_id: novo.objetivo,
    nome: novo.nome,
    descricao: novo.descricao,
    responsavel: novo.responsavel,
    prazo: novo.prazo,
    orcamento: novo.orcamento,
    indicador_nome: novo.indicador,
    indicador_tipo: novo.indicador_tipo,
    meta_num: novo.meta,
    res_num: novo.resultado,
    meta_data: novo.meta_data,
    res_data: novo.resultado_data,
    meta_quali: novo.meta_quali,
    res_quali: novo.progresso_quali,
    status: novo.status,
    execucao: novo.execucao
  };

  for (let key in campos) {
    let valAntigo = antigo[key];
    let valNovo = mapaNovo[key];

    // Normalização para comparação
    if (valAntigo instanceof Date) valAntigo = valAntigo.toISOString().split('T')[0];
    if (valNovo instanceof Date) valNovo = valNovo.toISOString().split('T')[0];
    
    // Converte null/undefined para string vazia para evitar falsos positivos
    const sAntigo = (valAntigo === null || valAntigo === undefined) ? '' : String(valAntigo).trim();
    const sNovo = (valNovo === null || valNovo === undefined) ? '' : String(valNovo).trim();

    if (sAntigo !== sNovo) {
      console.log(`[COMPARACAO] Campo ${key} mudou: "${sAntigo}" -> "${sNovo}"`);
      resumo.push(`<strong>${campos[key]}:</strong> ${sAntigo || '(vazio)'} &rarr; ${sNovo || '(vazio)'}`);
    }
  }

  const resultado = resumo.join(' | ');
  console.log(`[RESUMO GERADO] ${resultado || 'Sem mudanças detectadas'}`);
  return resultado || 'Alteração em campos complexos (Ações/Entregas).';
};

// ==========================================
// ROTAS DE AUTENTICAÇÃO
// ==========================================

// Cadastro de Usuário
app.post('/api/auth/register', async (req, res) => {
  const { nome, email, senha, entidade, setor } = req.body;
  
  try {
    const userExists = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'E-mail já cadastrado' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const newUser = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash, entidade, setor, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nome, email',
      [nome, email, senhaHash, entidade, setor, 'pendente']
    );

    res.status(201).json({ message: 'Cadastro realizado com sucesso! Aguarde aprovação.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao cadastrar usuário' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) return res.status(400).json({ message: 'Usuário não encontrado' });

    const validPassword = await bcrypt.compare(senha, user.senha_hash);
    if (!validPassword) return res.status(400).json({ message: 'Senha incorreta' });

    if (user.status !== 'aprovado' && user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Sua conta ainda não foi aprovada pelo administrador' });
    }

    const userData = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      entidade: user.entidade,
      setor: user.setor,
      grupo: user.email === process.env.ADMIN_EMAIL ? 'ADMIN' : (user.entidade === 'CFA' ? `CFA - ${user.setor}` : user.entidade)
    };

    const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({ token, user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

// Verificar sessão ativa
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

// ==========================================
// ROTAS DE PROJETOS
// ==========================================

// Listar Projetos (com filtro por unidade se não for ADMIN)
app.get('/api/projetos', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT p.*, 
      EXISTS (SELECT 1 FROM solicitacoes s WHERE s.projeto_id = p.id AND s.status = 'pendente') as tem_pendencia 
      FROM projetos p
    `;
    let params = [];

    if (req.user.grupo !== 'ADMIN') {
      query += ' WHERE p.unidade = $1';
      params.push(req.user.grupo);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar projetos' });
  }
});

// Listar TODOS os Projetos (para Indicadores/SWOT)
app.get('/api/projetos/todos', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, 
      EXISTS (SELECT 1 FROM solicitacoes s WHERE s.projeto_id = p.id AND s.status = 'pendente') as tem_pendencia 
      FROM projetos p
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar todos os projetos' });
  }
});

// Criar Projeto (Sem moderação - qualquer usuário pode criar diretamente)
app.post('/api/projetos', authenticateToken, async (req, res) => {
  const data = req.body;
  console.log(`[POST /projetos] User: ${req.user.email} está criando o projeto "${data.nome}"`);

  try {
    const query = `
      INSERT INTO projetos (
        unidade, tipo, frequencia, perspectiva, objetivo_id, nome, descricao, responsavel, prazo, orcamento, 
        indicador_nome, indicador_tipo, meta_num, res_num, meta_data, res_data, meta_quali, res_quali, status, execucao, acoes_execucao, entregas_periodicas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING id
    `;
    const values = [
      data.unidade, data.tipo, data.frequencia, data.perspectiva, data.objetivo, data.nome, data.descricao,
      data.responsavel, data.prazo || null, data.orcamento, data.indicador, data.indicador_tipo,
      data.meta, data.resultado, data.meta_data || null, data.resultado_data || null, data.meta_quali, data.progresso_quali,
      data.status, data.execucao, JSON.stringify(data.acoes_execucao || []), JSON.stringify(data.entregas_periodicas || {})
    ];
    const result = await pool.query(query, values);
    res.status(201).json({ id: result.rows[0].id, message: 'Projeto criado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao processar criação' });
  }
});

// Atualizar Projeto (com moderação)
app.put('/api/projetos/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const isAdmin = req.user.email === process.env.ADMIN_EMAIL;

  try {
    if (isAdmin) {
      const query = `
        UPDATE projetos SET
          unidade = $1, tipo = $2, frequencia = $3, perspectiva = $4, objetivo_id = $5,
          nome = $6, descricao = $7, responsavel = $8, prazo = $9, orcamento = $10,
          indicador_nome = $11, indicador_tipo = $12, meta_num = $13, res_num = $14,
          meta_data = $15, res_data = $16, meta_quali = $17, res_quali = $18,
          status = $19, execucao = $20, acoes_execucao = $21, entregas_periodicas = $22
        WHERE id = $23
      `;
      const values = [
        data.unidade, data.tipo, data.frequencia, data.perspectiva, data.objetivo, data.nome, data.descricao,
        data.responsavel, data.prazo || null, data.orcamento, data.indicador, data.indicador_tipo,
        data.meta, data.resultado, data.meta_data || null, data.resultado_data || null, data.meta_quali, data.progresso_quali,
        data.status, data.execucao, JSON.stringify(data.acoes_execucao || []), JSON.stringify(data.entregas_periodicas || {}),
        id
      ];
      await pool.query(query, values);
      res.json({ message: 'Projeto atualizado com sucesso' });
    } else {
      // Buscar dados atuais para comparar
      const projetoAtual = await pool.query('SELECT * FROM projetos WHERE id = $1', [id]);
      const resumo = gerarResumoAlteracao(projetoAtual.rows[0], data);

      await pool.query(
        'INSERT INTO solicitacoes (projeto_id, tipo, dados, usuario_id, status, resumo) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, 'EDICAO', JSON.stringify(data), req.user.id, 'pendente', resumo]
      );
      res.status(202).json({ message: 'Solicitação de alteração enviada para aprovação do Administrador' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao processar alteração' });
  }
});

// Excluir Projeto (com moderação)
app.delete('/api/projetos/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { justificativa } = req.body;
  const isAdmin = req.user.email === process.env.ADMIN_EMAIL;

  try {
    if (isAdmin) {
      await pool.query('DELETE FROM projetos WHERE id = $1', [id]);
      res.json({ message: 'Projeto excluído com sucesso' });
    } else {
      await pool.query(
        'INSERT INTO solicitacoes (projeto_id, tipo, dados, usuario_id, status, resumo) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, 'EXCLUSAO', JSON.stringify({}), req.user.id, 'pendente', justificativa || 'Sem justificativa.']
      );
      res.status(202).json({ message: 'Solicitação de exclusão enviada para aprovação do Administrador' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao processar exclusão' });
  }
});

// ==========================================
// ROTAS DE ADMINISTRAÇÃO (SOLICITAÇÕES)
// ==========================================

// Listar Solicitações Pendentes
app.get('/api/admin/solicitacoes', authenticateToken, async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ message: 'Acesso negado' });
  try {
    const result = await pool.query(`
      SELECT s.*, u.nome as usuario_nome, p.nome as projeto_nome_original 
      FROM solicitacoes s 
      JOIN usuarios u ON s.usuario_id = u.id 
      LEFT JOIN projetos p ON s.projeto_id = p.id
      WHERE s.status = 'pendente'
      ORDER BY s.criado_em DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar solicitações' });
  }
});

// Aprovar Solicitação
app.post('/api/admin/solicitacoes/:id/aprovar', authenticateToken, async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ message: 'Acesso negado' });
  const { id } = req.params;

  try {
    const solResult = await pool.query('SELECT * FROM solicitacoes WHERE id = $1', [id]);
    if (solResult.rows.length === 0) return res.status(404).json({ message: 'Solicitação não encontrada' });
    
    const sol = solResult.rows[0];
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao aprovar solicitação' });
  }
});

// Rejeitar Solicitação
app.post('/api/admin/solicitacoes/:id/rejeitar', authenticateToken, async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ message: 'Acesso negado' });
  const { id } = req.params;
  try {
    await pool.query("UPDATE solicitacoes SET status = 'rejeitado' WHERE id = $1", [id]);
    res.json({ message: 'Solicitação rejeitada' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao rejeitar solicitação' });
  }
});

// ==========================================
// ROTAS DE OBJETIVOS
// ==========================================

app.get('/api/objetivos', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM objetivos');
    const objetivosMap = {};
    result.rows.forEach(row => {
      objetivosMap[row.id] = row;
    });
    res.json(objetivosMap);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar objetivos' });
  }
});

app.put('/api/objetivos/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { indicador, meta, resultado } = req.body;
  try {
    await pool.query(
      'UPDATE objetivos SET indicador = $1, meta = $2, resultado = $3, atualizado_em = CURRENT_TIMESTAMP WHERE id = $4',
      [indicador, meta, resultado, id]
    );
    res.json({ message: 'Objetivo atualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar objetivo' });
  }
});

// ==========================================
// ROTAS DE ADMINISTRAÇÃO
// ==========================================

// Listar Usuários
app.get('/api/admin/usuarios', authenticateToken, async (req, res) => {
  if (req.user.grupo !== 'ADMIN') return res.status(403).json({ message: 'Acesso negado' });
  try {
    const result = await pool.query('SELECT id, nome, email, entidade, setor, status, created_at FROM usuarios');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar usuários' });
  }
});

// Atualizar Status de Usuário
app.put('/api/admin/usuarios/:id/status', authenticateToken, async (req, res) => {
  if (req.user.grupo !== 'ADMIN') return res.status(403).json({ message: 'Acesso negado' });
  const { status } = req.body;
  try {
    await pool.query('UPDATE usuarios SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ message: 'Status do usuário atualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});

// ==========================================
// ROTA DE UPLOADS
// ==========================================

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url, name: req.file.originalname });
});

app.listen(port, () => {
  console.log(`Servidor PES 2026 rodando em http://localhost:${port}`);
});

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configuração do PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Inicialização do Banco de Dados para recuperar senha
const initDB = async () => {
  try {
    await pool.query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_token_exp TIMESTAMP,
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'usuario',
      ADD COLUMN IF NOT EXISTS cra_admin_scope VARCHAR(100);
    `);
    // Tabela para nomes personalizados de perspectivas e objetivos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS perspectivas_custom (
        chave VARCHAR(100) PRIMARY KEY,
        nome_custom VARCHAR(500) NOT NULL,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Tabela para itens SWOT customizados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS swot_items (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL,
        posicao INTEGER NOT NULL,
        descricao TEXT NOT NULL,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Popula a tabela SWOT_ITEMS com dados padrões se estiver vazia
    const countResult = await pool.query('SELECT COUNT(*) FROM swot_items');
    if (countResult.rows[0].count === 0) {
      const swotDefaults = [
        { tipo: 'forcas', items: ['Sistema bem estruturado', 'Padronização de normas operacionais', 'Bom número de registrados', 'Diversidade de segmentos de atuação', 'Sistema Eletrônico de Informações (SEI)', 'Serviços on-line', 'Academia Corporativa da Administração', 'Capilaridade nacional', 'Sustentabilidade financeira'] },
        { tipo: 'fraquezas', items: ['Concorrência com outras profissões', 'Marketshare baixo', 'Identidade profissional fraca', 'Deficiência em treinamento', 'Baixa integração entre os Regionais', 'Falta de articulação política', 'Baixa fiscalização profissional'] },
        { tipo: 'oportunidades', items: ['Grande número de egressos sem registro', 'Crescente número de tecnólogos', 'Nova Lei de Licitações', 'Ambientação on-line', 'Investimento em ESG', 'Acordos com MPT', 'Áreas da economia criativa'] },
        { tipo: 'ameacas', items: ['Desvalorização da profissão', 'Projetos de desregulamentação no Congresso', 'Cenário econômico: desemprego', 'Precarização do ensino', 'Decisões judiciais desfavoráveis', 'Outras profissões na área privativa'] }
      ];
      
      for (const swotType of swotDefaults) {
        for (let i = 0; i < swotType.items.length; i++) {
          await pool.query(
            'INSERT INTO swot_items (tipo, posicao, descricao) VALUES ($1, $2, $3)',
            [swotType.tipo, i + 1, swotType.items[i]]
          );
        }
      }
      console.log('[DB] Itens SWOT padrões inseridos.');
    }
    
    // ============================================================
    // MIGRAÇÃO: Corrige projetos com unidade no formato antigo
    // "CRA_ADMIN - CRA-XX" → "CRA-XX"
    // Isso ocorreu porque o campo 'grupo' do token era montado
    // incorretamente antes da correção de julho/2026.
    // ============================================================
    const migResult = await pool.query(`
      SELECT id, unidade FROM projetos
      WHERE unidade LIKE 'CRA_ADMIN - %'
    `);
    if (migResult.rows.length > 0) {
      for (const row of migResult.rows) {
        // Extrai o CRA correto: "CRA_ADMIN - CRA-AC" → "CRA-AC"
        const craCorrigido = row.unidade.replace('CRA_ADMIN - ', '').trim();
        await pool.query('UPDATE projetos SET unidade = $1 WHERE id = $2', [craCorrigido, row.id]);
        console.log(`[MIGRAÇÃO] Projeto #${row.id}: "${row.unidade}" → "${craCorrigido}"`);
      }
      console.log(`[MIGRAÇÃO] ${migResult.rows.length} projeto(s) corrigido(s).`);
    }

    // ============================================================
    // MIGRAÇÃO 2: Corrige projetos com unidade no formato
    // "qualquercoisa (CRA-XX)" → "CRA-XX"
    // Ex: "teste (CRA-AC)" → "CRA-AC"
    // ============================================================
    const migResult2 = await pool.query(`
      SELECT id, unidade FROM projetos
      WHERE unidade ~ '\\(CRA-[A-Z]{2}\\)$'
        AND unidade NOT LIKE 'CRA-%'
    `);
    if (migResult2.rows.length > 0) {
      for (const row of migResult2.rows) {
        // Extrai o CRA dos parênteses: "teste (CRA-AC)" → "CRA-AC"
        const match = row.unidade.match(/\(CRA-([A-Z]{2})\)$/);
        if (match) {
          const craCorrigido = `CRA-${match[1]}`;
          await pool.query('UPDATE projetos SET unidade = $1 WHERE id = $2', [craCorrigido, row.id]);
          console.log(`[MIGRAÇÃO 2] Projeto #${row.id}: "${row.unidade}" → "${craCorrigido}"`);
        }
      }
      console.log(`[MIGRAÇÃO 2] ${migResult2.rows.length} projeto(s) corrigido(s).`);
    }



    console.log('[DB] Colunas de redefinição de senha, perspectivas_custom e swot_items prontas.');
  } catch (err) {
    console.error('[DB] Erro ao inicializar colunas:', err);
  }
};
initDB();


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

    if (valAntigo instanceof Date) valAntigo = valAntigo.toISOString().split('T')[0];
    if (valNovo instanceof Date) valNovo = valNovo.toISOString().split('T')[0];

    const sAntigo = (valAntigo === null || valAntigo === undefined) ? '' : String(valAntigo).trim();
    const sNovo = (valNovo === null || valNovo === undefined) ? '' : String(valNovo).trim();

    if (sAntigo !== sNovo) {
      resumo.push(`<strong>${campos[key]}:</strong> ${sAntigo || '(vazio)'} &rarr; ${sNovo || '(vazio)'}`);
    }
  }

  const resultado = resumo.join(' | ');
  return resultado || 'Alteração em campos complexos (Ações/Entregas).';
};


// Cadastro de Usuário
app.post('/api/auth/register', async (req, res) => {
  const { nome, email, senha, entidade, setor } = req.body;

  try {
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

    const isGlobalAdmin = user.email === process.env.ADMIN_EMAIL;
    const role = user.role || (isGlobalAdmin ? 'admin' : 'usuario');
    // Para cra_admin, o grupo é o próprio cra_admin_scope (ex: 'CRA-SP')
    // Isso garante que o filtro de projetos no backend funcione corretamente.
    const grupoCalculado = isGlobalAdmin
      ? 'ADMIN'
      : (role === 'cra_admin'
          ? (user.cra_admin_scope || user.entidade)  // usa o scope direto como grupo
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525', 10),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

// Solicitar recuperação de senha
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'E-mail não cadastrado' });
    }

    // Gerar token seguro de 32 bytes
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExp = new Date(Date.now() + 3600000); // 1 hora

    await pool.query(
      'UPDATE usuarios SET reset_token = $1, reset_token_exp = $2 WHERE id = $3',
      [token, tokenExp, user.id]
    );

    // Identificar a origem de quem chamou a API para gerar um link correto
    const referer = req.headers.referer || 'http://localhost:5500/';
    const baseUrl = referer.split('?')[0];
    const separator = baseUrl.endsWith('/') ? '' : '/';
    const resetLink = `${baseUrl}${separator}?token=${token}`;

    console.log(`[FORGOT PASSWORD] Token gerado para ${email}: ${token}`);
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao processar recuperação de senha' });
  }
});

// Redefinir senha usando token
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, senha } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE reset_token = $1 AND reset_token_exp > CURRENT_TIMESTAMP',
      [token]
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao redefinir a senha' });
  }
});


// Verificar sessão ativa
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

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

// Criar Projeto 
app.post('/api/projetos', authenticateToken, async (req, res) => {
  const data = req.body;
  console.log(`[POST /projetos] User: ${req.user.email} está criando o projeto "${data.nome}"`);

  try {
    const query = `
      INSERT INTO projetos (
        unidade, tipo, frequencia, perspectiva, objetivo_id, nome, descricao, responsavel, prazo, orcamento, 
        indicador_nome, indicador_tipo, meta_num, res_num, meta_data, res_data, meta_quali, res_quali, status, execucao, acoes_execucao, entregas_periodicas,
        anexo_url, anexo_nome
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING id
    `;
    const values = [
      data.unidade, data.tipo, data.frequencia, data.perspectiva, data.objetivo, data.nome, data.descricao,
      data.responsavel, data.prazo || null, data.orcamento, data.indicador, data.indicador_tipo,
      data.meta, data.resultado, data.meta_data || null, data.resultado_data || null, data.meta_quali, data.progresso_quali,
      data.status, data.execucao, JSON.stringify(data.acoes_execucao || []), JSON.stringify(data.entregas_periodicas || {}),
      data.anexoUrl || null, data.anexoNome || null
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
          status = $19, execucao = $20, acoes_execucao = $21, entregas_periodicas = $22,
          anexo_url = $23, anexo_nome = $24
        WHERE id = $25
      `;
      const values = [
        data.unidade, data.tipo, data.frequencia, data.perspectiva, data.objetivo, data.nome, data.descricao,
        data.responsavel, data.prazo || null, data.orcamento, data.indicador, data.indicador_tipo,
        data.meta, data.resultado, data.meta_data || null, data.resultado_data || null, data.meta_quali, data.progresso_quali,
        data.status, data.execucao, JSON.stringify(data.acoes_execucao || []), JSON.stringify(data.entregas_periodicas || {}),
        data.anexoUrl || null, data.anexoNome || null,
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


// Criar administrador de CRA
app.post('/api/admin/cra-admins', authenticateToken, async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ message: 'Acesso negado' });

  const { nome, email, senha, entidade } = req.body;
  if (!nome || !email || !senha || !entidade) {
    return res.status(400).json({ message: 'Nome, e-mail, senha e CRA são obrigatórios' });
  }

  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao criar administrador do CRA' });
  }
});

// Listar Usuários
app.get('/api/admin/usuarios', authenticateToken, async (req, res) => {
  const isGlobalAdmin = req.user.email === process.env.ADMIN_EMAIL;
  const isCraAdmin = req.user.role === 'cra_admin';
  const craScope = req.user.cra_admin_scope || '';

  if (!isGlobalAdmin && !isCraAdmin) return res.status(403).json({ message: 'Acesso negado' });
  if (isCraAdmin && !craScope) return res.status(403).json({ message: 'Escopo do CRA não configurado' });

  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar usuários' });
  }
});

// Atualizar Status de Usuário
app.put('/api/admin/usuarios/:id/status', authenticateToken, async (req, res) => {
  const isGlobalAdmin = req.user.email === process.env.ADMIN_EMAIL;
  const isCraAdmin = req.user.role === 'cra_admin';
  const craScope = req.user.cra_admin_scope || '';

  if (!isGlobalAdmin && !isCraAdmin) return res.status(403).json({ message: 'Acesso negado' });
  if (isCraAdmin && !craScope) return res.status(403).json({ message: 'Escopo do CRA não configurado' });

  const { status } = req.body;
  try {
    const target = await pool.query('SELECT id, entidade, role, email FROM usuarios WHERE id = $1', [req.params.id]);
    if (target.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' });

    const usuario = target.rows[0];

    if (isCraAdmin) {
      if (usuario.entidade !== craScope) return res.status(403).json({ message: 'Você só pode aprovar usuários do seu CRA' });
      if (usuario.role === 'cra_admin' && usuario.email !== req.user.email) return res.status(403).json({ message: 'Acesso negado' });
    }

    await pool.query('UPDATE usuarios SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ message: 'Status do usuário atualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});


app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url, name: req.file.originalname });
});

// NOMES CUSTOMIZADOS (Perspectivas e Objetivos)

// Carregar nomes customizados
app.get('/api/admin/nomes-custom', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT chave, nome_custom FROM perspectivas_custom');
    const mapa = {};
    result.rows.forEach(row => {
      mapa[row.chave] = row.nome_custom;
    });
    res.json(mapa);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar nomes customizados' });
  }
});

// Salvar nome customizado (admin only)
app.put('/api/admin/nomes-custom', authenticateToken, async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ message: 'Acesso negado' });
  }
  const { chave, nome } = req.body;
  if (!chave || !nome || !nome.trim()) {
    return res.status(400).json({ message: 'Chave e nome são obrigatórios' });
  }
  try {
    await pool.query(
      `INSERT INTO perspectivas_custom (chave, nome_custom, atualizado_em) 
       VALUES ($1, $2, CURRENT_TIMESTAMP) 
       ON CONFLICT (chave) DO UPDATE SET nome_custom = $2, atualizado_em = CURRENT_TIMESTAMP`,
      [chave, nome.trim()]
    );
    res.json({ message: 'Nome atualizado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao salvar nome customizado' });
  }
});

// GERENCIAMENTO DE ITENS SWOT
app.get('/api/admin/swot-items', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, tipo, posicao, descricao FROM swot_items ORDER BY tipo, posicao');
    const swotMap = { forcas: [], fraquezas: [], oportunidades: [], ameacas: [] };

    if (result.rows.length === 0) {
      const defaults = {
        forcas: ['Sistema bem estruturado', 'Padronização de normas operacionais', 'Bom número de registrados', 'Diversidade de segmentos de atuação', 'Sistema Eletrônico de Informações (SEI)', 'Serviços on-line', 'Academia Corporativa da Administração', 'Capilaridade nacional', 'Sustentabilidade financeira'],
        fraquezas: ['Concorrência com outras profissões', 'Marketshare baixo', 'Identidade profissional fraca', 'Deficiência em treinamento', 'Baixa integração entre os Regionais', 'Falta de articulação política', 'Baixa fiscalização profissional'],
        oportunidades: ['Grande número de egressos sem registro', 'Crescente número de tecnólogos', 'Nova Lei de Licitações', 'Ambientação on-line', 'Investimento em ESG', 'Acordos com MPT', 'Áreas da economia criativa'],
        ameacas: ['Desvalorização da profissão', 'Projetos de desregulamentação no Congresso', 'Cenário econômico: desemprego', 'Precarização do ensino', 'Decisões judiciais desfavoráveis', 'Outras profissões na área privativa']
      };

      for (const [tipo, itens] of Object.entries(defaults)) {
        for (let i = 0; i < itens.length; i++) {
          await pool.query('INSERT INTO swot_items (tipo, posicao, descricao) VALUES ($1, $2, $3)', [tipo, i + 1, itens[i]]);
        }
      }

      const seeded = await pool.query('SELECT id, tipo, posicao, descricao FROM swot_items ORDER BY tipo, posicao');
      seeded.rows.forEach(row => {
        if (swotMap[row.tipo]) {
          swotMap[row.tipo].push({ id: row.id, descricao: row.descricao, posicao: row.posicao });
        }
      });
      return res.json(swotMap);
    }

    result.rows.forEach(row => {
      const tipoMap = { forcas: 'forcas', fraquezas: 'fraquezas', oportunidades: 'oportunidades', ameacas: 'ameacas' };
      if (tipoMap[row.tipo]) {
        swotMap[row.tipo].push({ id: row.id, descricao: row.descricao, posicao: row.posicao });
      }
    });
    res.json(swotMap);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar itens SWOT' });
  }
});

// Salvar item SWOT (criar ou atualizar)
app.put('/api/admin/swot-items/:tipo/:id', authenticateToken, async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ message: 'Acesso negado' });
  }
  
  const { tipo, id } = req.params;
  const { descricao } = req.body;
  
  if (!descricao || !descricao.trim()) {
    return res.status(400).json({ message: 'Descrição é obrigatória' });
  }

  try {
    const result = await pool.query(
      'UPDATE swot_items SET descricao = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2 AND tipo = $3 RETURNING id',
      [descricao.trim(), id, tipo]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item não encontrado' });
    }

    res.json({ message: 'Item atualizado com sucesso', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao salvar item SWOT' });
  }
});

// Adicionar novo item SWOT
app.post('/api/admin/swot-items', authenticateToken, async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  const { tipo, descricao } = req.body;

  if (!tipo || !descricao || !descricao.trim()) {
    return res.status(400).json({ message: 'Tipo e descrição são obrigatórios' });
  }

  try {
    const posResult = await pool.query('SELECT MAX(posicao) as max_pos FROM swot_items WHERE tipo = $1', [tipo]);
    const nextPos = (posResult.rows[0]?.max_pos || 0) + 1;

    const result = await pool.query(
      'INSERT INTO swot_items (tipo, posicao, descricao, atualizado_em) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id',
      [tipo, nextPos, descricao.trim()]
    );

    res.status(201).json({ message: 'Item criado com sucesso', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao criar item SWOT' });
  }
});

// Deletar item SWOT
app.delete('/api/admin/swot-items/:tipo/:id', authenticateToken, async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  const { tipo, id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM swot_items WHERE id = $1 AND tipo = $2 RETURNING id',
      [id, tipo]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item não encontrado' });
    }

    res.json({ message: 'Item deletado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao deletar item SWOT' });
  }
});

app.listen(port, () => {
  console.log(`Servidor PES 2026 rodando em http://localhost:${port}`);
});
const { pool } = require('../config/db');

const gerarResumoAlteracao = (antigo, novo) => {
  const campos = {
    unidade: 'Unidade', tipo: 'Tipo', frequencia: 'Frequência', perspectiva: 'Perspectiva',
    objetivo_id: 'Objetivo', nome: 'Nome', descricao: 'Descrição', responsavel: 'Responsável',
    prazo: 'Prazo', orcamento: 'Orçamento', indicador_nome: 'Indicador', indicador_tipo: 'Tipo de Indicador',
    meta_num: 'Meta Numérica', res_num: 'Resultado Numérico', meta_data: 'Meta (Data)', res_data: 'Resultado (Data)',
    meta_quali: 'Meta Qualitativa', res_quali: 'Resultado Qualitativo', status: 'Status', execucao: 'Execução (%)'
  };

  let resumo = [];
  const mapaNovo = {
    unidade: novo.unidade, tipo: novo.tipo, frequencia: novo.frequencia, perspectiva: novo.perspectiva,
    objetivo_id: novo.objetivo, nome: novo.nome, descricao: novo.descricao, responsavel: novo.responsavel,
    prazo: novo.prazo, orcamento: novo.orcamento, indicador_nome: novo.indicador, indicador_tipo: novo.indicador_tipo,
    meta_num: novo.meta, res_num: novo.resultado, meta_data: novo.meta_data, res_data: novo.resultado_data,
    meta_quali: novo.meta_quali, res_quali: novo.progresso_quali, status: novo.status, execucao: novo.execucao
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

  return resumo.join(' | ') || 'Alteração em campos complexos (Ações/Entregas).';
};

exports.listarProjetos = async (req, res) => {
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
};

exports.listarTodosProjetos = async (req, res) => {
  const result = await pool.query(`
    SELECT p.*, 
    EXISTS (SELECT 1 FROM solicitacoes s WHERE s.projeto_id = p.id AND s.status = 'pendente') as tem_pendencia 
    FROM projetos p
  `);
  res.json(result.rows);
};

exports.criarProjeto = async (req, res) => {
  const data = req.body;
  console.log(`[POST /projetos] User: ${req.user.email} está criando o projeto "${data.nome}"`);

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
};

exports.atualizarProjeto = async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const isAdmin = req.user.email === process.env.ADMIN_EMAIL;

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
    const projetoAtual = await pool.query('SELECT * FROM projetos WHERE id = $1', [id]);
    if (projetoAtual.rows.length === 0) return res.status(404).json({ message: 'Projeto não encontrado' });
    
    const resumo = gerarResumoAlteracao(projetoAtual.rows[0], data);

    await pool.query(
      'INSERT INTO solicitacoes (projeto_id, tipo, dados, usuario_id, status, resumo) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, 'EDICAO', JSON.stringify(data), req.user.id, 'pendente', resumo]
    );
    res.status(202).json({ message: 'Solicitação de alteração enviada para aprovação do Administrador' });
  }
};

exports.excluirProjeto = async (req, res) => {
  const { id } = req.params;
  const { justificativa } = req.body;
  const isAdmin = req.user.email === process.env.ADMIN_EMAIL;

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
};

exports.listarObjetivos = async (req, res) => {
  const result = await pool.query('SELECT * FROM objetivos');
  const objetivosMap = {};
  result.rows.forEach(row => {
    objetivosMap[row.id] = row;
  });
  res.json(objetivosMap);
};

exports.atualizarObjetivo = async (req, res) => {
  const { id } = req.params;
  const { indicador, meta, resultado } = req.body;
  
  await pool.query(
    'UPDATE objetivos SET indicador = $1, meta = $2, resultado = $3, atualizado_em = CURRENT_TIMESTAMP WHERE id = $4',
    [indicador, meta, resultado, id]
  );
  res.json({ message: 'Objetivo atualizado' });
};

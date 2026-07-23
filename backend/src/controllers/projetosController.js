const { pool } = require('../config/db');

// Aceita apenas URLs http(s) — bloqueia esquemas perigosos como
// javascript:/data:/vbscript: que poderiam ser injetados em anexo_url /
// evidencia_url (vindos de req.body, não validados pelo upload em si) e
// executar script quando o link for renderizado como <a href="...">.
const isSafeHttpUrl = (url) => {
  if (!url || typeof url !== 'string') return true; // campo opcional/vazio
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Um usuário comum só pode ler/gravar projetos da própria unidade (CRA/CFA).
// Sem essa checagem, atualizarProjeto/atualizarExecucaoProjeto/excluirProjeto
// aceitavam qualquer :id, permitindo IDOR entre unidades diferentes.
const podeAcessarProjeto = (req, unidadeDoProjeto) => {
  return req.user.grupo === 'ADMIN' || req.user.grupo === unidadeDoProjeto;
};

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

  if (!isSafeHttpUrl(data.anexoUrl)) {
    return res.status(400).json({ message: 'URL de anexo inválida.' });
  }

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

  if (!isSafeHttpUrl(data.anexoUrl)) {
    return res.status(400).json({ message: 'URL de anexo inválida.' });
  }

  // Busca o projeto uma única vez: valida existência + posse (IDOR) antes de
  // qualquer caminho (admin ou solicitação pendente).
  const projetoAtual = await pool.query('SELECT * FROM projetos WHERE id = $1', [id]);
  if (projetoAtual.rows.length === 0) return res.status(404).json({ message: 'Projeto não encontrado' });

  if (!podeAcessarProjeto(req, projetoAtual.rows[0].unidade)) {
    return res.status(403).json({ message: 'Você não tem permissão para alterar este projeto.' });
  }

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
    const resumo = gerarResumoAlteracao(projetoAtual.rows[0], data);

    await pool.query(
      'INSERT INTO solicitacoes (projeto_id, tipo, dados, usuario_id, status, resumo) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, 'EDICAO', JSON.stringify(data), req.user.id, 'pendente', resumo]
    );
    res.status(202).json({ message: 'Solicitação de alteração enviada para aprovação do Administrador' });
  }
};

// Envio de execução do projeto (ações de execução, indicador/resultado inline,
// status) e entregas periódicas das atividades — sempre aplicado direto, sem
// fila de aprovação. Diferente de atualizarProjeto (edição de campos gerais
// do projeto), que continua exigindo aprovação do Admin Master para não-admins.
exports.atualizarExecucaoProjeto = async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  if (!isSafeHttpUrl(data.anexoUrl)) {
    return res.status(400).json({ message: 'URL de anexo inválida.' });
  }

  const projetoAtual = await pool.query('SELECT id, unidade FROM projetos WHERE id = $1', [id]);
  if (projetoAtual.rows.length === 0) return res.status(404).json({ message: 'Projeto não encontrado' });

  if (!podeAcessarProjeto(req, projetoAtual.rows[0].unidade)) {
    return res.status(403).json({ message: 'Você não tem permissão para atualizar a execução deste projeto.' });
  }

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
  res.json({ message: 'Execução atualizada com sucesso' });
};

exports.excluirProjeto = async (req, res) => {
  const { id } = req.params;
  const { justificativa } = req.body;
  const isAdmin = req.user.email === process.env.ADMIN_EMAIL;

  // Antes não verificava nem se o projeto existia nem a quem pertencia —
  // qualquer usuário autenticado podia abrir uma solicitação de exclusão
  // (ou, sendo admin, excluir de fato) para o :id de qualquer outra unidade.
  const projetoAtual = await pool.query('SELECT id, unidade FROM projetos WHERE id = $1', [id]);
  if (projetoAtual.rows.length === 0) return res.status(404).json({ message: 'Projeto não encontrado' });

  if (!podeAcessarProjeto(req, projetoAtual.rows[0].unidade)) {
    return res.status(403).json({ message: 'Você não tem permissão para excluir este projeto.' });
  }

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
  const isMasterAdmin = req.user.email === process.env.ADMIN_EMAIL;

  if (!isMasterAdmin) {
    return res.status(403).json({ message: 'Apenas o Administrador Master pode editar a meta e o indicador geral do objetivo.' });
  }

  await pool.query(
    'UPDATE objetivos SET indicador = $1, meta = $2, resultado = $3, atualizado_em = CURRENT_TIMESTAMP WHERE id = $4',
    [indicador, meta, resultado, id]
  );
  res.json({ message: 'Objetivo atualizado' });
};

// =============================================
// RESULTADOS DE OBJETIVO POR CRA (com evidência)
// =============================================

exports.listarResultadosObjetivo = async (req, res) => {
  const isMasterAdmin = req.user.email === process.env.ADMIN_EMAIL;

  let query = `
    SELECT r.*, u.nome as autor_nome
    FROM objetivo_resultados r
    LEFT JOIN usuarios u ON u.id = r.usuario_id
  `;
  const params = [];

  // Cada CRA/Câmara/entidade só vê os próprios resultados. O Admin Master
  // é o único que tem visão global (mesma regra de "grupo" usada em listarProjetos).
  if (!isMasterAdmin) {
    const entidadeUsuario = req.user.cra_admin_scope || req.user.entidade || req.user.grupo;
    query += ' WHERE r.entidade = $1';
    params.push(entidadeUsuario);
  }

  query += ' ORDER BY r.criado_em DESC';

  const result = await pool.query(query, params);

  const agrupado = {};
  result.rows.forEach(row => {
    // node-postgres retorna NUMERIC como string (ex: "15.00"); convertendo para
    // Number aqui, o JSON.stringify já sai sem zeros decimais à toa (15, 15.5, ...)
    row.resultado = Number(row.resultado);
    if (!agrupado[row.objetivo_id]) agrupado[row.objetivo_id] = [];
    agrupado[row.objetivo_id].push(row);
  });
  res.json(agrupado);
};

exports.criarResultadoObjetivo = async (req, res) => {
  const { id } = req.params;
  const isMasterAdmin = req.user.email === process.env.ADMIN_EMAIL;

  if (isMasterAdmin) {
    return res.status(403).json({ message: 'O Administrador Master apenas visualiza os resultados. O preenchimento é exclusivo dos usuários e administradores dos CRAs.' });
  }

  const { resultado, observacao, evidencia_url, evidencia_nome } = req.body;
  const resultadoNum = parseFloat(resultado);

  if (resultado === undefined || resultado === null || resultado === '' || isNaN(resultadoNum) || resultadoNum < 0 || resultadoNum > 100) {
    return res.status(400).json({ message: 'Informe um percentual de resultado válido (0 a 100).' });
  }
  if (!evidencia_url) {
    return res.status(400).json({ message: 'É obrigatório anexar uma evidência.' });
  }
  if (!isSafeHttpUrl(evidencia_url)) {
    return res.status(400).json({ message: 'URL de evidência inválida.' });
  }

  const entidade = req.user.cra_admin_scope || req.user.entidade || req.user.grupo;

  const insert = await pool.query(
    `INSERT INTO objetivo_resultados (objetivo_id, entidade, usuario_id, resultado, observacao, evidencia_url, evidencia_nome)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [id, entidade, req.user.id, resultadoNum, observacao || null, evidencia_url, evidencia_nome || null]
  );

  const row = insert.rows[0];
  row.resultado = Number(row.resultado); // mesmo tratamento do listar, para o retorno do POST já vir limpo
  res.status(201).json(row);
};

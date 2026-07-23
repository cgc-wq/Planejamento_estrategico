const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const runMigrations = async () => {
  try {
    console.log('[DB] Iniciando migrações...');
    await pool.query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_token_exp TIMESTAMP,
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'usuario',
      ADD COLUMN IF NOT EXISTS cra_admin_scope VARCHAR(100);
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS perspectivas_custom (
        chave VARCHAR(100) PRIMARY KEY,
        nome_custom VARCHAR(500) NOT NULL,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[DB] Criando índices de performance...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_projetos_unidade ON projetos(unidade);
      CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes(status);
      CREATE INDEX IF NOT EXISTS idx_projetos_objetivo_id ON projetos(objetivo_id);
      CREATE INDEX IF NOT EXISTS idx_usuarios_entidade_status ON usuarios(entidade, status);
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS objetivo_resultados (
        id SERIAL PRIMARY KEY,
        objetivo_id VARCHAR(10) NOT NULL REFERENCES objetivos(id),
        entidade VARCHAR(100) NOT NULL,
        usuario_id INTEGER REFERENCES usuarios(id),
        resultado NUMERIC(15,2) NOT NULL,
        observacao TEXT,
        evidencia_url TEXT NOT NULL,
        evidencia_nome TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_objetivo_resultados_objetivo_id ON objetivo_resultados(objetivo_id);
    `);

    const getOrCreatePerspectiva = async (nome) => {
      const existente = await pool.query('SELECT id FROM perspectivas WHERE nome = $1', [nome]);
      if (existente.rows.length > 0) return existente.rows[0].id;
      const inserido = await pool.query('INSERT INTO perspectivas (nome) VALUES ($1) RETURNING id', [nome]);
      return inserido.rows[0].id;
    };

    const perspectivasSeed = {
      sustentabilidade: 'Sustentabilidade Social e Ambiental',
      processos: 'Desenvolvimento Institucional / Processos Internos',
      clientes: 'Clientes',
      financeiro: 'Financeira / Sustentabilidade Econômica'
    };
    const perspIds = {};
    for (const [key, nome] of Object.entries(perspectivasSeed)) {
      perspIds[key] = await getOrCreatePerspectiva(nome);
    }

    const objetivosSeed = [
      { id: 'SA1', persp: 'sustentabilidade', nome: 'Estimular uso de energia solar no Sistema CFA/CRAs' },
      { id: 'SA2', persp: 'sustentabilidade', nome: 'Desenvolver conscientização na internalização dos ODS e ESG' },
      { id: 'SA3', persp: 'sustentabilidade', nome: 'Apoiar ações ESG na sociedade' },
      { id: 'SA4', persp: 'sustentabilidade', nome: 'Disseminar ações de digitalização/virtualização' },
      { id: 'SA5', persp: 'sustentabilidade', nome: 'Promover ações de economia circular' },
      { id: 'PI1', persp: 'processos', nome: 'Empreender nivelamento de transformação digital e padronização de processos entre o CFA e os CRAs' },
      { id: 'PI2', persp: 'processos', nome: 'Orientar o gerenciamento dos processos nos Conselhos Regionais' },
      { id: 'PI3', persp: 'processos', nome: 'Capacitar colaboradores e conselheiros' },
      { id: 'PI4', persp: 'processos', nome: 'Estabelecer e gerenciar indicadores de monitoramento' },
      { id: 'CL1', persp: 'clientes', nome: 'Fortalecer as competências dos registrados' },
      { id: 'CL2', persp: 'clientes', nome: 'Fortalecer a identidade profissional' },
      { id: 'CL3', persp: 'clientes', nome: 'Incentivar e desenvolver projetos inovadores voltados aos profissionais de Administração' },
      { id: 'FI1', persp: 'financeiro', nome: 'Implementar tecnologias de fiscalização unificadas com os Conselhos Regionais' },
      { id: 'FI2', persp: 'financeiro', nome: 'Aprimorar a gestão financeira' },
      { id: 'FI3', persp: 'financeiro', nome: 'Prospectar e buscar novas fontes de receita' }
    ];

    for (const obj of objetivosSeed) {
      await pool.query(
        `INSERT INTO objetivos (id, nome, perspectiva_id) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [obj.id, obj.nome, perspIds[obj.persp]]
      );
    }
    console.log('[DB] Objetivos padrão garantidos (15 objetivos).');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS swot_items (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL,
        posicao INTEGER NOT NULL,
        descricao TEXT NOT NULL,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    const countResult = await pool.query('SELECT COUNT(*) FROM swot_items');
    if (countResult.rows[0].count === '0') {
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
    
    const migResult = await pool.query(`
      SELECT id, unidade FROM projetos
      WHERE unidade LIKE 'CRA_ADMIN - %'
    `);
    if (migResult.rows.length > 0) {
      for (const row of migResult.rows) {
        const craCorrigido = row.unidade.replace('CRA_ADMIN - ', '').trim();
        await pool.query('UPDATE projetos SET unidade = $1 WHERE id = $2', [craCorrigido, row.id]);
        console.log(`[MIGRAÇÃO] Projeto #${row.id}: "${row.unidade}" → "${craCorrigido}"`);
      }
      console.log(`[MIGRAÇÃO] ${migResult.rows.length} projeto(s) corrigido(s).`);
    }

    const migResult2 = await pool.query(`
      SELECT id, unidade FROM projetos
      WHERE unidade ~ '\\(CRA-[A-Z]{2}\\)$'
        AND unidade NOT LIKE 'CRA-%'
    `);
    if (migResult2.rows.length > 0) {
      for (const row of migResult2.rows) {
        const match = row.unidade.match(/\(CRA-([A-Z]{2})\)$/);
        if (match) {
          const craCorrigido = `CRA-${match[1]}`;
          await pool.query('UPDATE projetos SET unidade = $1 WHERE id = $2', [craCorrigido, row.id]);
          console.log(`[MIGRAÇÃO 2] Projeto #${row.id}: "${row.unidade}" → "${craCorrigido}"`);
        }
      }
      console.log(`[MIGRAÇÃO 2] ${migResult2.rows.length} projeto(s) corrigido(s).`);
    }

    console.log('[DB] Migrações concluídas.');
  } catch (err) {
    console.error('[DB] Erro ao rodar migrações:', err);
  } finally {
    await pool.end();
  }
};

runMigrations();

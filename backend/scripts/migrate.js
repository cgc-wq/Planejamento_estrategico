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

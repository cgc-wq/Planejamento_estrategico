const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS solicitacoes (
        id SERIAL PRIMARY KEY,
        projeto_id INTEGER REFERENCES projetos(id) ON DELETE CASCADE,
        tipo VARCHAR(20) NOT NULL,
        dados JSONB NOT NULL,
        usuario_id INTEGER REFERENCES usuarios(id),
        status VARCHAR(20) DEFAULT 'pendente',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(sql);
    console.log(' Tabela solicitacoes criada com sucesso!');
  } catch (err) {
    console.error(' Erro:', err.message);
  } finally {
    await pool.end();
  }
}

createTable();

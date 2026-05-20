const { Pool } = require('pg');
require('dotenv').config();

async function check() {
  console.log('--- Diagnóstico & Atualização PES 2026 ---');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Conexão com PostgreSQL: OK');
    
    console.log('\n--- USUÁRIOS ---');
    const users = await pool.query('SELECT id, nome, email, entidade, setor, status FROM usuarios');
    console.table(users.rows);

    console.log('\n--- PROJETOS ---');
    const projs = await pool.query('SELECT id, nome, unidade, responsavel FROM projetos');
    console.table(projs.rows);
    
  } catch (err) {
    console.error('Erro de Conexão ou Execução com Banco:', err.message);
  } finally {
    await pool.end();
  }
}

check();

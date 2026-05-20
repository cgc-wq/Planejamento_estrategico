const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkSolicitacoes() {
  try {
    const res = await pool.query('SELECT id, tipo, resumo, dados FROM solicitacoes ORDER BY criado_em DESC LIMIT 5');
    console.log('Ultimas 5 solicitacoes:');
    res.rows.forEach(r => {
      console.log(`ID: ${r.id}, Tipo: ${r.tipo}, Resumo: ${r.resumo}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSolicitacoes();

require('dotenv').config();
const app = require('./src/app');

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`[SERVER] API do PES 2026 rodando em http://localhost:${port}`);
});
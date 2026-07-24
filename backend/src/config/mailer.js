const nodemailer = require('nodemailer');
require('dotenv').config();

const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465, // 465 = SSL implícito; 587/25 = STARTTLS (secure: false, upgrade automático)
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

// Único ponto de verdade sobre "o envio de e-mail está configurado?" — usado
// pelo authController para decidir entre enviar de verdade ou (só em dev) logar no console.
const isEmailConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

// Remetente exibido em todo e-mail enviado pela aplicação — único ponto de
// configuração, para não espalhar "Sistema PES 2026" <noreply@...> pelo código.
const mailFromName = process.env.MAIL_FROM_NAME || 'Sistema PES 2026';
const mailFromAddress = process.env.MAIL_FROM_ADDRESS || 'noreply@cfa.org.br';
const mailFrom = `"${mailFromName}" <${mailFromAddress}>`;

if (isEmailConfigured) {
  // Verifica a conexão/credenciais assim que o servidor sobe — detecta SMTP
  // host/senha errados nos logs de inicialização, em vez de só na primeira
  // tentativa de envio (quando um usuário real já estaria esperando o e-mail).
  transporter.verify((err) => {
    if (err) {
      console.error('[MAILER] Falha ao conectar/autenticar no servidor SMTP:', err.message);
    } else {
      console.log('[MAILER] Conexão SMTP verificada com sucesso — envio de e-mail ativo.');
    }
  });
} else {
  console.warn('[MAILER] SMTP_HOST/SMTP_USER/SMTP_PASS não configurados — e-mails NÃO serão enviados de verdade.');
}

module.exports = { transporter, isEmailConfigured, mailFrom, mailFromName };

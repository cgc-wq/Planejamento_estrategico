const { mailFromName } = require('../config/mailer');

// Layout inspirado no template padrão de reset de senha (título, saudação,
// botão de ação, link alternativo em texto puro e nota de expiração) —
// mesma estrutura, com o texto adaptado ao PES 2026 e em português.
const resetPasswordEmail = (user, resetLink, expiryMinutes) => ({
  subject: 'Redefinição de Senha - Sistema PES 2026',
  html: `
  <div style="font-family: 'Sora', Arial, sans-serif; color: #141A2E; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #D6E0F0; border-radius: 14px;">
    <h2 style="color: #0B2C6E; text-align: center;">${mailFromName}</h2>
    <div style="background-color: #F5F8FF; border-radius: 10px; padding: 24px;">
      <p style="font-weight: bold;">Olá!</p>
      <p>Você está recebendo este e-mail porque recebemos uma solicitação de redefinição de senha para a sua conta.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #141A2E; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Redefinir Senha</a>
      </div>
      <p>Este link de redefinição de senha irá expirar em ${expiryMinutes} minutos.</p>
      <p>Se você não solicitou uma redefinição de senha, nenhuma ação adicional é necessária.</p>
      <p>Atenciosamente,<br>${mailFromName}</p>
      <hr style="border: 0; border-top: 1px solid #D6E0F0; margin: 20px 0;">
      <p style="font-size: 12px; color: #4A5568;">Se estiver com problemas para clicar no botão "Redefinir Senha", copie e cole a URL abaixo no seu navegador:</p>
      <p style="font-size: 11px; color: #1756B8; word-break: break-all;">${resetLink}</p>
    </div>
  </div>
`,
});

module.exports = { resetPasswordEmail };

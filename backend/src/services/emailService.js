const { transporter, isEmailConfigured, mailFrom } = require('../config/mailer');
const { resetPasswordEmail } = require('../templates/resetPasswordEmail');

// Envia o e-mail de redefinição de senha e retorna se o envio foi tentado
// (sendMail chamado) — quem chama decide o que logar, sem duplicar a decisão
// isEmailConfigured/isDev em vários lugares do controller.
const sendResetPasswordEmail = async (user, resetLink, expiryMinutes) => {
  if (!isEmailConfigured) return { sent: false };

  const { subject, html } = resetPasswordEmail(user, resetLink, expiryMinutes);
  await transporter.sendMail({ from: mailFrom, to: user.email, subject, html });
  return { sent: true };
};

module.exports = { sendResetPasswordEmail };

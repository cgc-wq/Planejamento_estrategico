// Política mínima de senha, compartilhada por cadastro, redefinição e criação
// de administrador de CRA — único ponto de verdade para não divergir entre os
// fluxos (ex: um exigindo número e outro não).
const SENHA_MIN_LENGTH = 8;

// Retorna null se a senha for válida, ou a mensagem de erro caso contrário.
const validarSenha = (senha) => {
  if (!senha || senha.length < SENHA_MIN_LENGTH) {
    return `A senha deve ter no mínimo ${SENHA_MIN_LENGTH} caracteres.`;
  }
  if (!/[a-zA-Z]/.test(senha)) {
    return 'A senha deve conter pelo menos uma letra.';
  }
  if (!/[0-9]/.test(senha)) {
    return 'A senha deve conter pelo menos um número.';
  }
  if (!/[^a-zA-Z0-9]/.test(senha)) {
    return 'A senha deve conter pelo menos um caractere especial (ex: !@#$%&*).';
  }
  return null;
};

module.exports = { validarSenha, SENHA_MIN_LENGTH };

// js/utils.js

let toastTimeout; // Variável para controlar o cronômetro do balão

export function escapeHTML(str) {
    if (!str) return '';
    return str.toString().replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])
    );
}

// Espelha a política de senha do backend (backend/src/utils/validarSenha.js)
// só para dar feedback imediato sem round-trip — o backend é quem de fato
// garante a regra, esta cópia é só conveniência de UX.
export function validarSenha(senha) {
    if (!senha || senha.length < 8) {
        return 'A senha deve ter no mínimo 8 caracteres.';
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
}

export function formatDate(d) {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length !== 3) return d;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function showToast(msg, duration = 4000) {
    const t = document.getElementById('toast');
    if (!t) return;

    if (toastTimeout) clearTimeout(toastTimeout);

    t.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:16px;">
      <span>${msg}</span>
      <button onclick="document.getElementById('toast').classList.remove('show')" style="background:none; border:none; color:inherit; font-weight:900; cursor:pointer; font-size:16px; padding:0;">✕</button>
    </div>
  `;

    t.classList.add('show');

    if (duration > 0) {
        toastTimeout = setTimeout(() => t.classList.remove('show'), duration);
    }
}

export function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step = Math.max(1, Math.floor(target / 20));
    const interval = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current;
        if (current >= target) clearInterval(interval);
    }, 50);
}
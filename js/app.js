console.log("INICIO DO APP.JS");
import { state } from './data.js';
import * as utils from './utils.js';
import * as router from './router.js';
import * as api from './api.js';
import * as dashboard from './dashboard.js';
import * as acoes from './acoes.js';
import * as views from './views.js';

// ==========================================
// PONTE DE COMUNICAÇÃO (MODULAR -> HTML)
// ==========================================
window.state = state;

// 1. Utilidades e Rotas
window.escapeHTML = utils.escapeHTML;
window.formatDate = utils.formatDate;
window.showToast = utils.showToast;
window.animateCounter = utils.animateCounter;
window.showPage = router.showPage;
window.showTab = router.showTab;

// 2. Autenticação e Banco de Dados (API)
window.fazerLogin = api.fazerLogin;
window.fazerLogout = api.fazerLogout;
window.carregarAcoesFirebase = api.carregarAcoesFirebase;
window.carregarTodasAcoesFirebase = api.carregarTodasAcoesFirebase;
window.carregarObjetivosFirebase = api.carregarObjetivosFirebase;
window.salvarObjetivoEstrategico = api.salvarObjetivoEstrategico;
window.salvarNoFirestore = api.salvarNoFirestore;
window.atualizarInlineFirestore = api.atualizarInlineFirestore;
window.excluirNoFirestore = api.excluirNoFirestore;
window.carregarSolicitacoesAdmin = api.carregarSolicitacoesAdmin;
window.aprovarSolicitacao = api.aprovarSolicitacao;
window.rejeitarSolicitacao = api.rejeitarSolicitacao;

// 3. Gestão de Projetos e Atividades
window.toggleTipoCampos = acoes.toggleTipoCampos;
window.toggleIndicadorCampos = acoes.toggleIndicadorCampos;
window.openModal = acoes.openModal;
window.closeModal = acoes.closeModal;
window.closeModalOutside = acoes.closeModalOutside;
window.updateObjetivos = acoes.updateObjetivos;
window.recalcularExecucao = acoes.recalcularExecucao;
window.salvarAcao = acoes.salvarAcao;
window.excluirAcao = acoes.excluirAcao;
window.confirmarExclusao = acoes.confirmarExclusao;
window.renderAcoes = acoes.renderAcoes;
window.toggleCard = acoes.toggleCard;
window.updateIndicadorInteligente = acoes.updateIndicadorInteligente;
window.updateStatusOnly = acoes.updateStatusOnly;
window.adicionarAcaoInline = acoes.adicionarAcaoInline;
window.toggleSubAcaoInline = acoes.toggleSubAcaoInline;
window.removerSubAcaoInline = acoes.removerSubAcaoInline;
window.triggerEntregaUpload = acoes.triggerEntregaUpload;
window.handleFileUpload = api.handleFileUpload; // Vincula ao api.js refatorado
window.triggerFileUpload = acoes.triggerFileUpload;
window.removerAnexo = acoes.removerAnexo;

// 4. Telas e Gráficos (Views & Dashboard)
window.renderObjetivosEstrategicos = views.renderObjetivosEstrategicos;
window.renderMapa = views.renderMapa;
window.renderIndicadores = views.renderIndicadores;
window.renderSWOT = views.renderSWOT;
window.renderRelatorio = views.renderRelatorio;
window.updateDashboard = dashboard.updateDashboard;
window.renderCharts = dashboard.renderCharts;
window.fazerCadastro = api.fazerCadastro;

window.toggleAuthScreens = function () {
    const loginView = document.getElementById('form-login-view');
    const regView = document.getElementById('form-register-view');

    if (loginView && regView) {
        if (loginView.style.display === 'none') {
            loginView.style.display = 'block';
            regView.style.display = 'none';
        } else {
            loginView.style.display = 'none';
            regView.style.display = 'block';
        }
    }
};
window.carregarUsuariosFirebase = api.carregarUsuariosFirebase;
window.atualizarStatusUsuario = api.atualizarStatusUsuario;
window.toggleSetorCFA = function () {
    const entidade = document.getElementById('reg-entidade').value;
    const setorBox = document.getElementById('box-setor-cfa');
    if (setorBox) {
        if (entidade === 'CFA') {
            setorBox.style.display = 'block';
        } else {
            setorBox.style.display = 'none';
            document.getElementById('reg-setor').value = '';
        }
    }
};
window.renderAdminUsers = async function () {
    const content = document.getElementById('admin-users-content');
    if (!content) return;

    content.innerHTML = '<p style="color:var(--texto-sec); font-size: 13px;">Buscando usuários...</p>';
    const usuarios = await api.carregarUsuariosFirebase();

    if (usuarios.length === 0) {
        content.innerHTML = '<p style="color:var(--texto-sec); font-size: 13px;">Nenhum usuário cadastrado ainda.</p>';
        return;
    }

    usuarios.sort((a, b) => {
        if (a.status === 'pendente' && b.status !== 'pendente') return -1;
        if (a.status !== 'pendente' && b.status === 'pendente') return 1;
        return 0;
    });

    let html = `<table style="width:100%; text-align:left; border-collapse: collapse; font-size:12px;">
    <thead>
      <tr style="border-bottom: 2px solid var(--cinza-borda); color: var(--texto-sec);">
        <th style="padding:12px 8px;">Nome / E-mail</th>
        <th style="padding:12px 8px;">Entidade / Setor</th>
        <th style="padding:12px 8px;">Data Cadastro</th>
        <th style="padding:12px 8px;">Status</th>
        <th style="padding:12px 8px;">Ações</th>
      </tr>
    </thead>
    <tbody>`;

    usuarios.forEach(u => {
        const statusColor = u.status === 'aprovado' ? 'color:var(--verde);' : (u.status === 'pendente' ? 'color:#E65100; background:#FFF3E0; padding:2px 6px; border-radius:4px;' : 'color:var(--vermelho);');
        const dataFormatada = u.created_at ? window.formatDate(u.created_at.split('T')[0]) : '---';

        html += `<tr style="border-bottom: 1px solid var(--cinza-borda);">
      <td style="padding:12px 8px;">
        <strong style="color:var(--azul-cfa); font-size:13px;">${window.escapeHTML(u.nome)}</strong><br>
        <span style="color:var(--texto-sec);">${window.escapeHTML(u.email)}</span>
      </td>
      <td style="padding:12px 8px;">
        <strong>${window.escapeHTML(u.entidade)}</strong>
        ${u.setor ? '<br><span style="color:var(--texto-sec);">' + window.escapeHTML(u.setor) + '</span>' : ''}
      </td>
      <td style="padding:12px 8px;">${dataFormatada}</td>
      <td style="padding:12px 8px; font-weight:800; text-transform:uppercase;"><span style="${statusColor}">${u.status}</span></td>
      <td style="padding:12px 8px;">
        ${u.status !== 'aprovado' ? `<button class="btn btn-primary btn-sm" style="margin-right:4px;" onclick="window.atualizarStatusUsuario('${u.id}', 'aprovado')">Aprovar</button>` : ''}
        ${u.status !== 'bloqueado' ? `<button class="btn btn-danger btn-sm" onclick="window.atualizarStatusUsuario('${u.id}', 'bloqueado')">Bloquear</button>` : ''}
      </td>
    </tr>`;
    });

    html += `</tbody></table>`;
    content.innerHTML = html;
};

window.renderAdminSolicitacoes = async function () {
    const content = document.getElementById('lista-solicitacoes');
    if (!content) return;

    content.innerHTML = '<p style="color:var(--texto-sec); font-size: 13px;">Buscando solicitações...</p>';
    const solicitacoes = await api.carregarSolicitacoesAdmin();

    if (solicitacoes.length === 0) {
        content.innerHTML = '<div style="text-align:center; padding:20px; color:var(--texto-sec); font-size: 13px;">✅ Nenhuma solicitação de alteração pendente.</div>';
        return;
    }

    let html = `<div style="display:flex; flex-direction:column; gap:16px;">`;

    solicitacoes.forEach(s => {
        const d = s.dados;
        const corTipo = s.tipo === 'CRIACAO' ? '#1BA05B' : (s.tipo === 'EDICAO' ? '#E8A020' : '#C0392B');
        const labelsTipo = { 'CRIACAO': 'NOVO PROJETO', 'EDICAO': 'EDIÇÃO', 'EXCLUSAO': 'EXCLUSÃO' };

        html += `
        <div class="card" style="border-left: 5px solid ${corTipo}; padding:16px; background:#f9f9f9;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <div>
              <span style="font-size:10px; font-weight:800; background:${corTipo}; color:white; padding:2px 6px; border-radius:4px; text-transform:uppercase; margin-bottom:6px; display:inline-block;">${labelsTipo[s.tipo]}</span>
              <div style="font-size:14px; font-weight:800; color:var(--texto);">${window.escapeHTML(d.nome || s.projeto_nome_original || 'Projeto sem nome')}</div>
              <div style="font-size:11px; color:var(--texto-sec);">Solicitado por: <strong>${window.escapeHTML(s.usuario_nome)}</strong> em ${window.formatDate(s.criado_em.split('T')[0])}</div>
            </div>
            <div style="display:flex; gap:8px;">
               <button class="btn btn-primary btn-sm" onclick="window.aprovarSolicitacao('${s.id}')">Aprovar</button>
               <button class="btn btn-danger btn-sm" onclick="window.rejeitarSolicitacao('${s.id}')">Rejeitar</button>
            </div>
          </div>
          ${s.tipo === 'EDICAO' ? `<div style="font-size:11px; color:var(--azul-mid); background:white; padding:8px; border-radius:6px; border:1px dashed var(--cinza-borda);"><strong>Resumo da Alteração:</strong><br>${s.resumo || 'Alteração de dados do projeto.'}</div>` : ''}
          ${s.tipo === 'EXCLUSAO' ? `<div style="font-size:11px; color:var(--vermelho); background:#FFF5F5; padding:8px; border-radius:6px; border:1px dashed var(--vermelho);"><strong>Motivo da Exclusão:</strong><br>${s.resumo || 'Sem justificativa fornecida.'}</div>` : ''}
        </div>`;
    });

    html += `</div>`;
    content.innerHTML = html;
};

// ==========================================
// INICIALIZAÇÃO DO SISTEMA (Substitui Firebase onAuthStateChanged)
// ==========================================
window.addEventListener('auth-changed', async (e) => {
    const user = e.detail;

    if (user) {
        state.currentUser = user;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('user-email-display').textContent = `${user.nome} (${user.grupo})`;
        
        window.showToast('✅ Acesso liberado!');

        // Carrega os dados do backend PostgreSQL
        api.carregarAcoesFirebase(user.grupo);
        api.carregarTodasAcoesFirebase();
        api.carregarObjetivosFirebase();

        const navAdmin = document.getElementById('nav-admin');
        if (user.email === 'cgc@cfa.org.br') {
            if (navAdmin) navAdmin.style.display = 'flex';
            window.renderAdminUsers();
        } else {
            if (navAdmin) navAdmin.style.display = 'none';
        }
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('user-email-display').textContent = '...';
        
        state.acoes = [];
        state.todasAcoes = [];
        state.objetivosGlobais = {};
        state.currentUser = null;
    }
});

// Ações quando a página HTML carrega
document.addEventListener('DOMContentLoaded', () => {
    views.renderMapa();
    views.renderSWOT();
    document.getElementById('m-perspectiva').addEventListener('change', acoes.updateObjetivos);

    // Verifica se já existe um token salvo para auto-login
    const savedUser = localStorage.getItem('pes_user');
    const savedToken = localStorage.getItem('pes_token');
    
    if (savedUser && savedToken) {
        // Dispara o evento de autenticação se houver dados salvos
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: JSON.parse(savedUser) }));
    } else {
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
    }
});
console.log("FIM APP.JS");
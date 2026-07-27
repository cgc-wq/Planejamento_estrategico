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
window.toggleObjIndicadorCampos = views.toggleObjIndicadorCampos;
window.carregarResultadosObjetivo = api.carregarResultadosObjetivo;
window.handleResultadoEvidenciaUpload = api.handleResultadoEvidenciaUpload;
window.salvarResultadoObjetivo = api.salvarResultadoObjetivo;
window.salvarNoFirestore = api.salvarNoFirestore;
window.atualizarInlineFirestore = api.atualizarInlineFirestore;
window.solicitarAlteracaoResultado = api.solicitarAlteracaoResultado;
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
window.handleModalAnexoUpload = api.handleModalAnexoUpload;
window.triggerFileUpload = acoes.triggerFileUpload;
window.removerAnexo = acoes.removerAnexo;
window.removerAnexoModal = acoes.removerAnexoModal;

// 4. Telas e Gráficos (Views & Dashboard)
window.renderObjetivosEstrategicos = views.renderObjetivosEstrategicos;
window.renderMapa = views.renderMapa;
window.renderIndicadores = views.renderIndicadores;
window.renderSWOT = views.renderSWOT;
window.renderRelatorio = views.renderRelatorio;
window.updateDashboard = dashboard.updateDashboard;
window.renderCharts = dashboard.renderCharts;
window.setObjetivosView = dashboard.setObjetivosView;
window.filtrarObjetivosPorPerspectiva = dashboard.filtrarObjetivosPorPerspectiva;
window.fazerCadastro = api.fazerCadastro;

// 5. Edição de Nomes (Perspectivas/Objetivos)
window.salvarNomeCustom = api.salvarNomeCustom;
window.carregarNomesCustom = api.carregarNomesCustom;

// 6. Gerenciamento de Itens SWOT
window.carregarItensSwot = api.carregarItensSwot;
window.salvarItemSwot = api.salvarItemSwot;
window.adicionarItemSwot = api.adicionarItemSwot;
window.deletarItemSwot = api.deletarItemSwot;
window.carregarNomesCustom = api.carregarNomesCustom;

// Função para iniciar a edição inline de um nome
window.iniciarEdicaoNome = function(chave, nomeAtual, btnElement) {
    const parentDiv = btnElement.parentElement;
    const labelSpan = parentDiv.querySelector('span');
    if (!labelSpan) return;

    // Determina se é perspectiva ou objetivo pelo prefixo
    const isPersp = chave.startsWith('persp_');
    const id = isPersp ? chave.replace('persp_', '') : chave.replace('obj_', '');

    // Substitui o conteúdo por um campo de edição
    parentDiv.innerHTML = `
        <div class="edit-nome-inline" style="display:flex; align-items:center; gap:8px; flex:1;">
            ${isPersp ? '' : `<span style="font-weight:700; font-size:13px; flex-shrink:0;">${id} —</span>`}
            <input type="text" id="edit-input-${chave}" value="${nomeAtual}" 
                   class="input-edit-nome" 
                   style="flex:1; padding:6px 10px; border:2px solid var(--azul-cfa); border-radius:8px; font-family:'Sora',sans-serif; font-size:${isPersp ? '14px' : '12px'}; font-weight:${isPersp ? '800' : '600'}; outline:none; transition: border-color 0.2s;"
                   onkeydown="if(event.key==='Enter') window.salvarEdicaoNome('${chave}'); if(event.key==='Escape') window.cancelarEdicaoNome();">
            <button class="btn btn-primary btn-sm" style="font-size:11px; padding:4px 10px;" onclick="window.salvarEdicaoNome('${chave}')">✓</button>
            <button class="btn btn-sm" style="font-size:11px; padding:4px 10px; background:#f0f0f0; border:1px solid var(--cinza-borda); border-radius:6px; cursor:pointer;" onclick="window.cancelarEdicaoNome()">✕</button>
        </div>
    `;

    // Foca no input
    const input = document.getElementById(`edit-input-${chave}`);
    if (input) {
        input.focus();
        input.select();
    }
};

// Salvar a edição do nome
window.salvarEdicaoNome = async function(chave) {
    const input = document.getElementById(`edit-input-${chave}`);
    if (!input) return;

    const novoNome = input.value.trim();
    if (!novoNome) {
        window.showToast('⚠️ O nome não pode ficar vazio.');
        return;
    }

    await window.salvarNomeCustom(chave, novoNome);
};

// Cancelar a edição e re-renderizar
window.cancelarEdicaoNome = function() {
    // Simplesmente re-renderiza a tela de objetivos
    if (window.renderObjetivosEstrategicos) window.renderObjetivosEstrategicos();
};

// ==========================================
// EDIÇÃO DE ITENS SWOT
// ==========================================

window.iniciarEdicaoSwot = function(tipoSwot, itemId) {
    const textDiv = document.getElementById(`swot-text-${tipoSwot}-${itemId}`);
    const editDiv = document.getElementById(`swot-edit-${tipoSwot}-${itemId}`);
    
    if (textDiv && editDiv) {
        textDiv.style.display = 'none';
        editDiv.style.display = 'flex';
        
        const input = document.getElementById(`swot-input-${tipoSwot}-${itemId}`);
        if (input) {
            input.focus();
            input.select();
        }
    }
};

window.cancelarEdicaoSwot = function(tipoSwot, itemId) {
    const textDiv = document.getElementById(`swot-text-${tipoSwot}-${itemId}`);
    const editDiv = document.getElementById(`swot-edit-${tipoSwot}-${itemId}`);
    
    if (textDiv && editDiv) {
        textDiv.style.display = 'block';
        editDiv.style.display = 'none';
    }
};

window.salvarItemSwotInline = async function(tipoSwot, itemId) {
    const input = document.getElementById(`swot-input-${tipoSwot}-${itemId}`);
    if (!input) return;
    
    const novoTexto = input.value.trim();
    if (!novoTexto) {
        window.showToast('⚠️ O item não pode ficar vazio.');
        return;
    }
    
    await window.salvarItemSwot(tipoSwot, itemId, novoTexto);
};

window.removerItemSwot = async function(tipoSwot, itemId) {
    if (confirm('Tem certeza que deseja remover este item?')) {
        await window.deletarItemSwot(tipoSwot, itemId);
    }
};

window.abrirModalSwot = function(tipoSwot = 'forcas') {
    const overlay = document.getElementById('modal-swot-overlay');
    const select = document.getElementById('swot-modal-tipo');
    const textarea = document.getElementById('swot-modal-descricao');

    if (!overlay || !select || !textarea) return;

    select.value = tipoSwot;
    textarea.value = '';
    overlay.classList.add('open');

    setTimeout(() => {
        textarea.focus();
    }, 50);
};

window.fecharModalSwot = function() {
    const overlay = document.getElementById('modal-swot-overlay');
    if (overlay) overlay.classList.remove('open');
};

window.abrirModalResultado = function(objId, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }

    const overlay = document.getElementById('modal-resultado-overlay');
    const valor = document.getElementById('resultado-modal-valor');
    const dataInput = document.getElementById('resultado-modal-data');
    const qualiInput = document.getElementById('resultado-modal-quali');
    const observacao = document.getElementById('resultado-modal-observacao');
    const preview = document.getElementById('resultado-anexo-preview');
    const uploadArea = document.getElementById('resultado-anexo-upload-area');
    const status = document.getElementById('resultado-anexo-status');
    const titulo = document.getElementById('resultado-modal-titulo');
    const boxNumerico = document.getElementById('box-resultado-numerico');
    const boxData = document.getElementById('box-resultado-data');
    const boxQuali = document.getElementById('box-resultado-quali');

    if (!overlay) return;

    state.resultadoModalObjId = objId;
    state.resultadoModalArquivo = null;

    // O formulário se adapta ao Tipo de Indicador que o Admin configurou
    // para esse objetivo (numerico | data | qualitativo).
    const tipo = (state.objetivosGlobais[objId] && state.objetivosGlobais[objId].indicador_tipo) || 'numerico';
    state.resultadoModalTipo = tipo;

    if (boxNumerico) boxNumerico.style.display = tipo === 'numerico' ? 'block' : 'none';
    if (boxData) boxData.style.display = tipo === 'data' ? 'block' : 'none';
    if (boxQuali) boxQuali.style.display = tipo === 'qualitativo' ? 'block' : 'none';

    if (titulo) titulo.textContent = `Adicionar resultado — ${objId}`;
    if (valor) valor.value = '';
    if (dataInput) dataInput.value = '';
    if (qualiInput) qualiInput.value = '';
    if (observacao) observacao.value = '';
    if (preview) preview.style.display = 'none';
    if (uploadArea) uploadArea.style.display = 'flex';
    if (status) status.textContent = 'Nenhum arquivo selecionado';

    overlay.classList.add('open');
};

window.fecharModalResultado = function(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }

    const overlay = document.getElementById('modal-resultado-overlay');
    if (overlay) overlay.classList.remove('open');
    state.resultadoModalObjId = null;
    state.resultadoModalArquivo = null;
};

window.salvarNovoItemSwot = async function() {
    const select = document.getElementById('swot-modal-tipo');
    const textarea = document.getElementById('swot-modal-descricao');

    if (!select || !textarea) return;

    const tipo = select.value;
    const descricao = textarea.value.trim();

    if (!descricao) {
        window.showToast('⚠️ Escreva a descrição do novo item.');
        return;
    }

    await window.adicionarItemSwot(tipo, descricao);
    window.fecharModalSwot();
};

window.toggleAuthScreens = function () {
    const loginView = document.getElementById('form-login-view');
    const regView = document.getElementById('form-register-view');
    const recoverView = document.getElementById('form-recover-view');
    const resetView = document.getElementById('form-reset-password-view');

    if (loginView && regView) {
        if (loginView.style.display === 'none') {
            loginView.style.display = 'block';
            regView.style.display = 'none';
            if (recoverView) recoverView.style.display = 'none';
            if (resetView) resetView.style.display = 'none';
        } else {
            loginView.style.display = 'none';
            regView.style.display = 'block';
            if (recoverView) recoverView.style.display = 'none';
            if (resetView) resetView.style.display = 'none';
        }
    }
};

window.recuperarSenha = function () {
    const loginView = document.getElementById('form-login-view');
    const regView = document.getElementById('form-register-view');
    const recoverView = document.getElementById('form-recover-view');
    const resetView = document.getElementById('form-reset-password-view');

    if (loginView) loginView.style.display = 'none';
    if (regView) regView.style.display = 'none';
    if (recoverView) recoverView.style.display = 'block';
    if (resetView) resetView.style.display = 'none';
};

window.voltarParaLogin = function () {
    const loginView = document.getElementById('form-login-view');
    const regView = document.getElementById('form-register-view');
    const recoverView = document.getElementById('form-recover-view');
    const resetView = document.getElementById('form-reset-password-view');

    // Se estiver redefinindo senha e voltar para o login, limpamos o token da URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('token')) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (loginView) loginView.style.display = 'block';
    if (regView) regView.style.display = 'none';
    if (recoverView) recoverView.style.display = 'none';
    if (resetView) resetView.style.display = 'none';
};

window.enviarEmailRecuperacao = async function () {
    const emailInput = document.getElementById('recover-email');
    const email = emailInput ? emailInput.value.trim() : '';
    const btn = document.getElementById('btn-recover');

    if (!email) {
        window.showToast('⚠️ Por favor, insira o e-mail.');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Enviando...';
    }

    try {
        const success = await api.solicitarResetSenha(email);
        if (success) {
            if (emailInput) emailInput.value = '';
            window.voltarParaLogin();
        }
    } catch (err) {
        window.showToast('❌ Erro inesperado ao solicitar recuperação.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Enviar Link';
        }
    }
};

window.redefinirNovaSenha = async function () {
    const senha = document.getElementById('reset-senha').value;
    const senhaConfirm = document.getElementById('reset-senha-confirm').value;
    const btn = document.getElementById('btn-reset-password');

    if (!senha || !senhaConfirm) {
        window.showToast('⚠️ Por favor, preencha todos os campos.');
        return;
    }

    if (senha !== senhaConfirm) {
        window.showToast('⚠️ As senhas não são iguais.');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        window.showToast('❌ Token de redefinição não encontrado.');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Alterando...';
    }

    try {
        const success = await api.redefinirSenha(token, senha);
        if (success) {
            document.getElementById('reset-senha').value = '';
            document.getElementById('reset-senha-confirm').value = '';
            window.voltarParaLogin();
        }
    } catch (err) {
        window.showToast('❌ Erro ao redefinir a senha.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Salvar Nova Senha';
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
window.toggleSetorIndicadores = function () {
    const entidade = document.getElementById('filtro-entidade-indicadores').value;
    const setorBox = document.getElementById('box-setor-indicadores');
    if (setorBox) {
        if (entidade === 'CFA') {
            setorBox.style.display = 'flex';
        } else {
            setorBox.style.display = 'none';
            document.getElementById('filtro-setor-indicadores').value = '';
        }
    }
};
window.toggleSetorAcoes = function () {
    const entidade = document.getElementById('filtro-entidade-acoes').value;
    const setorBox = document.getElementById('box-setor-acoes');
    if (setorBox) {
        if (entidade === 'CFA') {
            setorBox.style.display = 'flex';
        } else {
            setorBox.style.display = 'none';
            document.getElementById('filtro-setor-acoes').value = '';
        }
    }
};
window.abrirModalCraAdmin = function () {
    const overlay = document.getElementById('modal-cra-admin-overlay');
    if (overlay) {
        overlay.classList.add('open');
        setTimeout(() => document.getElementById('cra-admin-nome')?.focus(), 50);
    }
};

window.fecharModalCraAdmin = function () {
    const overlay = document.getElementById('modal-cra-admin-overlay');
    if (overlay) overlay.classList.remove('open');
};

window.salvarCraAdmin = async function () {
    const dados = {
        nome: document.getElementById('cra-admin-nome').value.trim(),
        email: document.getElementById('cra-admin-email').value.trim(),
        senha: document.getElementById('cra-admin-senha').value,
        entidade: document.getElementById('cra-admin-entidade').value
    };

    if (!dados.nome || !dados.email || !dados.senha || !dados.entidade) {
        window.showToast('⚠️ Preencha todos os campos do administrador do CRA.');
        return;
    }

    const ok = await api.criarCraAdmin(dados);
    if (ok) {
        window.fecharModalCraAdmin();
        document.getElementById('cra-admin-nome').value = '';
        document.getElementById('cra-admin-email').value = '';
        document.getElementById('cra-admin-senha').value = '';
        document.getElementById('cra-admin-entidade').value = '';
    }
};

window.renderAdminUsers = async function () {
    const content = document.getElementById('admin-users-content');
    if (!content) return;

    content.innerHTML = '<p style="color:var(--texto-sec); font-size: 13px;">Buscando usuários...</p>';
    const usuarios = await api.carregarUsuariosFirebase();
    const isGlobalAdmin = state.currentUser && state.currentUser.email === 'cgc@cfa.org.br';
    const isCraAdmin = state.currentUser && state.currentUser.role === 'cra_admin';
    const usuariosVisiveis = isCraAdmin
        ? usuarios.filter(u => ['pendente', 'bloqueado'].includes(u.status))
        : usuarios;

    if (usuariosVisiveis.length === 0) {
        content.innerHTML = '<p style="color:var(--texto-sec); font-size: 13px;">Nenhum usuário pendente ou bloqueado para análise.</p>';
        return;
    }

    usuariosVisiveis.sort((a, b) => {
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

    usuariosVisiveis.forEach(u => {
        const statusColor = u.status === 'aprovado' ? 'color:var(--verde);' : (u.status === 'pendente' ? 'color:#E65100; background:#FFF3E0; padding:2px 6px; border-radius:4px;' : 'color:var(--vermelho);');
        const dataFormatada = u.created_at ? window.formatDate(u.created_at.split('T')[0]) : '---';
        const isTargetCraAdmin = u.role === 'cra_admin';
        const canManage = isGlobalAdmin || (!isTargetCraAdmin && u.entidade === (state.currentUser && state.currentUser.cra_admin_scope));

        html += `<tr style="border-bottom: 1px solid var(--cinza-borda);">
      <td style="padding:12px 8px;">
        <strong style="color:var(--azul-cfa); font-size:13px;">${window.escapeHTML(u.nome)}</strong><br>
        <span style="color:var(--texto-sec);">${window.escapeHTML(u.email)}</span>
      </td>
      <td style="padding:12px 8px;">
        <strong>${window.escapeHTML(u.entidade || '-')}</strong>
        ${u.setor ? '<br><span style="color:var(--texto-sec);">' + window.escapeHTML(u.setor) + '</span>' : ''}
      </td>
      <td style="padding:12px 8px;">${dataFormatada}</td>
      <td style="padding:12px 8px; font-weight:800; text-transform:uppercase;"><span style="${statusColor}">${u.status}</span></td>
      <td style="padding:12px 8px;">
        ${canManage && u.status !== 'aprovado' ? `<button class="btn btn-primary btn-sm" style="margin-right:4px;" onclick="window.atualizarStatusUsuario('${u.id}', 'aprovado')">Aprovar</button>` : ''}
        ${canManage && u.status !== 'bloqueado' ? `<button class="btn btn-danger btn-sm" onclick="window.atualizarStatusUsuario('${u.id}', 'bloqueado')">Bloquear</button>` : ''}
      </td>
    </tr>`;
    });

    html += `</tbody></table>`;
    if (isGlobalAdmin) {
        html += `<div style="margin-top:16px;"><button class="btn btn-primary btn-sm" onclick="window.abrirModalCraAdmin()">+ Criar administrador de CRA</button></div>`;
    }
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

        // Monta texto de exibição do usuário logado
        let displayGrupo = user.grupo;
        if (user.role === 'cra_admin' && user.cra_admin_scope) {
            displayGrupo = `Administrador ${user.cra_admin_scope}`;
        }
        document.getElementById('user-email-display').textContent = `${user.nome} (${displayGrupo})`;
        
        window.showToast('✅ Acesso liberado!');

        // Carrega os dados do backend PostgreSQL
        api.carregarAcoesFirebase(user.grupo);
        api.carregarTodasAcoesFirebase();
        api.carregarObjetivosFirebase();
        api.carregarResultadosObjetivo();
        api.carregarNomesCustom();
        api.carregarItensSwot();

        const navAdmin = document.getElementById('nav-admin');
        const navIndicadores = document.getElementById('nav-indicadores');
        const adminFiltrosAcoes = document.getElementById('admin-filtros-acoes');
        
        const isMasterAdmin = user.email === 'cgc@cfa.org.br';
        const isAdminRole = isMasterAdmin || user.role === 'cra_admin';
        
        if (navIndicadores) {
            navIndicadores.style.display = isMasterAdmin ? 'flex' : 'none';
        }

        if (adminFiltrosAcoes) {
            adminFiltrosAcoes.style.display = (isMasterAdmin || user.grupo === 'ADMIN') ? 'flex' : 'none';
        }

        const solicitacoesSection = document.getElementById('solicitacoes-admin-section');
        if (solicitacoesSection) {
            solicitacoesSection.style.display = user.role === 'cra_admin' ? 'none' : 'block';
        }
        if (isAdminRole) {
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

    // Verifica se há token de redefinição de senha na URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        // Limpa sessão anterior se houver, pois estamos em fluxo de redefinição
        localStorage.removeItem('pes_user');
        localStorage.removeItem('pes_token');
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));

        // Oculta tela de login e exibe a de redefinição
        const loginView = document.getElementById('form-login-view');
        const resetView = document.getElementById('form-reset-password-view');
        if (loginView) loginView.style.display = 'none';
        if (resetView) resetView.style.display = 'block';
    } else {
        // Verifica se já existe um token salvo para auto-login
        const savedUser = localStorage.getItem('pes_user');
        const savedToken = localStorage.getItem('pes_token');
        
        if (savedUser && savedToken) {
            // Dispara o evento de autenticação se houver dados salvos
            window.dispatchEvent(new CustomEvent('auth-changed', { detail: JSON.parse(savedUser) }));
        } else {
            window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
        }
    }
});
console.log("FIM APP.JS");
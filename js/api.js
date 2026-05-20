// js/api.js
import { state } from './data.js';
import { showToast } from './utils.js';

const API_URL = 'http://localhost:3000/api';

// Auxiliar para pegar o token
const getAuthHeaders = () => {
    const token = localStorage.getItem('pes_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export async function fazerLogin() {
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;
    const btn = document.getElementById('btn-login');

    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || 'Erro ao fazer login');

        localStorage.setItem('pes_token', data.token);
        localStorage.setItem('pes_user', JSON.stringify(data.user));
        
        // Simula o comportamento do Firebase Auth para o app.js
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: data.user }));

    } catch (error) {
        showToast(`❌ ${error.message}`);
        btn.disabled = false;
        btn.textContent = 'Entrar';
    }
}

export async function fazerLogout() {
    localStorage.removeItem('pes_token');
    localStorage.removeItem('pes_user');
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
}

export async function carregarAcoesFirebase(grupoAcesso) {
    try {
        const res = await fetch(`${API_URL}/projetos`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();
        
        state.acoes = data.map(p => ({
            ...p,
            id: p.id.toString(),
            objetivo: p.objetivo_id,
            prazo: p.prazo ? p.prazo.split('T')[0] : '',
            meta: p.meta_num ? Number(p.meta_num) : 0,
            resultado: p.res_num ? Number(p.res_num) : 0,
            meta_data: p.meta_data ? p.meta_data.split('T')[0] : '',
            resultado_data: p.res_data ? p.res_data.split('T')[0] : '',
            meta_quali: p.meta_quali,
            progresso_quali: p.res_quali,
            indicador: p.indicador_nome
        }));

        if (window.renderAcoes) window.renderAcoes();
        if (window.updateDashboard) window.updateDashboard();
    } catch (e) {
        showToast('❌ Erro ao buscar projetos.');
    }
}

export async function carregarTodasAcoesFirebase() {
    try {
        const res = await fetch(`${API_URL}/projetos/todos`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();
        state.todasAcoes = data.map(p => ({
            ...p,
            id: p.id.toString(),
            objetivo: p.objetivo_id,
            prazo: p.prazo ? p.prazo.split('T')[0] : '',
            meta: p.meta_num ? Number(p.meta_num) : 0,
            resultado: p.res_num ? Number(p.res_num) : 0,
            meta_data: p.meta_data ? p.meta_data.split('T')[0] : '',
            resultado_data: p.res_data ? p.res_data.split('T')[0] : '',
            meta_quali: p.meta_quali,
            progresso_quali: p.res_quali,
            indicador: p.indicador_nome
        }));
        if (window.renderIndicadores) window.renderIndicadores();
        if (window.renderSWOT) window.renderSWOT();
    } catch (e) {
        console.error(e);
    }
}

export async function carregarObjetivosFirebase() {
    try {
        const res = await fetch(`${API_URL}/objetivos`, {
            headers: getAuthHeaders()
        });
        state.objetivosGlobais = await res.json();
        const pageObj = document.getElementById('page-objetivos');
        if (pageObj && pageObj.classList.contains('active')) {
            if (window.renderObjetivosEstrategicos) window.renderObjetivosEstrategicos();
        }
    } catch (e) {
        console.error(e);
    }
}

export async function salvarObjetivoEstrategico(id) {
    const btn = document.getElementById(`btn-salvar-obj-${id}`);
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    const indicador = document.getElementById(`obj-ind-${id}`).value.trim();
    const meta = parseFloat(document.getElementById(`obj-meta-${id}`).value) || 0;
    const resultado = parseFloat(document.getElementById(`obj-res-${id}`).value) || 0;

    try {
        const res = await fetch(`${API_URL}/objetivos/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ indicador, meta, resultado })
        });
        if (!res.ok) throw new Error();
        showToast(`✅ Objetivo ${id} atualizado!`);
        carregarObjetivosFirebase();
    } catch (e) {
        showToast('❌ Erro ao salvar objetivo');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Salvar Atualização'; }
    }
}

export async function salvarNoFirestore(acaoData, idEditando) {
    const btn = document.getElementById('btn-salvar-modal');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    try {
        const method = idEditando ? 'PUT' : 'POST';
        const url = idEditando ? `${API_URL}/projetos/${idEditando}` : `${API_URL}/projetos`;

        const res = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify(acaoData)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erro ao salvar');

        if (res.status === 202) {
            showToast('⏳ Solicitação enviada! Aguarde a aprovação do Administrador.');
        } else {
            showToast('✅ Salvo com sucesso!');
        }
        
        carregarAcoesFirebase(state.currentUser.grupo);
        carregarTodasAcoesFirebase();
        if (window.closeModal) window.closeModal();
    } catch (e) {
        showToast('❌ ' + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar Dados';
    }
}

export async function atualizarInlineFirestore(acaoData) {
    try {
        const res = await fetch(`${API_URL}/projetos/${acaoData.id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(acaoData)
        });
        if (!res.ok) throw new Error();

        if (res.status === 202) {
            showToast('⏳ Alteração enviada para aprovação.');
        } else {
            showToast('✅ Atualizado.');
        }

        carregarAcoesFirebase(state.currentUser.grupo);
        carregarTodasAcoesFirebase();
    } catch (e) {
        showToast('❌ Erro ao atualizar');
    }
}

export async function excluirNoFirestore(id, justificativa = null) {
    try {
        const res = await fetch(`${API_URL}/projetos/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            body: justificativa ? JSON.stringify({ justificativa }) : null
        });
        if (!res.ok) throw new Error();

        if (res.status === 202) {
            showToast('⏳ Pedido de exclusão enviado para o Admin.');
        } else {
            showToast('🗑️ Registro removido.');
        }

        carregarAcoesFirebase(state.currentUser.grupo);
        carregarTodasAcoesFirebase();
        if (window.closeModal) window.closeModal();
    } catch (e) {
        showToast('❌ Erro ao excluir');
    }
}

export async function fazerCadastro() {
    const nome = document.getElementById('reg-nome').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const senha = document.getElementById('reg-senha').value;
    const entidade = document.getElementById('reg-entidade').value;
    const setor = document.getElementById('reg-setor').value;

    if (!nome || !email || !senha || !entidade) {
        showToast('⚠️ Preencha todos os campos obrigatórios.');
        return;
    }

    const btn = document.getElementById('btn-cadastrar');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha, entidade, setor })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        showToast('✅ Cadastro enviado! Aguarde a liberação do Administrador.');
        window.toggleAuthScreens();
    } catch (error) {
        showToast(`❌ ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar Solicitação';
    }
}

export async function carregarUsuariosFirebase() {
    try {
        const res = await fetch(`${API_URL}/admin/usuarios`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error();
        return await res.json();
    } catch (e) {
        showToast('❌ Erro ao carregar usuários');
        return [];
    }
}

export async function atualizarStatusUsuario(uid, novoStatus) {
    try {
        const res = await fetch(`${API_URL}/admin/usuarios/${uid}/status`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: novoStatus })
        });
        if (!res.ok) throw new Error();
        showToast(`✅ Usuário atualizado!`);
        if (window.renderAdminUsers) window.renderAdminUsers();
    } catch (e) {
        showToast('❌ Erro ao atualizar usuário');
    }
}

// Implementação de Upload (Multer no Backend)
export async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const projId = state.uploadProjId;
    if (!projId) return;

    showToast('⏳ Enviando anexo...');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('pes_token')}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        const a = state.acoes.find(x => x.id === projId);

        if (state.uploadAcaoIndex !== null && state.uploadAcaoIndex !== undefined) {
            a.acoes_execucao[state.uploadAcaoIndex].anexoUrl = data.url;
            a.acoes_execucao[state.uploadAcaoIndex].anexoNome = data.name;
        } else if (state.uploadCicloId) {
            if (!a.entregas_periodicas) a.entregas_periodicas = {};
            const cData = state.uploadCicloData || {};

            a.entregas_periodicas[state.uploadCicloId] = {
                dataRegistro: new Date().toISOString().split('T')[0],
                autor: state.currentUser ? state.currentUser.nome : 'Usuário',
                anexoUrl: data.url,
                anexoNome: data.name,
                resumo: cData.resumo,
                indicador: cData.indicador,
                meta: cData.meta,
                resultado: cData.resultado,
                custo_tipo: cData.custo_tipo,
                custo_valor: cData.custo_valor
            };
        }

        await atualizarInlineFirestore(a);
        showToast('✅ Arquivo enviado com sucesso!');
    } catch (e) {
        showToast('❌ Erro no upload: ' + e.message);
    } finally {
        event.target.value = '';
        state.uploadAcaoIndex = null;
        state.uploadCicloId = null;
    }
}

export async function carregarSolicitacoesAdmin() {
    try {
        const res = await fetch(`${API_URL}/admin/solicitacoes`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error();
        return await res.json();
    } catch (e) {
        showToast('❌ Erro ao carregar solicitações');
        return [];
    }
}

export async function aprovarSolicitacao(id) {
    try {
        const res = await fetch(`${API_URL}/admin/solicitacoes/${id}/aprovar`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        showToast('✅ Solicitação aprovada!');
        if (window.renderAdminSolicitacoes) window.renderAdminSolicitacoes();
        carregarAcoesFirebase(state.currentUser.grupo);
    } catch (e) {
        showToast('❌ ' + e.message);
    }
}

export async function rejeitarSolicitacao(id) {
    try {
        const res = await fetch(`${API_URL}/admin/solicitacoes/${id}/rejeitar`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error();
        showToast('🗑️ Solicitação rejeitada.');
        if (window.renderAdminSolicitacoes) window.renderAdminSolicitacoes();
    } catch (e) {
        showToast('❌ Erro ao rejeitar');
    }
}

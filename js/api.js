// js/api.js
import { state, PERSPECTIVAS } from './data.js';
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
        
        state.acoes = data.map(p => {
            let grupo = p.unidade;
            let setor = '';
            if (p.unidade && p.unidade.startsWith('CFA - ')) {
                grupo = 'CFA';
                setor = p.unidade.replace('CFA - ', '');
            } else if (p.unidade === 'CFA') {
                grupo = 'CFA';
            }
            
            return {
                ...p,
                grupo,
                setor,
                id: p.id.toString(),
                objetivo: p.objetivo_id,
                prazo: p.prazo ? p.prazo.split('T')[0] : '',
                meta: p.meta_num ? Number(p.meta_num) : 0,
                resultado: p.res_num ? Number(p.res_num) : 0,
                meta_data: p.meta_data ? p.meta_data.split('T')[0] : '',
                resultado_data: p.res_data ? p.res_data.split('T')[0] : '',
                meta_quali: p.meta_quali,
                progresso_quali: p.res_quali,
                indicador: p.indicador_nome,
                anexoUrl: p.anexo_url,
                anexoNome: p.anexo_nome
            };
        });

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
        state.todasAcoes = data.map(p => {
            let grupo = p.unidade;
            let setor = '';
            if (p.unidade && p.unidade.startsWith('CFA - ')) {
                grupo = 'CFA';
                setor = p.unidade.replace('CFA - ', '');
            } else if (p.unidade === 'CFA') {
                grupo = 'CFA';
            }
            
            return {
                ...p,
                grupo,
                setor,
                id: p.id.toString(),
                objetivo: p.objetivo_id,
                prazo: p.prazo ? p.prazo.split('T')[0] : '',
                meta: p.meta_num ? Number(p.meta_num) : 0,
                resultado: p.res_num ? Number(p.res_num) : 0,
                meta_data: p.meta_data ? p.meta_data.split('T')[0] : '',
                resultado_data: p.res_data ? p.res_data.split('T')[0] : '',
                meta_quali: p.meta_quali,
                progresso_quali: p.res_quali,
                indicador: p.indicador_nome,
                anexoUrl: p.anexo_url,
                anexoNome: p.anexo_nome
            };
        });
        if (window.renderIndicadores) window.renderIndicadores();
        if (window.renderSWOT) window.renderSWOT();
        if (window.updateDashboard) window.updateDashboard();
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
        if (window.updateDashboard) window.updateDashboard();
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

// =============================================
// RESULTADOS DE OBJETIVO POR CRA (com evidência)
// =============================================

export async function carregarResultadosObjetivo() {
    try {
        const res = await fetch(`${API_URL}/objetivos/resultados`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        state.resultadosObjetivo = await res.json();
        const pageObj = document.getElementById('page-objetivos');
        if (pageObj && pageObj.classList.contains('active')) {
            if (window.renderObjetivosEstrategicos) window.renderObjetivosEstrategicos();
        }
        const pageIndicadores = document.getElementById('page-indicadores');
        if (pageIndicadores && pageIndicadores.classList.contains('active')) {
            if (window.renderIndicadores) window.renderIndicadores();
        }
    } catch (e) {
        console.error('[Resultados] Erro ao carregar:', e);
    }
}

// Seleção do arquivo: NÃO envia nada ao servidor ainda — apenas guarda o File
// em memória e mostra uma pré-visualização local. O upload de fato só acontece
// dentro de salvarResultadoObjetivo(), encadeado com a gravação do resultado.
export function handleResultadoEvidenciaUpload(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }

    const file = event.target.files[0];
    if (!file) return;

    state.resultadoModalArquivo = file;
    console.log('[Resultado Objetivo] Arquivo selecionado:', file.name, file.size, file.type);

    const nomeEl = document.getElementById('resultado-anexo-nome');
    const linkEl = document.getElementById('resultado-anexo-link');
    const previewEl = document.getElementById('resultado-anexo-preview');
    const uploadAreaEl = document.getElementById('resultado-anexo-upload-area');

    if (nomeEl) nomeEl.textContent = file.name;
    if (linkEl) linkEl.href = URL.createObjectURL(file); // apenas preview local, ainda sem URL no servidor
    if (previewEl) previewEl.style.display = 'flex';
    if (uploadAreaEl) uploadAreaEl.style.display = 'none';
}

// Submit único e atômico: só dispara a gravação do resultado DEPOIS de ter,
// em mãos, a URL definitiva da evidência retornada pelo upload.
export async function salvarResultadoObjetivo(event) {
    // Impede que o clique no botão dispare um submit/reload nativo do navegador
    if (event) { event.preventDefault(); event.stopPropagation(); }

    // Tudo dentro de um único try/catch — nenhuma exceção (incluindo elemento
    // não encontrado no DOM) deve escapar sem log e sem feedback ao usuário
    let btn = null;
    try {
        const objId = state.resultadoModalObjId;
        if (!objId) {
            console.error('[Resultado Objetivo] Submit abortado: nenhum objetivo associado ao modal.');
            showToast('❌ Não foi possível identificar o objetivo. Feche e abra o modal novamente.');
            return;
        }

        const resultadoInput = document.getElementById('resultado-modal-valor');
        const observacaoInput = document.getElementById('resultado-modal-observacao');
        if (!resultadoInput || !observacaoInput) {
            console.error('[Resultado Objetivo] Campos do modal não encontrados no DOM.');
            showToast('❌ Erro interno: campos do formulário não encontrados.');
            return;
        }

        const resultado = parseFloat(resultadoInput.value);
        const arquivo = state.resultadoModalArquivo;

        if (isNaN(resultado) || resultado < 0 || resultado > 100) {
            showToast('⚠️ Informe um percentual de resultado válido (0 a 100).');
            return;
        }
        if (!arquivo) {
            showToast('⚠️ Anexe uma evidência antes de salvar.');
            return;
        }

        btn = document.getElementById('btn-salvar-resultado');
        if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

        // 1) Upload da evidência — o restante do fluxo só continua após a resposta
        console.log('[Resultado Objetivo] Enviando evidência...', arquivo.name);
        const formData = new FormData();
        formData.append('file', arquivo);

        const uploadRes = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('pes_token')}` },
            body: formData
        });
        const uploadContentType = uploadRes.headers.get('content-type') || '';
        const uploadData = uploadContentType.includes('application/json') ? await uploadRes.json() : null;

        if (!uploadRes.ok) {
            throw new Error((uploadData && uploadData.message) || `Falha no upload da evidência (HTTP ${uploadRes.status})`);
        }
        console.log('[Resultado Objetivo] Upload concluído:', uploadData);

        // 2) Só agora grava o resultado, já com a evidencia_url confirmada pelo servidor
        const payload = {
            resultado,
            observacao: observacaoInput.value.trim(),
            evidencia_url: uploadData.url,
            evidencia_nome: uploadData.name
        };
        console.log('[Resultado Objetivo] Gravando resultado com payload:', payload);

        const salvarRes = await fetch(`${API_URL}/objetivos/${objId}/resultados`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const salvarContentType = salvarRes.headers.get('content-type') || '';
        const salvarData = salvarContentType.includes('application/json') ? await salvarRes.json() : null;

        if (!salvarRes.ok) {
            // Resposta sem JSON geralmente indica rota inexistente (backend desatualizado)
            throw new Error((salvarData && salvarData.message) || `Não foi possível salvar o resultado (HTTP ${salvarRes.status}). Verifique se o servidor backend foi reiniciado com a versão mais recente.`);
        }
        console.log('[Resultado Objetivo] Resultado gravado com sucesso:', salvarData);

        // 3) Atualização de estado local imediata — a tela reflete o novo resultado
        // sem depender de reload nem de uma segunda ida síncrona ao servidor.
        if (!state.resultadosObjetivo[objId]) state.resultadosObjetivo[objId] = [];
        state.resultadosObjetivo[objId].unshift(salvarData);
        if (window.renderObjetivosEstrategicos) window.renderObjetivosEstrategicos();

        showToast('✅ Resultado enviado com sucesso!');
        if (window.fecharModalResultado) window.fecharModalResultado();

        // Ressincroniza em segundo plano para manter consistência com o backend
        carregarResultadosObjetivo();
    } catch (e) {
        console.error('[Resultado Objetivo] Erro ao salvar resultado/evidência:', e);
        showToast('❌ ' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Salvar Resultado'; }
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

        // Criação é sempre direta. Edição de campos gerais do projeto (este
        // formulário completo) continua exigindo aprovação do Admin Master
        // para quem não é admin — por isso o 202 ainda é tratado aqui.
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

// Envio de execução do projeto (status, ações de execução) e entregas
// periódicas das atividades — aplicado direto, sem depender de aprovação do
// Admin Master (diferente da edição via modal e do "Resultado Alcançado" do
// indicador principal, que continuam exigindo aprovação — ver
// solicitarAlteracaoResultado abaixo).
export async function atualizarInlineFirestore(acaoData) {
    try {
        const res = await fetch(`${API_URL}/projetos/${acaoData.id}/execucao`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(acaoData)
        });
        if (!res.ok) throw new Error();

        showToast('✅ Atualizado.');

        carregarAcoesFirebase(state.currentUser.grupo);
        carregarTodasAcoesFirebase();
    } catch (e) {
        showToast('❌ Erro ao atualizar');
    }
}

// Alteração do "Resultado Alcançado" (indicador principal do projeto): ao
// contrário da execução/entregas, essa mudança continua exigindo aprovação
// do Admin Master — usa o mesmo endpoint gated de atualizarProjeto (PUT
// /projetos/:id), que retorna 202 (pendente) para quem não é admin.
export async function solicitarAlteracaoResultado(acaoData) {
    try {
        const res = await fetch(`${API_URL}/projetos/${acaoData.id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(acaoData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erro ao salvar resultado');

        if (res.status === 202) {
            showToast('⏳ Resultado enviado! Aguarde a aprovação do Admin Master.');
        } else {
            showToast('✅ Resultado atualizado.');
        }

        carregarAcoesFirebase(state.currentUser.grupo);
        carregarTodasAcoesFirebase();
    } catch (e) {
        showToast('❌ Erro ao atualizar resultado: ' + e.message);
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
export async function criarCraAdmin(data) {
    try {
        const res = await fetch(`${API_URL}/admin/cra-admins`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || 'Erro ao criar administrador');
        showToast('✅ Administrador do CRA criado com sucesso!');
        if (window.renderAdminUsers) window.renderAdminUsers();
        return true;
    } catch (e) {
        showToast('❌ ' + e.message);
        return false;
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

// Upload de anexo direto no modal de cadastro/edição
export async function handleModalAnexoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const status = document.getElementById('modal-anexo-status');
    status.textContent = '⏳ Enviando...';

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

        state.modalAnexo = { url: data.url, name: data.name };

        document.getElementById('modal-anexo-nome').textContent = data.name;
        document.getElementById('modal-anexo-link').href = data.url;
        document.getElementById('modal-anexo-preview').style.display = 'flex';
        document.getElementById('modal-anexo-upload-area').style.display = 'none';
        showToast('✅ Arquivo pronto! Clique em Salvar para confirmar.');
    } catch (e) {
        status.textContent = 'Nenhum arquivo selecionado';
        showToast('❌ Erro no upload: ' + e.message);
    } finally {
        event.target.value = '';
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

export async function solicitarResetSenha(email) {
    try {
        const res = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erro ao solicitar redefinição');

        showToast('✅ Verifique seu e-mail para redefinir a senha.');
        return true;
    } catch (error) {
        showToast(`❌ ${error.message}`);
        return false;
    }
}

export async function redefinirSenha(token, novaSenha) {
    try {
        const res = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, senha: novaSenha })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erro ao redefinir senha');

        showToast('✅ Senha redefinida com sucesso!');
        return true;
    } catch (error) {
        showToast(`❌ ${error.message}`);
        return false;
    }
}

// =============================================
// NOMES CUSTOMIZADOS (Perspectivas e Objetivos)
// =============================================

export async function carregarNomesCustom() {
    try {
        const res = await fetch(`${API_URL}/admin/nomes-custom`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const mapa = await res.json();

        // Aplica os nomes customizados ao PERSPECTIVAS em memória
        Object.entries(PERSPECTIVAS).forEach(([key, p]) => {
            const chavePersp = `persp_${key}`;
            if (mapa[chavePersp]) {
                p.nome = mapa[chavePersp];
            }
            p.objetivos.forEach(obj => {
                const chaveObj = `obj_${obj.id}`;
                if (mapa[chaveObj]) {
                    obj.nome = mapa[chaveObj];
                }
            });
        });

        // Re-renderiza as views que usam esses nomes
        if (window.renderObjetivosEstrategicos) window.renderObjetivosEstrategicos();
        if (window.renderMapa) window.renderMapa();
        if (window.renderIndicadores) window.renderIndicadores();
        if (window.updateDashboard) window.updateDashboard();
    } catch (e) {
        console.error('[NomesCustom] Erro ao carregar:', e);
    }
}

export async function salvarNomeCustom(chave, nome) {
    try {
        const res = await fetch(`${API_URL}/admin/nomes-custom`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ chave, nome })
        });
        if (!res.ok) throw new Error();
        showToast('✅ Nome atualizado com sucesso!');
        // Recarrega para aplicar em todas as views
        await carregarNomesCustom();
    } catch (e) {
        showToast('❌ Erro ao salvar nome');
    }
}

// =============================================
// GERENCIAMENTO DE ITENS SWOT
// =============================================

export async function carregarItensSwot() {
    try {
        const res = await fetch(`${API_URL}/admin/swot-items`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const swotItems = await res.json();
        
        // Armazena no state para uso global
        state.swotItems = swotItems;
        
        // Re-renderiza a view SWOT
        if (window.renderSWOT) window.renderSWOT();
    } catch (e) {
        console.error('[SWOT] Erro ao carregar itens:', e);
    }
}

export async function salvarItemSwot(tipo, id, descricao) {
    try {
        const res = await fetch(`${API_URL}/admin/swot-items/${tipo}/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ descricao })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Erro ao salvar');
        }
        
        showToast('✅ Item atualizado com sucesso!');
        await carregarItensSwot();
    } catch (e) {
        showToast('❌ ' + e.message);
    }
}

export async function adicionarItemSwot(tipo, descricao) {
    try {
        const res = await fetch(`${API_URL}/admin/swot-items`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ tipo, descricao })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Erro ao criar');
        }
        
        showToast('✅ Item adicionado com sucesso!');
        await carregarItensSwot();
    } catch (e) {
        showToast('❌ ' + e.message);
    }
}

export async function deletarItemSwot(tipo, id) {
    try {
        const res = await fetch(`${API_URL}/admin/swot-items/${tipo}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Erro ao deletar');
        }
        
        showToast('🗑️ Item removido.');
        await carregarItensSwot();
    } catch (e) {
        showToast('❌ ' + e.message);
    }
}
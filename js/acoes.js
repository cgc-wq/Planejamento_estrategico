import { state, PERSPECTIVAS, STATUS_LABELS, STATUS_CHIPS, PERSP_ABREV, PERSP_CORES } from './data.js';
import { escapeHTML, formatDate, showToast } from './utils.js';

// =====================================
// DINÂMICA DO FORMULÁRIO (MODAL)
// =====================================
export function toggleTipoCampos() {
    const tipo = document.getElementById('m-tipo').value;
    document.getElementById('box-frequencia').style.display = tipo === 'atividade' ? 'block' : 'none';
}

export function toggleIndicadorCampos() {
    const t = document.getElementById('m-indicador-tipo').value;
    document.getElementById('box-ind-numerico').style.display = t === 'numerico' ? 'grid' : 'none';
    document.getElementById('box-ind-data').style.display = t === 'data' ? 'grid' : 'none';
    document.getElementById('box-ind-quali').style.display = t === 'qualitativo' ? 'grid' : 'none';
}

export function openModal(id = null) {
    state.editingId = id;
    const m = (elId) => document.getElementById(elId);
    m('modal-title').textContent = id ? 'Editar Registro' : 'Novo Cadastro';
    m('btn-excluir').style.display = id ? 'inline-flex' : 'none';

    ['m-nome', 'm-prazo', 'm-indicador-nome', 'm-meta-num', 'm-res-num', 'm-meta-data', 'm-res-data']
        .forEach(elId => document.getElementById(elId)?.classList.remove('campo-invalido'));

    if (id) {
        const a = state.acoes.find(x => x.id === id);
        if (!a) return;

        m('m-tipo').value = a.tipo || 'projeto';
        m('m-frequencia').value = a.frequencia || 'mensal';
        m('m-perspectiva').value = a.perspectiva;
        window.updateObjetivos();
        m('m-objetivo').value = a.objetivo;
        m('m-nome').value = a.nome;
        m('m-descricao').value = a.descricao || '';
        m('m-responsavel').value = state.currentUser ? state.currentUser.nome : '';
        m('m-prazo').value = a.prazo || '';
        m('m-orcamento').value = a.orcamento || '';

        const indTipo = a.indicador_tipo || 'numerico';
        m('m-indicador-nome').value = a.indicador || '';
        m('m-indicador-tipo').value = indTipo;

        if (indTipo === 'numerico') {
            m('m-meta-num').value = a.meta || ''; m('m-res-num').value = a.resultado || '';
        } else if (indTipo === 'data') {
            m('m-meta-data').value = a.meta_data || ''; m('m-res-data').value = a.resultado_data || '';
        } else if (indTipo === 'qualitativo') {
            m('m-meta-quali').value = a.meta_quali || ''; m('m-res-quali').value = a.progresso_quali || 0;
            m('val-quali').innerText = (a.progresso_quali || 0) + '%';
        }

    } else {
        m('m-tipo').value = 'projeto'; m('m-frequencia').value = 'mensal';
        m('m-perspectiva').value = 'sustentabilidade'; window.updateObjetivos();
        m('m-responsavel').value = document.getElementById('user-email-display').textContent;
        m('m-prazo').value = ''; m('m-orcamento').value = ''; m('m-indicador-nome').value = '';
        m('m-indicador-tipo').value = 'numerico';
        m('m-meta-num').value = ''; m('m-res-num').value = '';
        m('m-meta-data').value = ''; m('m-res-data').value = '';
        m('m-meta-quali').value = ''; m('m-res-quali').value = 0; m('val-quali').innerText = '0%';
    }

    // Seção de anexo
    state.modalAnexo = null;
    const preview = document.getElementById('modal-anexo-preview');
    const uploadArea = document.getElementById('modal-anexo-upload-area');
    const status = document.getElementById('modal-anexo-status');

    if (id) {
        const a = state.acoes.find(x => x.id === id);
        if (a && a.anexoUrl) {
            state.modalAnexo = { url: a.anexoUrl, name: a.anexoNome || 'Arquivo anexado' };
            document.getElementById('modal-anexo-nome').textContent = state.modalAnexo.name;
            document.getElementById('modal-anexo-link').href = state.modalAnexo.url;
            preview.style.display = 'flex';
            uploadArea.style.display = 'none';
        } else {
            preview.style.display = 'none';
            uploadArea.style.display = 'flex';
            status.textContent = 'Nenhum arquivo selecionado';
        }
    } else {
        preview.style.display = 'none';
        uploadArea.style.display = 'flex';
        status.textContent = 'Nenhum arquivo selecionado';
    }

    toggleTipoCampos();
    toggleIndicadorCampos();
    document.getElementById('modal-overlay').classList.add('open');

    // Remove o destaque de erro assim que o usuário corrige o campo
    ['m-nome', 'm-prazo', 'm-indicador-nome', 'm-meta-num', 'm-res-num', 'm-meta-data', 'm-res-data']
        .forEach(elId => {
            const el = document.getElementById(elId);
            if (el && !el.dataset.validacaoBind) {
                el.addEventListener('input', () => el.classList.remove('campo-invalido'));
                el.dataset.validacaoBind = '1';
            }
        });
}

export function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }
export function closeModalOutside(e) { if (e.target === document.getElementById('modal-overlay')) closeModal(); }

export function removerAnexoModal() {
    state.modalAnexo = null;
    document.getElementById('modal-anexo-preview').style.display = 'none';
    document.getElementById('modal-anexo-upload-area').style.display = 'flex';
    document.getElementById('modal-anexo-status').textContent = 'Nenhum arquivo selecionado';
    document.getElementById('modal-file-input').value = '';
}

export function updateObjetivos() {
    const p = document.getElementById('m-perspectiva').value;
    document.getElementById('m-objetivo').innerHTML = PERSPECTIVAS[p].objetivos.map(o => `<option value="${o.id}">${o.id} — ${o.nome}</option>`).join('');
}

// =====================================
// SALVAMENTO E CÁLCULO DE PROGRESSO
// =====================================
export function recalcularExecucao(projeto) {
    const t = projeto.indicador_tipo || 'numerico';
    let pct = 0;

    if (t === 'numerico') {
        const m = parseFloat(projeto.meta) || 0;
        const r = parseFloat(projeto.resultado) || 0;
        if (m > 0) pct = Math.min(100, Math.round((r / m) * 100));
    } else if (t === 'data') {
        pct = projeto.resultado_data ? 100 : 0;
    } else if (t === 'qualitativo') {
        pct = parseInt(projeto.progresso_quali) || 0;
    }

    if (pct === 0 && projeto.tipo === 'projeto' && projeto.acoes_execucao && projeto.acoes_execucao.length > 0) {
        const concluidas = projeto.acoes_execucao.filter(s => s.status === 'concluido').length;
        pct = Math.round((concluidas / projeto.acoes_execucao.length) * 100);
    }

    projeto.execucao = pct;
}

export function salvarAcao() {
    // Limpa marcações de erro anteriores
    ['m-nome', 'm-prazo', 'm-indicador-nome', 'm-meta-num', 'm-res-num', 'm-meta-data', 'm-res-data']
        .forEach(elId => document.getElementById(elId)?.classList.remove('campo-invalido'));

    const nome = document.getElementById('m-nome').value.trim();
    const prazo = document.getElementById('m-prazo').value;
    const indicadorNome = document.getElementById('m-indicador-nome').value.trim();
    const indTipoCheck = document.getElementById('m-indicador-tipo').value;

    const camposInvalidos = [];

    if (!nome) camposInvalidos.push({ id: 'm-nome', msg: 'Informe o nome do Projeto/Atividade' });
    if (!prazo) camposInvalidos.push({ id: 'm-prazo', msg: 'Informe o prazo final estimado' });
    if (!indicadorNome) camposInvalidos.push({ id: 'm-indicador-nome', msg: 'Informe o nome do indicador' });

    if (indTipoCheck === 'numerico') {
        const metaNum = document.getElementById('m-meta-num').value;
        const resNum = document.getElementById('m-res-num').value;
        if (metaNum === '' || metaNum === null) camposInvalidos.push({ id: 'm-meta-num', msg: 'Informe a meta numérica' });
        if (resNum === '' || resNum === null) camposInvalidos.push({ id: 'm-res-num', msg: 'Informe o resultado atual' });
    } else if (indTipoCheck === 'data') {
        const metaData = document.getElementById('m-meta-data').value;
        const resData = document.getElementById('m-res-data').value;
        if (!metaData) camposInvalidos.push({ id: 'm-meta-data', msg: 'Informe a data-meta (limite/prometida)' });
        if (!resData) camposInvalidos.push({ id: 'm-res-data', msg: 'Informe a data-resultado (realizada)' });
    }

    if (camposInvalidos.length > 0) {
        camposInvalidos.forEach(c => document.getElementById(c.id)?.classList.add('campo-invalido'));
        showToast('⚠️ ' + camposInvalidos[0].msg);
        document.getElementById(camposInvalidos[0].id)?.focus();
        return;
    }

    const acaoExistente = state.editingId ? state.acoes.find(x => x.id === state.editingId) : null;
    const indTipo = document.getElementById('m-indicador-tipo').value;

    let unidadeCalculada = 'Desconhecido';
    if (acaoExistente) {
        unidadeCalculada = acaoExistente.unidade;
    } else if (state.currentUser) {
        if (state.currentUser.grupo === 'ADMIN') {
            unidadeCalculada = state.currentUser.entidade === 'CFA' 
                ? `CFA - ${state.currentUser.setor}` 
                : state.currentUser.entidade;
        } else if (state.currentUser.role === 'cra_admin' && state.currentUser.cra_admin_scope) {
            // Admin de CRA: usa o scope diretamente (ex: 'CRA-SP')
            unidadeCalculada = state.currentUser.cra_admin_scope;
        } else {
            unidadeCalculada = state.currentUser.grupo;
        }
    }

    const acaoData = {
        unidade: unidadeCalculada,
        tipo: document.getElementById('m-tipo').value,
        frequencia: document.getElementById('m-frequencia').value,
        perspectiva: document.getElementById('m-perspectiva').value,
        objetivo: document.getElementById('m-objetivo').value,
        nome: nome,
        descricao: document.getElementById('m-descricao').value,
        responsavel: document.getElementById('m-responsavel').value,
        prazo: document.getElementById('m-prazo').value,
        orcamento: parseFloat(document.getElementById('m-orcamento').value) || 0,

        indicador: document.getElementById('m-indicador-nome').value,
        indicador_tipo: indTipo,
        meta: indTipo === 'numerico' ? (parseFloat(document.getElementById('m-meta-num').value) || null) : null,
        resultado: indTipo === 'numerico' ? (parseFloat(document.getElementById('m-res-num').value) || null) : null,
        meta_data: indTipo === 'data' ? document.getElementById('m-meta-data').value : null,
        resultado_data: indTipo === 'data' ? document.getElementById('m-res-data').value : null,
        meta_quali: indTipo === 'qualitativo' ? document.getElementById('m-meta-quali').value : null,
        progresso_quali: indTipo === 'qualitativo' ? parseInt(document.getElementById('m-res-quali').value) : null,

        status: acaoExistente ? acaoExistente.status : 'em_andamento',
        execucao: 0,
        acoes_execucao: acaoExistente ? (acaoExistente.acoes_execucao || []) : [],
        entregas_periodicas: acaoExistente ? (acaoExistente.entregas_periodicas || {}) : {},
        criadoEm: acaoExistente ? acaoExistente.criadoEm : new Date().toISOString(),
        anexoUrl: state.modalAnexo ? state.modalAnexo.url : (acaoExistente ? (acaoExistente.anexoUrl || null) : null),
        anexoNome: state.modalAnexo ? state.modalAnexo.name : (acaoExistente ? (acaoExistente.anexoNome || null) : null)
    };

    recalcularExecucao(acaoData);
    window.salvarNoFirestore(acaoData, state.editingId);
}

export function excluirAcao() {
    const isAdmin = state.currentUser && state.currentUser.email === 'cgc@cfa.org.br';
    
    if (isAdmin) {
        if (!confirm('Confirmar exclusão deste registro permanentemente?')) return;
        window.excluirNoFirestore(state.editingId);
    } else {
        // Para usuários comuns, abre o modal de justificativa
        document.getElementById('m-justificativa-texto').value = '';
        document.getElementById('modal-justificativa-overlay').classList.add('open');
    }
}

export function confirmarExclusao() {
    const texto = document.getElementById('m-justificativa-texto').value.trim();
    if (!texto) {
        showToast('⚠️ Por favor, informe o motivo da exclusão.');
        return;
    }
    
    document.getElementById('modal-justificativa-overlay').classList.remove('open');
    window.excluirNoFirestore(state.editingId, texto);
}

// =====================================
// RENDERIZAÇÃO DA TELA (LISTA)
// =====================================
export function renderAcoes() {
    const busca = document.getElementById('filtro-busca').value.toLowerCase();
    const fPersp = document.getElementById('filtro-perspectiva').value;
    const fStatus = document.getElementById('filtro-status').value;
    
    const adminFiltrosAtivos = document.getElementById('admin-filtros-acoes') && document.getElementById('admin-filtros-acoes').style.display !== 'none';
    let fEntidade = '';
    let fSetor = '';
    if (adminFiltrosAtivos) {
        fEntidade = document.getElementById('filtro-entidade-acoes').value;
        if (fEntidade === 'CFA') {
            fSetor = document.getElementById('filtro-setor-acoes').value;
        }
    }

    let filtradas = state.acoes.filter(a => {
        if (fPersp && a.perspectiva !== fPersp) return false;
        if (fStatus && a.status !== fStatus) return false;
        
        if (adminFiltrosAtivos) {
            if (fEntidade && a.grupo !== fEntidade) return false;
            if (fSetor && a.setor !== fSetor) return false;
        }
        
        if (busca && !a.nome.toLowerCase().includes(busca) && !a.objetivo.toLowerCase().includes(busca)) return false;
        return true;
    });

    const container = document.getElementById('acoes-container');
    const empty = document.getElementById('acoes-empty');

    if (filtradas.length === 0) {
        container.innerHTML = ''; empty.style.display = 'block'; return;
    }
    empty.style.display = 'none';

    // Verifica a memória antes de desenhar o cartão (para manter expandido)
    if (!state.expandedCards) state.expandedCards = new Set();

    container.innerHTML = filtradas.map(a => {
        recalcularExecucao(a);
        const isOpenClass = state.expandedCards.has(a.id) ? 'open' : '';
        const pct = a.execucao || 0;
        const safeNome = escapeHTML(a.nome);
        const safeDesc = escapeHTML(a.descricao);
        const safeResp = escapeHTML(a.responsavel);
        const safeIndi = escapeHTML(a.indicador);
        const objInfo = PERSPECTIVAS[a.perspectiva]?.objetivos.find(o => o.id === a.objetivo);
        const safeObjNome = objInfo ? escapeHTML(objInfo.nome) : '';

        const tipoLabel = a.tipo === 'atividade' ? 'Atividade Contínua' : 'Projeto';
        const tipoCor = a.tipo === 'atividade' ? '#E8A020' : '#1756B8';

        // Calcula os gastos com Execuções e Entregas
        let gastoR = 0, gastoHoras = 0;
        if (a.acoes_execucao) {
            a.acoes_execucao.forEach(sub => {
                if (sub.custo_tipo === 'monetario') gastoR += (sub.custo_valor || 0);
                if (sub.custo_tipo === 'horas') gastoHoras += (sub.custo_valor || 0);
            });
        }
        if (a.entregas_periodicas) {
            Object.values(a.entregas_periodicas).forEach(ent => {
                if (ent.custo_tipo === 'monetario') gastoR += (ent.custo_valor || 0);
                if (ent.custo_tipo === 'horas') gastoHoras += (ent.custo_valor || 0);
            });
        }

        // Cálculos de Saldo Financeiro
        const orcamentoFormatado = (a.orcamento || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const gastoRFormatado = gastoR.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const saldoR = (a.orcamento || 0) - gastoR;
        const saldoFormatado = saldoR.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const corSaldo = saldoR < 0 ? 'var(--vermelho)' : 'var(--verde)';

        let corpoAcaoHtml = '';
        let metricasInfoHtml = '';

        if (a.tipo === 'projeto') {
            const subTotal = a.acoes_execucao ? a.acoes_execucao.length : 0;
            const subConc = a.acoes_execucao ? a.acoes_execucao.filter(s => s.status === 'concluido').length : 0;
            metricasInfoHtml = `<span>• Execução: ${subConc}/${subTotal} ações</span>`;

            let checkHtml = (subTotal === 0) ? `<p style="font-size:12px; color:var(--texto-sec);">Nenhuma etapa lançada.</p>` :
                a.acoes_execucao.map((sub, idx) => {
                    const anexoBadge = sub.anexoUrl ? `<a href="${sub.anexoUrl}" target="_blank" style="background:#EAF1FF; color:var(--azul-mid); padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700; text-decoration:none;">📎 Comprovante</a> <button onclick="window.removerAnexo('${a.id}', ${idx})" style="border:none;background:none;color:var(--vermelho);cursor:pointer;font-size:10px;">🗑️</button>` : `<button onclick="window.triggerFileUpload('${a.id}', ${idx})" style="background:#F0F4FA;border:1px solid var(--cinza-borda);color:var(--texto-sec);cursor:pointer;font-size:10px; padding:2px 6px; border-radius:4px; font-weight:700;">📎 Anexar</button>`;

                    let metricasSub = '';
                    if (sub.indicador || sub.meta || sub.custo_valor) {
                        metricasSub = `<div style="font-size:10px; color:var(--texto-sec); margin-top:4px; background:#f0f4fa; padding:6px; border-radius:4px;">
                 ${sub.indicador ? `<strong>Ind:</strong> ${escapeHTML(sub.indicador)} | ` : ''}
                 ${sub.meta ? `<strong>Meta:</strong> ${sub.meta} | <strong>Índice:</strong> ${sub.resultado || 0} | ` : ''}
                 ${sub.custo_valor ? `<strong>Gasto:</strong> ${sub.custo_tipo === 'monetario' ? 'R$ ' : ''}${sub.custo_valor}${sub.custo_tipo === 'horas' ? 'h' : ''}` : ''}
              </div>`;
                    }

                    return `
          <div class="checklist-item ${sub.status === 'concluido' ? 'done' : ''}">
            <input type="checkbox" style="margin-top:4px;cursor:pointer;" ${sub.status === 'concluido' ? 'checked' : ''} onclick="window.toggleSubAcaoInline('${a.id}', ${idx})">
            <div class="cl-text" style="width:100%;">
               <div style="font-weight:600;">${escapeHTML(sub.nome)}</div>
               ${metricasSub}
            </div>
            <div style="display:flex; align-items:center; gap: 4px; margin-left: 8px;">
               ${anexoBadge}
               <button onclick="window.removerSubAcaoInline('${a.id}', ${idx})" style="background:none;border:none;color:var(--vermelho);cursor:pointer;font-size:12px;margin-left:4px;">✖</button>
            </div>
          </div>`;
                }).join('');

            corpoAcaoHtml = `
          <div class="pb-section-title">Execução do Projeto</div>
          ${checkHtml}
          <div class="add-action-box" style="margin-top:16px; display:flex; flex-direction:column; gap:8px; background:#f8f9fa; padding:12px; border-radius:8px; border:1px solid var(--cinza-borda);">
            <input type="text" id="nova-acao-nome-${a.id}" placeholder="Descrição da execução (Obrigatório)..." style="width:100%; font-size:12px; padding:8px; border:1px solid #ccc; border-radius:6px;" onkeypress="if(event.key==='Enter') window.adicionarAcaoInline('${a.id}')">
            <div style="display:flex; gap:8px;">
               <input type="text" id="nova-acao-ind-${a.id}" placeholder="Indicador" style="flex:1; font-size:12px; padding:8px; border:1px solid #ccc; border-radius:6px;">
               <input type="number" id="nova-acao-meta-${a.id}" placeholder="Meta" style="width:70px; font-size:12px; padding:8px; border:1px solid #ccc; border-radius:6px;">
               <input type="number" id="nova-acao-res-${a.id}" placeholder="Índice" style="width:70px; font-size:12px; padding:8px; border:1px solid #ccc; border-radius:6px;">
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
               <select id="nova-acao-orctipo-${a.id}" style="font-size:12px; padding:8px; border:1px solid #ccc; border-radius:6px;"><option value="monetario">Gasto R$</option><option value="horas">Horas Trab.</option></select>
               <input type="number" id="nova-acao-orcval-${a.id}" placeholder="Custo Efetivo" style="width:110px; font-size:12px; padding:8px; border:1px solid #ccc; border-radius:6px;">
               <button class="btn btn-primary btn-sm" style="margin-left:auto;" onclick="window.adicionarAcaoInline('${a.id}')">+ Add Execução</button>
            </div>
          </div>
        `;
        } else {
            const freq = a.frequencia || 'mensal';
            const rotulos = freq === 'trimestral' ? ['1º Tri', '2º Tri', '3º Tri', '4º Tri'] :
                freq === 'semestral' ? ['1º Semestre', '2º Semestre'] :
                    freq === 'bimestral' ? ['Jan/Fev', 'Mar/Abr', 'Mai/Jun', 'Jul/Ago', 'Set/Out', 'Nov/Dez'] :
                        freq === 'anual' ? ['Ano Vigente'] :
                            ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

            let entregues = Object.keys(a.entregas_periodicas || {}).length;
            metricasInfoHtml = `<span>• Entregas Vigentes: ${entregues}/${rotulos.length}</span>`;

            let ciclosHtml = `<div class="ciclo-grid">`;
            rotulos.forEach((rotulo, idx) => {
                const idCiclo = `ciclo_${idx}`;
                const dataEntrega = (a.entregas_periodicas && a.entregas_periodicas[idCiclo]) ? a.entregas_periodicas[idCiclo] : null;

                if (dataEntrega) {
                    const fileBadge = dataEntrega.anexoUrl ? `<a href="${dataEntrega.anexoUrl}" target="_blank" style="color:var(--verde); font-weight:700; text-decoration:none;">📎 Ver Comprovante</a>` : `<em>Sem anexo</em>`;

                    let metricasCiclo = '';
                    if (dataEntrega.indicador || dataEntrega.meta || dataEntrega.custo_valor) {
                        metricasCiclo = `<div style="background:#f0f4fa; padding:6px; border-radius:4px; margin-top:8px; font-size:10px; color:var(--texto-sec);">
                     ${dataEntrega.indicador ? `<strong>Ind:</strong> ${escapeHTML(dataEntrega.indicador)}<br>` : ''}
                     ${dataEntrega.meta ? `<strong>Meta:</strong> ${dataEntrega.meta} | <strong>Índice:</strong> ${dataEntrega.resultado || 0}<br>` : ''}
                     ${dataEntrega.custo_valor ? `<strong>Gasto:</strong> ${dataEntrega.custo_tipo === 'monetario' ? 'R$ ' : ''}${dataEntrega.custo_valor}${dataEntrega.custo_tipo === 'horas' ? 'h' : ''}` : ''}
                  </div>`;
                    }

                    ciclosHtml += `
                <div class="ciclo-card concluido">
                   <div class="ciclo-header">✅ ${rotulo}</div>
                   <div class="ciclo-body"><strong>Feito por:</strong> ${escapeHTML(dataEntrega.autor.split('@')[0])}<br><strong>Data:</strong> ${formatDate(dataEntrega.dataRegistro)}<br><br><strong>Resumo:</strong> ${escapeHTML(dataEntrega.resumo)}
                   ${metricasCiclo}
                   </div>
                   <div class="ciclo-action" style="font-size:10px; border-top:1px solid #dcfce7; padding-top:6px;">${fileBadge}</div>
                </div>`;
                } else {
                    ciclosHtml += `
                <div class="ciclo-card pendente" style="padding:12px;">
                   <div class="ciclo-header" style="margin-bottom:8px;">⏳ ${rotulo}</div>
                   <div class="ciclo-action" style="display:flex; flex-direction:column; gap:6px;">
                     <input type="text" id="resumo_ciclo_${a.id}_${idx}" class="ciclo-input" placeholder="Resumo da entrega (Obrigatório)..." style="font-size:10px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                     <div style="display:flex; gap:4px;">
                       <input type="text" id="ind_ciclo_${a.id}_${idx}" placeholder="Indicador" style="flex:1; font-size:10px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                       <input type="number" id="meta_ciclo_${a.id}_${idx}" placeholder="Meta" style="width:45px; font-size:10px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                       <input type="number" id="res_ciclo_${a.id}_${idx}" placeholder="Índice" style="width:45px; font-size:10px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                     </div>
                     <div style="display:flex; gap:4px;">
                       <select id="orctipo_ciclo_${a.id}_${idx}" style="font-size:10px; padding:6px; border:1px solid #ccc; border-radius:4px; width:65px;"><option value="monetario">Gasto R$</option><option value="horas">Horas</option></select>
                       <input type="number" id="orcval_ciclo_${a.id}_${idx}" placeholder="Custo Efetivo" style="width:75px; font-size:10px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                       <button class="btn btn-primary btn-sm" style="flex:1; font-size:10px; padding:6px;" onclick="window.triggerEntregaUpload('${a.id}', '${idCiclo}', ${idx})">📎 Anexar</button>
                     </div>
                   </div>
                </div>`;
                }
            });
            ciclosHtml += `</div>`;
            corpoAcaoHtml = `
          <div class="pb-section-title">Entregas Periódicas (${freq.toUpperCase()})</div>
          ${ciclosHtml}
        `;
        }

        let blocoMetaHtml = '';
        const iType = a.indicador_tipo || 'numerico';
        if (iType === 'numerico') {
            blocoMetaHtml = `
        <div class="pb-meta-item"><label>Meta Global do Projeto</label><div style="font-size:12px;font-weight:700;padding:6px 0;">${a.meta || '—'}</div></div>
        <div class="pb-meta-item"><label style="color:var(--azul-mid);">Resultado Alcançado</label><div style="display:flex; gap:6px;"><input type="number" id="res-inline-${a.id}" value="${a.resultado !== null ? a.resultado : ''}" style="border:1px solid var(--azul-mid); width:70px; font-size:11px; padding:4px;"><button class="btn btn-primary btn-sm" onclick="window.updateIndicadorInteligente('${a.id}')">Salvar</button></div></div>
      `;
        } else if (iType === 'data') {
            blocoMetaHtml = `
        <div class="pb-meta-item"><label>Data Prometida</label><div style="font-size:12px;font-weight:700;padding:6px 0;">${formatDate(a.meta_data) || '—'}</div></div>
        <div class="pb-meta-item"><label style="color:var(--azul-mid);">Data de Conclusão</label><div style="display:flex; gap:6px;"><input type="date" id="res-inline-${a.id}" value="${a.resultado_data || ''}" style="border:1px solid var(--azul-mid); font-size:11px; padding:4px;"><button class="btn btn-primary btn-sm" onclick="window.updateIndicadorInteligente('${a.id}')">Salvar</button></div></div>
      `;
        } else if (iType === 'qualitativo') {
            blocoMetaHtml = `
        <div class="pb-meta-item"><label>Objetivo</label><div style="font-size:11px;font-weight:700;padding:4px 0; line-height:1.3;">${escapeHTML(a.meta_quali) || '—'}</div></div>
        <div class="pb-meta-item"><label style="color:var(--azul-mid);">Avanço (%)</label><div style="display:flex; gap:6px; align-items:center;"><input type="range" id="res-inline-${a.id}" min="0" max="100" value="${a.progresso_quali || 0}" style="width:100px; cursor:pointer;" oninput="this.nextElementSibling.innerText=this.value+'%'"><span style="font-weight:800;font-size:11px;">${a.progresso_quali || 0}%</span><button class="btn btn-primary btn-sm" onclick="window.updateIndicadorInteligente('${a.id}')">Salvar</button></div></div>
      `;
        }

        return `
    <div class="project-card ${isOpenClass}" id="card-${a.id}">
      <div class="project-header" onclick="window.toggleCard('${a.id}', event)">
        <div class="ph-main">
          <span class="ph-badge" style="background:${tipoCor}">${tipoLabel}</span>
          <div class="ph-title">${safeNome} ${a.tem_pendencia ? '<span title="Alteração pendente de aprovação" style="color:var(--amarelo); margin-left:5px; font-size:14px;">⏳</span>' : ''}</div>
          <div class="ph-sub">
            <span style="color:${PERSP_CORES[a.perspectiva]}; font-weight:700;">${PERSP_ABREV[a.perspectiva]}</span>
            <span>• ${a.objetivo}</span>
            ${metricasInfoHtml}
          </div>
        </div>
        
        <div style="font-size:12px; color:var(--texto-sec); width:120px;">
          <div style="font-weight:700; color:var(--texto); margin-bottom:2px;">${safeResp || 'S/ Resp.'}</div>
          <div>${a.prazo ? formatDate(a.prazo) : 'S/ Prazo'}</div>
        </div>

        <div class="ph-stats">
          <div class="ph-exec"><span class="chip ${STATUS_CHIPS[a.status]}">${STATUS_LABELS[a.status]}</span><span style="color:${PERSP_CORES[a.perspectiva]}">${pct}%</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${PERSP_CORES[a.perspectiva]};"></div></div>
        </div>
        <div class="ph-actions"><div class="ph-toggle"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div></div>
      </div>

      <div class="project-body">
        <div class="pb-grid">
          <div>
            <div class="pb-section-title">Contexto & Indicadores</div>
            <div style="background:var(--cinza-bg); padding:8px 12px; border-radius:6px; margin-bottom:14px; font-size:11px; color:var(--texto-sec);">
              <strong style="color:var(--azul-cfa);">Alinhamento Estratégico:</strong><br>${PERSP_ABREV[a.perspectiva]} ➔ ${a.objetivo} - ${safeObjNome}
            </div>
            <div class="pb-text">${safeDesc ? safeDesc.replace(/\n/g, '<br>') : 'Nenhuma descrição detalhada.'}</div>
            
            <div class="pb-meta-grid" style="grid-template-columns: 1fr 1fr 1.2fr; align-items: end;">
              <div class="pb-meta-item"><label>Indicador Principal</label><div style="font-size:11px;font-weight:800;padding:6px 0;">${safeIndi || 'Geral'}</div></div>
              ${blocoMetaHtml}
            </div>

            <div class="pb-meta-grid" style="grid-template-columns: 2fr 1fr; margin-top:12px; background:#FFF3E0; border-color:#FFB74D;">
               <div class="pb-meta-item" style="grid-column: span 1;">
                 <label>Controle de Custos (Orçado x Gasto)</label>
                 <div style="display:flex; gap: 16px; margin-top: 6px;">
                    <div><span style="font-size:10px; color:var(--texto-sec);">Orçado:</span> <strong style="font-size:12px; color:var(--texto);">${orcamentoFormatado}</strong></div>
                    <div><span style="font-size:10px; color:var(--texto-sec);">Gasto:</span> <strong style="font-size:12px; color:#E65100;">${gastoRFormatado}</strong></div>
                    <div><span style="font-size:10px; color:var(--texto-sec);">Saldo:</span> <strong style="font-size:12px; color:${corSaldo};">${saldoFormatado}</strong></div>
                    ${gastoHoras > 0 ? `<div><span style="font-size:10px; color:var(--texto-sec);">Horas Gastas:</span> <strong style="font-size:12px; color:var(--azul-mid);">${gastoHoras}h</strong></div>` : ''}
                 </div>
               </div>
               <div class="pb-meta-item"><label>Status do Processo</label>
                  <select id="status-card-${a.id}" style="font-size:11px; padding:4px;" onchange="window.updateStatusOnly('${a.id}')">
                    <option value="nao_iniciado" ${a.status === 'nao_iniciado' ? 'selected' : ''}>Não Iniciado</option>
                    <option value="em_andamento" ${a.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                    <option value="concluido" ${a.status === 'concluido' ? 'selected' : ''}>Concluído</option>
                    <option value="pausado" ${a.status === 'pausado' ? 'selected' : ''}>Pausado</option>
                  </select>
               </div>
            </div>
            
            <div style="display:flex; align-items:center; gap:10px; margin-top:12px; flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" onclick="window.openModal('${a.id}')">Editar Ficha Completa</button>
              ${a.anexoUrl ? `<a href="${a.anexoUrl}" target="_blank" style="background:#EAF1FF; color:var(--azul-mid); padding:5px 10px; border-radius:6px; font-size:11px; font-weight:700; text-decoration:none; border:1px solid var(--azul-mid);">📎 ${escapeHTML(a.anexoNome || 'Ver Anexo')}</a>` : ''}
            </div>
          </div>

          <div>${corpoAcaoHtml}</div>

        </div>
      </div>
    </div>`;
    }).join('');
}

// =====================================
// FUNÇÕES DE INTERAÇÃO DO CARD
// =====================================

export function toggleCard(id, event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' || event.target.tagName === 'SELECT' || event.target.tagName === 'A') return;

    const card = document.getElementById('card-' + id);
    card.classList.toggle('open');

    // Cria a memória de cartões abertos se não existir
    if (!state.expandedCards) state.expandedCards = new Set();

    // Adiciona ou remove da memória dependendo do estado do cartão
    if (card.classList.contains('open')) {
        state.expandedCards.add(id);
    } else {
        state.expandedCards.delete(id);
    }
}

export function updateIndicadorInteligente(id) {
    const a = state.acoes.find(x => x.id === id);
    if (!a) return;
    const t = a.indicador_tipo || 'numerico';
    const val = document.getElementById('res-inline-' + id).value;

    if (t === 'numerico') a.resultado = parseFloat(val) || null;
    if (t === 'data') a.resultado_data = val;
    if (t === 'qualitativo') a.progresso_quali = parseInt(val) || 0;

    recalcularExecucao(a);
    window.atualizarInlineFirestore(a);
}

export function updateStatusOnly(id) {
    const a = state.acoes.find(x => x.id === id);
    if (a) {
        a.status = document.getElementById('status-card-' + id).value;
        window.atualizarInlineFirestore(a);
    }
}

export function adicionarAcaoInline(projId) {
    const a = state.acoes.find(x => x.id === projId);
    if (!a) return;
    const nome = document.getElementById(`nova-acao-nome-${projId}`).value.trim();
    if (!nome) { showToast('⚠️ Digite a descrição da etapa.'); return; }

    // Captura os novos campos do mini formulário
    const indicador = document.getElementById(`nova-acao-ind-${projId}`).value.trim();
    const meta = document.getElementById(`nova-acao-meta-${projId}`).value;
    const resultado = document.getElementById(`nova-acao-res-${projId}`).value;
    const orcTipo = document.getElementById(`nova-acao-orctipo-${projId}`).value;
    const orcVal = document.getElementById(`nova-acao-orcval-${projId}`).value;

    if (!a.acoes_execucao) a.acoes_execucao = [];

    a.acoes_execucao.push({
        nome: nome,
        status: 'pendente',
        indicador: indicador || null,
        meta: meta ? parseFloat(meta) : null,
        resultado: resultado ? parseFloat(resultado) : null,
        custo_tipo: orcTipo,
        custo_valor: orcVal ? parseFloat(orcVal) : null
    });

    recalcularExecucao(a);
    window.atualizarInlineFirestore(a);
}

export function toggleSubAcaoInline(projId, acaoIndex) {
    const a = state.acoes.find(x => x.id === projId);
    if (!a) return;
    a.acoes_execucao[acaoIndex].status = a.acoes_execucao[acaoIndex].status === 'concluido' ? 'pendente' : 'concluido';
    recalcularExecucao(a); window.atualizarInlineFirestore(a);
}

export function removerSubAcaoInline(projId, acaoIndex) {
    const a = state.acoes.find(x => x.id === projId);
    if (!a) return;
    a.acoes_execucao.splice(acaoIndex, 1);
    recalcularExecucao(a); window.atualizarInlineFirestore(a);
}

// =====================================
// UPLOAD E ANEXOS (STORAGE)
// =====================================
export function triggerEntregaUpload(projId, idCiclo, idxHtml) {
    const resumo = document.getElementById(`resumo_ciclo_${projId}_${idxHtml}`).value.trim();
    if (!resumo) { showToast('⚠️ Preencha o resumo da entrega antes de anexar.'); return; }

    const indicador = document.getElementById(`ind_ciclo_${projId}_${idxHtml}`).value.trim();
    const meta = document.getElementById(`meta_ciclo_${projId}_${idxHtml}`).value;
    const resultado = document.getElementById(`res_ciclo_${projId}_${idxHtml}`).value;
    const orcTipo = document.getElementById(`orctipo_ciclo_${projId}_${idxHtml}`).value;
    const orcVal = document.getElementById(`orcval_ciclo_${projId}_${idxHtml}`).value;

    state.uploadProjId = projId;
    state.uploadCicloId = idCiclo;

    // Guarda os dados extras na memória para salvar junto com o arquivo
    state.uploadCicloData = {
        resumo: resumo,
        indicador: indicador || null,
        meta: meta ? parseFloat(meta) : null,
        resultado: resultado ? parseFloat(resultado) : null,
        custo_tipo: orcTipo,
        custo_valor: orcVal ? parseFloat(orcVal) : null
    };

    document.getElementById('global-file-input').click();
}

export async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const projId = state.uploadProjId;
    if (!projId) return;

    showToast('⏳ Enviando anexo para a nuvem...');
    try {
        const storageRef = window.storageRef(window.storage, `anexos/${projId}/${Date.now()}_${file.name}`);
        await window.uploadBytes(storageRef, file);
        const downloadURL = await window.getDownloadURL(storageRef);
        const a = state.acoes.find(x => x.id === projId);

        if (state.uploadAcaoIndex !== null && state.uploadAcaoIndex !== undefined) {
            a.acoes_execucao[state.uploadAcaoIndex].anexoUrl = downloadURL;
            a.acoes_execucao[state.uploadAcaoIndex].anexoNome = file.name;
        } else if (state.uploadCicloId) {
            if (!a.entregas_periodicas) a.entregas_periodicas = {};

            // Recupera os dados extras da memória
            const cData = state.uploadCicloData || {};

            a.entregas_periodicas[state.uploadCicloId] = {
                dataRegistro: new Date().toISOString().split('T')[0],
                autor: state.currentUser ? state.currentUser.nome : 'Usuário',
                anexoUrl: downloadURL,
                anexoNome: file.name,
                resumo: cData.resumo,
                indicador: cData.indicador,
                meta: cData.meta,
                resultado: cData.resultado,
                custo_tipo: cData.custo_tipo,
                custo_valor: cData.custo_valor
            };
        }

        await window.atualizarInlineFirestore(a);
        showToast('✅ Entrega registrada com sucesso!');
    } catch (e) {
        showToast('❌ Erro no upload: ' + e.message);
    } finally {
        event.target.value = '';
        state.uploadAcaoIndex = null;
        state.uploadCicloId = null;
    }
}

export function triggerFileUpload(projId, acaoIndex) {
    state.uploadProjId = projId;
    state.uploadAcaoIndex = acaoIndex;
    state.uploadCicloId = null;
    document.getElementById('global-file-input').click();
}

export function removerAnexo(projId, acaoIndex) {
    if (!confirm('Remover o comprovante desta ação?')) return;
    const a = state.acoes.find(x => x.id === projId);
    if (a && a.acoes_execucao && a.acoes_execucao[acaoIndex]) {
        a.acoes_execucao[acaoIndex].anexoUrl = null;
        a.acoes_execucao[acaoIndex].anexoNome = null;
        window.atualizarInlineFirestore(a);
    }
}
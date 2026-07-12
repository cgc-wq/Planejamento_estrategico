import { state, ADMIN_EMAIL, PERSPECTIVAS, SWOT_DATA, STATUS_CHIPS, STATUS_LABELS } from './data.js';
import { escapeHTML } from './utils.js';

export function renderObjetivosEstrategicos() {
    const c = document.getElementById('objetivos-content');
    if (!c) return;

    const isAdmin = (state.currentUser && state.currentUser.email === ADMIN_EMAIL);
    let html = '';

    Object.entries(PERSPECTIVAS).forEach(([key, p]) => {
        
        if (isAdmin) {
            html += `<div class="section-title" style="color:${p.cor}; display:flex; align-items:center; gap:8px;">
                <span id="persp-label-${key}">${p.icon} ${p.nome}</span>
                <button class="btn-edit-nome" title="Editar nome da perspectiva" onclick="window.iniciarEdicaoNome('persp_${key}', '${escapeHTML(p.nome)}', this)">✏️</button>
            </div>`;
        } else {
            html += `<div class="section-title" style="color:${p.cor};">${p.icon} ${p.nome}</div>`;
        }

        html += `<div class="grid-2" style="margin-bottom: 24px;">`;

        p.objetivos.forEach(obj => {
            const data = state.objetivosGlobais[obj.id] || { indicador: '', meta: '', resultado: '' };
            const indicadorSafe = escapeHTML(data.indicador);
            const metaVal = parseFloat(data.meta) || 0, resVal = parseFloat(data.resultado) || 0;
            let pct = metaVal > 0 ? Math.min(100, Math.round((resVal / metaVal) * 100)) : 0;
            const barColor = pct >= 80 ? '#1BA05B' : pct >= 50 ? '#E8A020' : '#C0392B';

            html += `<div class="card" style="border-left: 4px solid ${p.cor}; padding:18px;">`;

            // Nome do objetivo com botão de edição para admin
            if (isAdmin) {
                html += `<div style="font-size:13px; font-weight:700; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                    <span id="obj-label-${obj.id}">${obj.id} — ${obj.nome}</span>
                    <button class="btn-edit-nome" title="Editar nome do objetivo" onclick="window.iniciarEdicaoNome('obj_${obj.id}', '${escapeHTML(obj.nome).replace(/'/g, "\\'")}', this)">✏️</button>
                </div>`;
            } else {
                html += `<div style="font-size:13px; font-weight:700; margin-bottom:12px;">${obj.id} — ${obj.nome}</div>`;
            }

            if (isAdmin) {
                html += `
          <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px; font-size:11px;">
            <div><label style="display:block; font-weight:700; color:var(--texto-sec); margin-bottom:2px; text-transform:uppercase;">Indicador</label><input type="text" id="obj-ind-${obj.id}" value="${indicadorSafe}" placeholder="Nome do indicador geral..." style="width:100%; padding:6px 8px; border:1px solid var(--cinza-borda); border-radius:6px; font-family:'Sora',sans-serif;"></div>
            <div style="display:flex; gap:10px;">
               <div style="flex:1;"><label style="display:block; font-weight:700; color:var(--texto-sec); margin-bottom:2px; text-transform:uppercase;">Meta</label><input type="number" id="obj-meta-${obj.id}" value="${data.meta || ''}" style="width:100%; padding:6px 8px; border:1px solid var(--cinza-borda); border-radius:6px;"></div>
               <div style="flex:1;"><label style="display:block; font-weight:700; color:var(--texto-sec); margin-bottom:2px; text-transform:uppercase;">Resultado</label><input type="number" id="obj-res-${obj.id}" value="${data.resultado || ''}" style="width:100%; padding:6px 8px; border:1px solid var(--cinza-borda); border-radius:6px;"></div>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 14px;">
            <div style="flex:1;"><div class="progress-track" style="height:6px; background:#e0e0e0;"><div class="progress-fill" style="width:${pct}%;background:${barColor};"></div></div></div>
            <button id="btn-salvar-obj-${obj.id}" class="btn btn-primary btn-sm" onclick="window.salvarObjetivoEstrategico('${obj.id}')">Salvar</button>
          </div>
        `;
            } else {
                html += `<div style="display:flex; flex-direction:column; gap:4px; font-size:12px; margin-bottom:12px; color:var(--texto-sec);"><div><strong>Indicador:</strong> <span style="color:var(--texto);">${indicadorSafe || 'Aguardando definição'}</span></div><div><strong>Meta:</strong> <span style="color:var(--texto);">${data.meta || '0'}</span> | <strong>Atual:</strong> <span style="color:var(--texto);">${data.resultado || '0'}</span></div></div><div style="display:flex; align-items:center; gap:10px;"><div style="flex:1;"><div class="progress-track" style="height:8px; background:#e0e0e0;"><div class="progress-fill" style="width:${pct}%;background:${barColor};"></div></div></div><div style="font-weight:800; font-size:14px; color:${barColor};">${pct}%</div></div>`;
            }
            html += `</div>`;
        });
        html += `</div>`;
    });
    c.innerHTML = html;
}

export function renderMapa() {
    const container = document.getElementById('mapa-content');
    if (!container) return;

    // 1. Estrutura do Cabeçalho CFA (Missão, Visão, Valores) Centralizada
    let html = `
    <div class="bsc-mapa">
      <div class="bsc-header-institucional">
         <div style="width: 150px; height: 100px; background: var(--azul-cfa); color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; margin-bottom: 16px; text-transform:uppercase;">Sistema CFA/CRAs</div>
         
         <div class="card p-cfa" style="border-top: 4px solid var(--azul-cfa); padding: 24px; max-width: 600px; margin-bottom: 20px;">
           <div class="bsc-institucional-label" style="font-size: 14px; font-weight: 800; color:var(--azul-cfa); text-transform:uppercase; margin-bottom:10px;">Missão Sistema CFA/CRAs</div>
           <p style="font-size: 13px; font-weight: 500; line-height:1.6;">"fiscalizar, valorizar e promover o exercício do profissional de administração, contribuindo com o desenvolvimento do país."</p>
         </div>

         <div class="bsc-institucional-cards" style="width: 100%; max-width: 1000px;">
           <div class="card p-cfa" style="border-top: 4px solid var(--azul-mid); flex:1; border-color:#6B3FA0;">
             <div class="bsc-institucional-label" style="font-size:12px;font-weight:700;color:#6B3FA0;text-transform:uppercase;margin-bottom:6px;">Visão</div>
             <p style="font-size: 12px;">"ser uma entidade reconhecida pela sociedade, capaz de assegurar a atuação plena dos profissionais de administração."</p>
           </div>
           <div class="card p-cfa" style="border-top: 4px solid var(--amarelo); flex:1;">
             <div class="bsc-institucional-label" style="font-size:12px;font-weight:700;color:#E67E22;text-transform:uppercase;margin-bottom:6px;">Valores</div>
             <p style="font-size: 12px;">Ética, Inovação, Valorização da profissão, Sustentabilidade e Transparência.</p>
           </div>
         </div>
         
         <div class="bsc-conector-central"></div>
      </div>

      <div class="bsc-perpectivas-container">`;

    // Vamos iterar pelas perspectivas na ordem: Base -> Topo (Causa -> Efeito)
    // Ordem: Sustentabilidade -> Processos -> Clientes -> Financeira
    const ordemBscValores = ['sustentabilidade', 'processos', 'clientes', 'financeiro'];

    ordemBscValores.forEach((key, idx) => {
        const p = PERSPECTIVAS[key];
        const eBase = (idx === ordemBscValores.length - 1); // Última perspectiva (topo) não tem conector vertical

        html += `
        <div class="bsc-zona-perspectiva ${p.classe}">
          
          <div class="bsc-zona-header" style="background:${p.bg}; border-color:${p.cor}; color:${p.cor};">
            <span>${p.icon}</span> <span>${p.nome}</span>
          </div>

          <div class="bsc-objetivos-grid">`;

        // Ordena os objetivos pelo ID para ficarem na ordem correta
        const objetivosOrdenados = p.objetivos.sort((a, b) => a.id.localeCompare(b.id));

        objetivosOrdenados.forEach(obj => {
            html += `
              <div class="objetivo-card-bsc" style="border-top: 5px solid ${p.cor}; background:${p.bg};">
                <div class="objetivo-card-header" style="justify-content:space-between; align-items:flex-start;">
                   <span class="objetivo-card-title" style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--texto); line-height:1.4;">${obj.id} — ${window.escapeHTML(obj.nome)}</span>
                   <div style="display:flex; gap:6px; flex-shrink:0; align-items: center;">
                      ${obj.ods.map(o => {
                const n = o.replace(/\D/g, '').padStart(2, '0');
                return `<img src="./assets/ods/sdg_icon_${n}.png" alt="${o}" title="${o}" style="width:34px; height:34px; border-radius:4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`;
            }).join('')}
                   </div>
                </div>
              </div>`;
        });

        html += `
          </div>
          ${!eBase ? '<div class="bsc-conector-vertical"></div>' : ''}
        </div>`;
    });

    html += `
      </div>
    </div>`;

    container.innerHTML = html;
}

export function renderIndicadores() {
    const c = document.getElementById('indicadores-content');
    if (!c) return;

    const filtroEntidadeEl = document.getElementById('filtro-entidade-indicadores');
    const entidadeFiltro = filtroEntidadeEl ? filtroEntidadeEl.value : '';

    const filtroSetorEl = document.getElementById('filtro-setor-indicadores');
    const setorFiltro = (entidadeFiltro === 'CFA' && filtroSetorEl) ? filtroSetorEl.value : '';

    let viewLabel = entidadeFiltro ? `Visão filtrada: ${entidadeFiltro}` : `Visão consolidada de todas as unidades do Sistema CFA/CRAs.`;
    if (setorFiltro) {
        viewLabel += ` - ${setorFiltro}`;
    }

    let html = `<div style="margin-bottom: 20px;"><p style="font-size:13px; color:var(--texto-sec);">${viewLabel}</p></div>`;

    let todasAcoesGlobais = state.todasAcoes;
    if (entidadeFiltro) {
        todasAcoesGlobais = todasAcoesGlobais.filter(a => a.grupo === entidadeFiltro);
        if (setorFiltro) {
            todasAcoesGlobais = todasAcoesGlobais.filter(a => a.setor === setorFiltro);
        }
    }
    
    const totalProjetos = todasAcoesGlobais.length;
    const objetivosUnicos = new Set(todasAcoesGlobais.map(a => a.objetivo).filter(o => o)).size;
    const totalAcoesComIndicador = todasAcoesGlobais.filter(a => a.indicador && a.meta).length;

    html += `
    <div class="grid-3" style="margin-bottom: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <div class="card" style="text-align:center; padding: 20px; border-top: 4px solid var(--azul-cfa);">
            <div style="font-size:32px; font-weight:900; color:var(--azul-cfa);">${totalProjetos}</div>
            <div style="font-size:12px; font-weight:700; color:var(--texto-sec); text-transform:uppercase; margin-top:8px;">Total de Projetos/Atividades</div>
        </div>
        <div class="card" style="text-align:center; padding: 20px; border-top: 4px solid var(--azul-mid);">
            <div style="font-size:32px; font-weight:900; color:var(--azul-mid);">${objetivosUnicos}</div>
            <div style="font-size:12px; font-weight:700; color:var(--texto-sec); text-transform:uppercase; margin-top:8px;">Objetivos Estratégicos Trabalhados</div>
        </div>
        <div class="card" style="text-align:center; padding: 20px; border-top: 4px solid var(--verde);">
            <div style="font-size:32px; font-weight:900; color:var(--verde);">${totalAcoesComIndicador}</div>
            <div style="font-size:12px; font-weight:700; color:var(--texto-sec); text-transform:uppercase; margin-top:8px;">Indicadores com Metas</div>
        </div>
    </div>
    `;
    html += Object.entries(PERSPECTIVAS).map(([key, p]) => {
        let acoesPersp = state.todasAcoes.filter(a => a.perspectiva === key && a.indicador && a.meta);
        if (entidadeFiltro) {
            acoesPersp = acoesPersp.filter(a => a.grupo === entidadeFiltro);
            if (setorFiltro) {
                acoesPersp = acoesPersp.filter(a => a.setor === setorFiltro);
            }
        }
        const avgPersp = acoesPersp.length > 0 ? Math.round(acoesPersp.reduce((s, a) => s + (a.execucao || 0), 0) / acoesPersp.length) : 0;

        let perspCard = `<div class="section-title">${p.icon} ${p.nome}</div><div class="card" style="margin-bottom:20px;"><div style="display:flex;align-items:center;gap:16px;padding-bottom:14px;border-bottom:1px solid var(--cinza-borda);margin-bottom:14px;"><div><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--texto-sec);">Execução Média (Geral)</div><div style="font-size:28px;font-family:'Playfair Display',serif;font-weight:900;color:${p.cor};">${avgPersp}%</div></div><div style="flex:1;"><div class="progress-track" style="height:12px;"><div class="progress-fill" style="width:${avgPersp}%;background:${p.cor};height:12px;"></div></div></div></div>`;

        if (acoesPersp.length === 0) return perspCard + `<div style="font-size:12px;color:var(--texto-sec);padding:8px 0;">Nenhum indicador com meta definida nesta perspectiva.</div></div>`;

        p.objetivos.forEach(obj => {
            const acoesObj = acoesPersp.filter(a => a.objetivo === obj.id);
            if (acoesObj.length > 0) {
                const avgObj = Math.round(acoesObj.reduce((s, a) => s + (a.execucao || 0), 0) / acoesObj.length);
                let projetosHTML = acoesObj.map(a => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 0; border-top: 1px solid rgba(0,0,0,0.05); margin-top: 8px;">
                        <div style="flex:1;">
                            <div style="font-size:11px; font-weight:700; color:var(--texto);">${escapeHTML(a.nome)} <span style="font-size:9px; color:var(--texto-sec); background:var(--cinza-borda); padding:2px 4px; border-radius:4px; margin-left:4px;">${escapeHTML(a.unidade)}</span></div>
                            <div style="font-size:10px; color:var(--texto-sec); margin-top:2px;">Indicador: ${escapeHTML(a.indicador)} | Meta: ${a.meta} | Resultado: ${a.resultado}</div>
                        </div>
                        <div style="font-size:11px; font-weight:800; color:${p.cor};">${a.execucao || 0}%</div>
                    </div>
                `).join('');
                
                perspCard += `<div style="margin-top: 16px; background: var(--cinza-bg); border-radius: 8px; padding: 12px;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;"><div style="font-size:12px; font-weight:700; color:var(--azul-cfa);">${obj.id} - ${escapeHTML(obj.nome)}</div><div style="font-size:11px; font-weight:800; color:${p.cor};">Média: ${avgObj}%</div></div><div class="progress-track" style="height:6px; margin-bottom: 0;"><div class="progress-fill" style="width:${avgObj}%;background:${p.cor};"></div></div>${projetosHTML}</div>`;
            }
        });
        return perspCard + `</div>`;
    }).join('');
    c.innerHTML = html;
}

export function renderSWOT() {
    const isAdmin = (state.currentUser && state.currentUser.email === ADMIN_EMAIL);
    
    const renderList = (containerId, tipoSwot, items) => {
        const el = document.getElementById(containerId);
        if (!el) return;
        
        let html = '';
        
        // Usa itens customizados se existirem, senão usa os padrões
        const itemsToRender = state.swotItems && state.swotItems[tipoSwot] && state.swotItems[tipoSwot].length > 0 
            ? state.swotItems[tipoSwot] 
            : items.map((desc, idx) => ({ id: null, descricao: desc, posicao: idx + 1 }));
        
        itemsToRender.forEach((item, idx) => {
            const itemId = item.id != null && item.id !== '' ? String(item.id) : null;
            const descricao = item.descricao || item;
            
            if (isAdmin && itemId) {
                html += `<li style="display:flex; align-items:flex-start; gap:8px; margin-bottom:8px;">
                    <span style="flex-shrink:0; margin-top:2px;"></span>
                    <div style="flex:1;">
                        <div id="swot-text-${tipoSwot}-${itemId}" style="word-break: break-word;">${escapeHTML(descricao)}</div>
                        <div id="swot-edit-${tipoSwot}-${itemId}" style="display:none; gap:8px; align-items:flex-start; margin-top:6px;">
                            <textarea id="swot-input-${tipoSwot}-${itemId}" style="flex:1; padding:8px; border:2px solid var(--azul-cfa); border-radius:6px; font-family:'Sora',sans-serif; font-size:13px; resize:vertical; min-height:60px;">${escapeHTML(descricao)}</textarea>
                            <div style="display:flex; gap:6px; flex-shrink:0;">
                                <button class="btn btn-primary btn-sm" style="font-size:11px; padding:6px 12px;" onclick="window.salvarItemSwotInline('${tipoSwot}', '${itemId}')">✓</button>
                                <button class="btn btn-sm" style="font-size:11px; padding:6px 12px; background:#f0f0f0; border:1px solid var(--cinza-borda); border-radius:6px; cursor:pointer;" onclick="window.cancelarEdicaoSwot('${tipoSwot}', '${itemId}')">✕</button>
                            </div>
                        </div>
                    </div>
                    <button class="btn-edit-nome" title="Editar item" onclick="window.iniciarEdicaoSwot('${tipoSwot}', '${itemId}')" style="flex-shrink:0; margin-top:0;">✏️</button>
                    <button class="btn-edit-nome" title="Remover item" onclick="window.removerItemSwot('${tipoSwot}', '${itemId}')" style="flex-shrink:0; margin-top:0; color:#c0392b;">🗑️</button>
                </li>`;
            } else if (isAdmin) {
                html += `<li style="display:flex; align-items:flex-start; gap:8px; margin-bottom:8px;">
                    <span style="flex-shrink:0; margin-top:2px;"></span>
                    <div style="flex:1; color:var(--texto-sec); font-size:12px;">${escapeHTML(descricao)}</div>
                </li>`;
            } else {
                html += `<li><span></span>${escapeHTML(descricao)}</li>`;
            }
        });
        
        // Adiciona botão para novo item se for admin
        if (isAdmin) {
            html += `<li style="margin-top:12px; padding-top:12px; border-top:1px solid var(--cinza-borda);">
                <button class="btn btn-sm btn-primary" style="width:100%;" onclick="window.abrirModalSwot('${tipoSwot}')">+ Adicionar item</button>
            </li>`;
        }
        
        el.innerHTML = html;
    };
    
    renderList('swot-forcas', 'forcas', SWOT_DATA.forcas);
    renderList('swot-fraquezas', 'fraquezas', SWOT_DATA.fraquezas);
    renderList('swot-oport', 'oportunidades', SWOT_DATA.oportunidades);
    renderList('swot-ameacas', 'ameacas', SWOT_DATA.ameacas);
}

export function renderRelatorio() {
    const total = state.acoes.length;
    const pct = total > 0 ? Math.round(state.acoes.reduce((s, a) => s + (a.execucao || 0), 0) / total) : 0;
    const c = document.getElementById('relatorio-content');
    if (!c) return;

    c.innerHTML = `
    <div class="card" style="margin-bottom:20px; padding:28px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--texto-sec);letter-spacing:1px;margin-bottom:12px;">Relatório de Execução Local</div>
      <div class="grid-4" style="margin-bottom:24px;">
        <div style="text-align:center;"><div style="font-size:40px;font-family:'Playfair Display',serif;font-weight:900;color:var(--azul-cfa);">${total}</div><div style="font-size:12px;color:var(--texto-sec);">Projetos Totais</div></div>
        <div style="text-align:center;"><div style="font-size:40px;font-family:'Playfair Display',serif;font-weight:900;color:var(--verde);">${state.acoes.filter(a => a.status === 'concluido').length}</div><div style="font-size:12px;color:var(--texto-sec);">Concluídos</div></div>
        <div style="text-align:center;"><div style="font-size:40px;font-family:'Playfair Display',serif;font-weight:900;color:var(--azul-mid);">${state.acoes.filter(a => a.status === 'em_andamento').length}</div><div style="font-size:12px;color:var(--texto-sec);">Em Andamento</div></div>
        <div style="text-align:center;"><div style="font-size:40px;font-family:'Playfair Display',serif;font-weight:900;color:var(--amarelo);">${pct}%</div><div style="font-size:12px;color:var(--texto-sec);">Execução Média</div></div>
      </div>
      ${Object.entries(PERSPECTIVAS).map(([key, p]) => {
        const as = state.acoes.filter(a => a.perspectiva === key);
        const avg = as.length > 0 ? Math.round(as.reduce((s, a) => s + (a.execucao || 0), 0) / as.length) : 0;
        return `
        <div style="margin-bottom:20px;">
          <div style="font-size:14px;font-weight:800;color:${p.cor};margin-bottom:10px;">${p.icon} ${p.nome}</div>
          <div style="display:flex;gap:16px;margin-bottom:8px;font-size:12px;color:var(--texto-sec);"><span><strong>${as.length}</strong> projetos</span><span><strong style="color:${p.cor};">${avg}%</strong> execução média</span></div>
          <div class="progress-track" style="height:10px;"><div class="progress-fill" style="width:${avg}%;background:${p.cor};height:10px;"></div></div>
          ${as.length > 0 ? `<table style="width:100%;font-size:12px;margin-top:10px;border-collapse:collapse;">
            ${as.map(a => `<tr style="border-bottom:1px solid var(--cinza-borda);"><td style="padding:6px 8px;">${a.objetivo}</td><td style="padding:6px 8px;font-weight:600;">${escapeHTML(a.nome)}</td><td style="padding:6px 8px;"><span class="chip ${STATUS_CHIPS[a.status]}">${STATUS_LABELS[a.status]}</span></td><td style="padding:6px 8px;font-weight:700;color:${p.cor};">${a.execucao || 0}%</td></tr>`).join('')}
          </table>` : '<div style="font-size:12px;color:var(--texto-sec);padding:8px;">Nenhum registro.</div>'}
        </div>`;
    }).join('')}
    </div>`;
}
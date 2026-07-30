import { state, PERSPECTIVAS, INSTITUCIONAL } from './data.js';
import { animateCounter, escapeHTML } from './utils.js';

let filtroPerspectivaAtual = '';

export function updateDashboard() {
    const total = state.acoes.length;
    const concluidas = state.acoes.filter(a => a.status === 'concluido').length;
    const pct = total > 0 ? Math.round(state.acoes.reduce((s, a) => s + (a.execucao || 0), 0) / total) : 0;

    const heroMissaoEl = document.getElementById('hero-missao-text');
    if (heroMissaoEl) heroMissaoEl.textContent = INSTITUCIONAL.missao;

    animateCounter('stat-total-acoes', total);
    animateCounter('stat-concluidas', concluidas);
    const percEl = document.getElementById('stat-perc');
    if (percEl) percEl.textContent = pct + '%';

    const kpiEl = document.getElementById('kpi-perspectivas');
    if (kpiEl) {
        kpiEl.innerHTML = Object.entries(PERSPECTIVAS).map(([key, p]) => {
            const as = state.acoes.filter(a => a.perspectiva === key);
            const done = as.filter(a => a.status === 'concluido').length;
            const avgPct = as.length > 0 ? Math.round(as.reduce((s, a) => s + (a.execucao || 0), 0) / as.length) : 0;
            return `
      <div class="card ${p.classe}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div class="card-title" style="color:var(--pc);">${p.icon} ${['sustentabilidade', 'clientes', 'processos', 'financeiro'][['sustentabilidade', 'clientes', 'processos', 'financeiro'].indexOf(key)]}</div>
          <div class="p-tag" style="font-size:10px;"><span class="p-dot"></span>${p.nome.split('/')[0].split('(')[0].trim()}</div>
        </div>
        <div class="kpi-value" style="color:var(--pc);font-size:28px;">${as.length}</div>
        <div class="kpi-label">Meus Projetos</div>
        <div class="kpi-sub">${done} concluídos · ${avgPct}% execução</div>
        <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${avgPct}%;background:var(--pc);"></div></div>
      </div>`;
        }).join('');
    }

    // ==========================================
    // CÁLCULO E RENDERIZAÇÃO DOS OBJETIVOS DO BSC
    // ==========================================
    // Calcula métricas de TODOS os objetivos (para o diagnóstico)
    let totalMetasCalculadas = 0;
    let somaPctObjetivos = 0;
    Object.entries(PERSPECTIVAS).forEach(([kPersp, p]) => {
        p.objetivos.forEach(obj => {
            const data = state.objetivosGlobais[obj.id] || { meta: '', resultado: '' };
            const metaVal = parseFloat(data.meta) || 0;
            const resVal = parseFloat(data.resultado) || 0;
            let pct = metaVal > 0 ? Math.min(100, Math.round((resVal / metaVal) * 100)) : 0;
            if (metaVal > 0) { totalMetasCalculadas++; somaPctObjetivos += pct; }
        });
    });

    // Renderiza a lista (com filtro aplicado)
    renderObjetivosList();

    // ==========================================
    // DIAGNÓSTICO DO SISTEMA (3 PERGUNTAS)
    // ==========================================
    const totalAcoesTodos = state.todasAcoes.length;
    const pctGeral = totalAcoesTodos > 0 ? Math.round(state.todasAcoes.reduce((s, a) => s + (a.execucao || 0), 0) / totalAcoesTodos) : 0;
    const pctObjetivos = totalMetasCalculadas > 0 ? Math.round(somaPctObjetivos / totalMetasCalculadas) : 0;

    // Resposta 1: Como está o desempenho geral?
    const dgEl = document.getElementById('diagnostico-desempenho-geral');
    if (dgEl) {
        let statusDesempenho = '';
        let textDesempenho = '';
        let corDesempenho = '';

        if (totalAcoesTodos === 0) {
            statusDesempenho = 'Sem Dados';
            corDesempenho = 'var(--texto-sec)';
            textDesempenho = 'Nenhum projeto cadastrado no sistema ainda.';
        } else {
            const mediaCombinada = totalMetasCalculadas > 0 ? Math.round((pctGeral + pctObjetivos) / 2) : pctGeral;

            if (mediaCombinada >= 85) {
                statusDesempenho = 'Excelente';
                corDesempenho = 'var(--verde)';
                textDesempenho = 'As metas estratégicas e a execução física dos projetos estão avançando de forma exemplar.';
            } else if (mediaCombinada >= 50) {
                statusDesempenho = 'Regular';
                corDesempenho = 'var(--amarelo)';
                textDesempenho = 'O progresso é estável, mas requer atenção gerencial para acelerar entregas pendentes.';
            } else {
                statusDesempenho = 'Crítico';
                corDesempenho = 'var(--vermelho)';
                textDesempenho = 'Alerta vermelho. O ritmo de execução dos projetos e o atingimento de metas estão abaixo do esperado.';
            }
        }

        dgEl.innerHTML = `
            O desempenho geral está avaliado como <strong style="color: ${corDesempenho}; text-transform: uppercase; font-weight: 800;">${statusDesempenho}</strong>.<br>
            <div style="font-size: 11px; margin-top: 6px; color: var(--texto-sec);">
                • Execução física média dos <strong>${totalAcoesTodos}</strong> projetos cadastrados: <strong>${pctGeral}%</strong>.<br>
                • Alcance médio das metas gerais do BSC: <strong>${pctObjetivos}%</strong> (em <strong>${totalMetasCalculadas}</strong> objetivos com metas).
            </div>
            <div style="font-size: 11px; margin-top: 8px; font-style: italic; color: var(--texto-sec); border-top: 1px dashed var(--cinza-borda); padding-top: 6px;">
                💡 ${textDesempenho}
            </div>
        `;
    }

    // Resposta 2: Qual projeto dentro de SA está atrasado?
    const saEl = document.getElementById('diagnostico-sa-atrasado');
    if (saEl) {
        const hoje = new Date().toISOString().split('T')[0];
        const saProjetos = state.todasAcoes.filter(a => a.perspectiva === 'sustentabilidade');
        
        if (saProjetos.length === 0) {
            saEl.innerHTML = `🌿 <em>Nenhum projeto de Sustentabilidade Social e Ambiental (SA) cadastrado.</em>`;
        } else {
            const saAtrasados = saProjetos.filter(a => 
                a.status !== 'concluido' && 
                a.prazo && 
                a.prazo < hoje
            );

            if (saAtrasados.length === 0) {
                saEl.innerHTML = `🌿 <strong style="color: var(--verde);">Tudo em dia!</strong> Nenhum projeto em Sustentabilidade Social e Ambiental (SA) está com prazo atrasado.`;
            } else {
                let listHtml = `<span style="font-weight: 700; color: var(--vermelho);">Atenção! Temos ${saAtrasados.length} projeto(s) atrasados:</span><br>`;
                listHtml += `<ul style="margin-left: 16px; margin-top: 6px; font-size: 11px; display: flex; flex-direction: column; gap: 4px;">`;
                saAtrasados.forEach(a => {
                    const prazoFormatado = a.prazo ? a.prazo.split('-').reverse().join('/') : 'S/ prazo';
                    listHtml += `<li><strong>${escapeHTML(a.nome)}</strong> (Prazo: ${prazoFormatado} · Executado: ${a.execucao}% · Unidade: ${escapeHTML(a.unidade)})</li>`;
                });
                listHtml += `</ul>`;
                saEl.innerHTML = listHtml;
            }
        }
    }

    // Resposta 3: Quais os 3 melhores projetos em toda a organização?
    const topEl = document.getElementById('diagnostico-top-projetos');
    if (topEl) {
        if (totalAcoesTodos === 0) {
            topEl.innerHTML = `🏆 <em>Nenhum projeto cadastrado para ranqueamento.</em>`;
        } else {
            const topProjetos = [...state.todasAcoes]
                .sort((a, b) => (b.execucao || 0) - (a.execucao || 0))
                .slice(0, 3);

            let topHtml = `<ol style="margin-left: 16px; font-size: 11px; display: flex; flex-direction: column; gap: 6px;">`;
            topProjetos.forEach((a, idx) => {
                const medalhas = ['🥇', '🥈', '🥉'];
                topHtml += `
                <li>
                    ${medalhas[idx]} <strong>${escapeHTML(a.nome)}</strong><br>
                    <span style="color: var(--texto-sec); padding-left: 20px;">
                        Progresso: <strong style="color: var(--verde);">${a.execucao || 0}%</strong> | Unidade: ${escapeHTML(a.unidade)}
                    </span>
                </li>`;
            });
            topHtml += `</ol>`;
            topEl.innerHTML = topHtml;
        }
    }

    setObjetivosView(state.objetivosView || 'lista');

    setTimeout(() => {
        if (document.getElementById('page-dashboard').classList.contains('active')) {
            window.renderCharts();
        }
    }, 100);
}

export function renderCharts() {
    const wrapP = document.getElementById('wrap-chart-persp');
    const wrapS = document.getElementById('wrap-chart-status');
    if (!wrapP || !wrapS) return;

    wrapP.innerHTML = '<canvas id="chartPersp"></canvas>';
    wrapS.innerHTML = '<canvas id="chartStatus"></canvas>';

    const ctxP = document.getElementById('chartPersp');
    const ctxS = document.getElementById('chartStatus');

    const labelsP = ['Sust. S/A', 'Dev. Inst.', 'Clientes', 'Financeira'];
    const colorsGasto = ['#6B3FA0', '#1756B8', '#C0392B', '#1BA05B'];

    let orcamentos = [0, 0, 0, 0];
    let gastos = [0, 0, 0, 0];
    let temFinanceiro = false;

    state.acoes.forEach(a => {
        const idx = Object.keys(PERSPECTIVAS).indexOf(a.perspectiva);
        if (idx > -1) {
            if (a.orcamento > 0) {
                orcamentos[idx] += parseFloat(a.orcamento);
                temFinanceiro = true;
            }

            let gastoR = 0;
            if (a.acoes_execucao) {
                a.acoes_execucao.forEach(sub => { if (sub.custo_tipo === 'monetario') gastoR += (sub.custo_valor || 0); });
            }
            if (a.entregas_periodicas) {
                Object.values(a.entregas_periodicas).forEach(ent => { if (ent.custo_tipo === 'monetario') gastoR += (ent.custo_valor || 0); });
            }

            if (gastoR > 0) {
                gastos[idx] += gastoR;
                temFinanceiro = true;
            }
        }
    });

    let titleP = "Orçamento x Gasto por Perspectiva (R$)";
    let chartConfig = {};

    if (!temFinanceiro) {
        titleP = "Projetos por Perspectiva (Qtd)";
        let dataP = Object.keys(PERSPECTIVAS).map(k => state.acoes.filter(a => a.perspectiva === k).length);
        chartConfig = {
            type: 'doughnut',
            data: {
                labels: labelsP,
                datasets: [{ data: dataP, backgroundColor: colorsGasto, borderWidth: 3, borderColor: '#fff' }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { font: { family: 'Sora', size: 11 } } } }
            }
        };
    } else {
        chartConfig = {
            type: 'bar',
            data: {
                labels: labelsP,
                datasets: [
                    { label: 'Orçado (R$)', data: orcamentos, backgroundColor: '#E0E0E0', borderRadius: 4 },
                    { label: 'Gasto Real (R$)', data: gastos, backgroundColor: colorsGasto, borderRadius: 4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { family: 'Sora', size: 11 } } },
                    tooltip: { callbacks: { label: (ctx) => ' R$ ' + ctx.raw.toLocaleString('pt-BR') } }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { font: { family: 'DM Mono', size: 10 } } },
                    x: { ticks: { font: { family: 'Sora', size: 10 } } }
                }
            }
        };
    }

    const cardTitle = ctxP.closest('.card').querySelector('.card-title');
    if (cardTitle) cardTitle.textContent = titleP;

    state.chartPerspInstance = new Chart(ctxP, chartConfig);

    const statusCounts = ['nao_iniciado', 'em_andamento', 'concluido', 'pausado'].map(s => state.acoes.filter(a => a.status === s).length);
    const cardTitleStatus = ctxS.closest('.card').querySelector('.card-title');
    if (cardTitleStatus) cardTitleStatus.textContent = "Projetos por Status";

    state.chartStatusInstance = new Chart(ctxS, {
        type: 'bar',
        data: {
            labels: ['Não Iniciado', 'Em Andamento', 'Concluído', 'Pausado'],
            datasets: [{ label: 'Projetos', data: statusCounts, backgroundColor: ['#FFB74D', '#4FC3F7', '#81C784', '#BA68C8'], borderRadius: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'DM Mono', size: 11 } } }, x: { ticks: { font: { family: 'Sora', size: 11 } } } } }
    });
}

export function setObjetivosView(view) {
    state.objetivosView = view;
    const listEl = document.getElementById('dashboard-objetivos-lista');
    const wrapEl = document.getElementById('dashboard-objetivos-grafico-wrap');
    const btnLista = document.getElementById('btn-view-lista');
    const btnGrafico = document.getElementById('btn-view-grafico');

    if (!listEl || !wrapEl || !btnLista || !btnGrafico) return;

    if (view === 'lista') {
        listEl.style.display = 'flex';
        wrapEl.style.display = 'none';
        btnLista.className = 'btn btn-sm btn-primary';
        btnGrafico.className = 'btn btn-sm btn-secondary';
    } else {
        listEl.style.display = 'none';
        wrapEl.style.display = 'block';
        btnLista.className = 'btn btn-sm btn-secondary';
        btnGrafico.className = 'btn btn-sm btn-primary';
        renderObjetivosChart();
    }
}

// Renderiza a lista de objetivos respeitando o filtro de perspectiva
function renderObjetivosList() {
    const objListaEl = document.getElementById('dashboard-objetivos-lista');
    if (!objListaEl) return;

    let objHtml = '';
    Object.entries(PERSPECTIVAS).forEach(([kPersp, p]) => {
        if (filtroPerspectivaAtual && kPersp !== filtroPerspectivaAtual) return;
        p.objetivos.forEach(obj => {
            const data = state.objetivosGlobais[obj.id] || { indicador: '', meta: '', resultado: '' };
            const metaVal = parseFloat(data.meta) || 0;
            const resVal = parseFloat(data.resultado) || 0;
            let pct = metaVal > 0 ? Math.min(100, Math.round((resVal / metaVal) * 100)) : 0;
            const barColor = pct >= 80 ? 'var(--verde)' : pct >= 50 ? 'var(--amarelo)' : 'var(--vermelho)';
            objHtml += `
            <div style="background: white; border: 1px solid var(--cinza-borda); border-radius: var(--radius-sm); padding: 12px; border-left: 5px solid ${p.cor}; transition: transform 0.2s, box-shadow 0.2s;" class="objetivo-item-hover">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; gap: 8px;">
                    <span style="font-size: 11px; font-weight: 700; color: var(--texto); line-height: 1.3;">${obj.id} — ${obj.nome}</span>
                    <span style="font-size: 11px; font-weight: 800; color: ${barColor}; flex-shrink: 0; background: ${p.bg}; padding: 2px 6px; border-radius: 4px;">${pct}%</span>
                </div>
                <div style="font-size: 10px; color: var(--texto-sec); margin-bottom: 8px;">
                    <strong>Indicador:</strong> ${data.indicador ? escapeHTML(data.indicador) : 'Não definido'} | 
                    <strong>Meta:</strong> ${data.meta || '0'} | 
                    <strong>Atual:</strong> ${data.resultado || '0'}
                </div>
                <div class="progress-track" style="height: 5px; margin: 0; background: var(--cinza-borda);">
                    <div class="progress-fill" style="width: ${pct}%; background: ${barColor}; height: 100%;"></div>
                </div>
            </div>`;
        });
    });
    objListaEl.innerHTML = objHtml || '<p style="font-size:12px; color:var(--texto-sec);">Nenhum objetivo encontrado para esta perspectiva.</p>';
}

// Filtra os objetivos por perspectiva e atualiza os botões
export function filtrarObjetivosPorPerspectiva(kPersp) {
    filtroPerspectivaAtual = kPersp;

    // Cores ativas e inativas de cada botão
    const config = {
        '':                 { ativo: { bg: 'var(--azul-cfa)', color: 'white', border: 'var(--azul-cfa)' },   inativo: { bg: 'white', color: 'var(--azul-cfa)', border: 'var(--azul-cfa)' } },
        'sustentabilidade': { ativo: { bg: '#6B3FA0', color: 'white', border: '#6B3FA0' },                  inativo: { bg: 'white', color: '#6B3FA0', border: '#6B3FA0' } },
        'processos':        { ativo: { bg: '#1BA05B', color: 'white', border: '#1BA05B' },                  inativo: { bg: 'white', color: '#1BA05B', border: '#1BA05B' } },
        'clientes':         { ativo: { bg: '#E67E22', color: 'white', border: '#E67E22' },                  inativo: { bg: 'white', color: '#E67E22', border: '#E67E22' } },
        'financeiro':       { ativo: { bg: '#A04000', color: 'white', border: '#A04000' },                  inativo: { bg: 'white', color: '#A04000', border: '#A04000' } }
    };

    Object.keys(config).forEach(p => {
        const btnId = p === '' ? 'btn-filtro-obj-all' : `btn-filtro-obj-${p}`;
        const btn = document.getElementById(btnId);
        if (!btn) return;
        const c = (p === kPersp) ? config[p].ativo : config[p].inativo;
        btn.style.background = c.bg;
        btn.style.color = c.color;
        btn.style.border = `2px solid ${c.border}`;
    });

    // Re-renderiza a view atual
    if (state.objetivosView === 'grafico') {
        renderObjetivosChart();
    } else {
        renderObjetivosList();
    }
}

function renderObjetivosChart() {
    const wrapEl = document.getElementById('dashboard-objetivos-grafico-wrap');
    if (!wrapEl) return;
    
    wrapEl.innerHTML = '<canvas id="chartObjetivos"></canvas>';
    const ctx = document.getElementById('chartObjetivos');
    if (!ctx) return;

    const labels = [];
    const percentages = [];
    const colors = [];

    Object.entries(PERSPECTIVAS).forEach(([kPersp, p]) => {
        if (filtroPerspectivaAtual && kPersp !== filtroPerspectivaAtual) return;
        p.objetivos.forEach(obj => {
            const data = state.objetivosGlobais[obj.id] || { meta: '', resultado: '' };
            const metaVal = parseFloat(data.meta) || 0;
            const resVal = parseFloat(data.resultado) || 0;
            let pct = metaVal > 0 ? Math.min(100, Math.round((resVal / metaVal) * 100)) : 0;
            
            labels.push(obj.id);
            percentages.push(pct);
            
            const barColor = pct >= 80 ? '#1BA05B' : pct >= 50 ? '#E8A020' : '#C0392B';
            colors.push(barColor);
        });
    });

    state.chartObjetivosInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Reach (%)',
                data: percentages,
                backgroundColor: colors,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` Alcance: ${ctx.raw}%`,
                        title: (items) => {
                            const objId = items[0].label;
                            let fullTitle = objId;
                            Object.values(PERSPECTIVAS).forEach(p => {
                                const found = p.objetivos.find(o => o.id === objId);
                                if (found) fullTitle = `${objId} — ${found.nome}`;
                            });
                            return fullTitle;
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: 0,
                    max: 100,
                    ticks: {
                        font: { family: 'DM Mono', size: 9 },
                        stepSize: 20
                    }
                },
                y: {
                    ticks: {
                        font: { family: 'Sora', size: 10, weight: 'bold' }
                    }
                }
            }
        }
    });
}
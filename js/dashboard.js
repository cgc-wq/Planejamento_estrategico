import { state, PERSPECTIVAS } from './data.js';
import { animateCounter } from './utils.js';

export function updateDashboard() {
    const total = state.acoes.length;
    const concluidas = state.acoes.filter(a => a.status === 'concluido').length;
    const pct = total > 0 ? Math.round(state.acoes.reduce((s, a) => s + (a.execucao || 0), 0) / total) : 0;

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
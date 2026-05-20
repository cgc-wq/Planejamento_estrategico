// js/router.js

export function showPage(page, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (page === 'admin') {
        if (window.renderAdminUsers) window.renderAdminUsers();
        if (window.renderAdminSolicitacoes) window.renderAdminSolicitacoes();
    }

    const targetPage = document.getElementById('page-' + page);
    if (targetPage) targetPage.classList.add('active');
    if (el) el.classList.add('active');

    // Gatilhos de renderização dependendo da aba
    if (page === 'dashboard' && window.updateDashboard) {
        window.updateDashboard();
    }
    if (page === 'objetivos' && window.renderObjetivosEstrategicos) window.renderObjetivosEstrategicos();
    if (page === 'indicadores' && window.renderIndicadores) window.renderIndicadores();
    if (page === 'relatorio' && window.renderRelatorio) window.renderRelatorio();

    return false;
}

export function showTab(id, el) {
    const parent = el.closest('.page') || document;
    parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    const targetTab = document.getElementById('tab-' + id);
    if (targetTab) targetTab.classList.add('active');
}
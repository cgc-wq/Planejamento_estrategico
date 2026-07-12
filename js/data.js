// js/data.js

export const ADMIN_EMAIL = 'cgc@cfa.org.br';

export const PERSPECTIVAS = {
    sustentabilidade: {
        nome: 'Sustentabilidade Social e Ambiental',
        cor: '#6B3FA0', // Roxo
        bg: '#F3EEF9', // Roxo claro
        classe: 'p-sustent',
        icon: '🌿',
        objetivos: [
            { id: 'SA1', nome: 'Estimular uso de energia solar no Sistema CFA/CRAs', ods: ['ODS 7'] },
            { id: 'SA2', nome: 'Desenvolver conscientização na internalização dos ODS e ESG', ods: ['ODS 4', 'ODS 8'] },
            { id: 'SA3', nome: 'Apoiar ações ESG na sociedade', ods: ['ODS 8', 'ODS 17'] },
            { id: 'SA4', nome: 'Disseminar ações de digitalização/virtualização', ods: ['ODS 12', 'ODS 13'] },
            { id: 'SA5', nome: 'Promover ações de economia circular', ods: ['ODS 12', 'ODS 13'] }
        ]
    },
    processos: {
        nome: 'Desenvolvimento Institucional / Processos Internos',
        cor: '#1BA05B', // Verde
        bg: '#E8F8F0', // Verde claro
        classe: 'p-processos',
        icon: '⚙️',
        objetivos: [
            { id: 'PI1', nome: 'Empreender nivelamento de transformação digital e padronização de processos entre o CFA e os CRAs', ods: ['ODS 16'] },
            { id: 'PI2', nome: 'Orientar o gerenciamento dos processos nos Conselhos Regionais', ods: ['ODS 16'] },
            { id: 'PI3', nome: 'Capacitar colaboradores e conselheiros', ods: ['ODS 4'] },
            { id: 'PI4', nome: 'Estabelecer e gerenciar indicadores de monitoramento', ods: ['ODS 16'] }
        ]
    },
    clientes: {
        nome: 'Clientes',
        cor: '#E67E22', // Laranja
        bg: '#FFF3E0', // Laranja claro
        classe: 'p-clientes',
        icon: '👥',
        objetivos: [
            { id: 'CL1', nome: 'Fortalecer as competências dos registrados', ods: ['ODS 4'] },
            { id: 'CL2', nome: 'Fortalecer a identidade profissional', ods: ['ODS 4', 'ODS 8'] },
            { id: 'CL3', nome: 'Incentivar e desenvolver projetos inovadores voltados aos profissionais de Administração', ods: ['ODS 4', 'ODS 8', 'ODS 17'] }
        ]
    },
    financeiro: {
        nome: 'Financeira / Sustentabilidade Econômica',
        cor: '#A04000', // Marrom-Avermelhado
        bg: '#FDECEA', // Vermelho/Laranja muito claro
        classe: 'p-financeiro',
        icon: '💰',
        objetivos: [
            { id: 'FI1', nome: 'Implementar tecnologias de fiscalização unificadas com os Conselhos Regionais', ods: ['ODS 8', 'ODS 9'] },
            { id: 'FI2', nome: 'Aprimorar a gestão financeira', ods: ['ODS 8', 'ODS 9'] },
            { id: 'FI3', nome: 'Prospectar e buscar novas fontes de receita', ods: ['ODS 8', 'ODS 9'] }
        ]
    }
};

export const SWOT_DATA = {
    forcas: ['Sistema bem estruturado', 'Padronização de normas operacionais', 'Bom número de registrados', 'Diversidade de segmentos de atuação', 'Sistema Eletrônico de Informações (SEI)', 'Serviços on-line', 'Academia Corporativa da Administração', 'Capilaridade nacional', 'Sustentabilidade financeira'],
    fraquezas: ['Concorrência com outras profissões', 'Marketshare baixo', 'Identidade profissional fraca', 'Deficiência em treinamento', 'Baixa integração entre os Regionais', 'Falta de articulação política', 'Baixa fiscalização profissional'],
    oportunidades: ['Grande número de egressos sem registro', 'Crescente número de tecnólogos', 'Nova Lei de Licitações', 'Ambientação on-line', 'Investimento em ESG', 'Acordos com MPT', 'Áreas da economia criativa'],
    ameacas: ['Desvalorização da profissão', 'Projetos de desregulamentação no Congresso', 'Cenário econômico: desemprego', 'Precarização do ensino', 'Decisões judiciais desfavoráveis', 'Outras profissões na área privativa']
};

export const STATUS_LABELS = { nao_iniciado: 'Não Iniciado', em_andamento: 'Em Andamento', concluido: 'Concluído', pausado: 'Pausado' };
export const STATUS_CHIPS = { nao_iniciado: 'chip-nao', em_andamento: 'chip-em', concluido: 'chip-con', pausado: 'chip-pause' };
export const PERSP_ABREV = { sustentabilidade: 'Sust. S/A', processos: 'Dev. Inst.', clientes: 'Clientes', financeiro: 'Financeira' };
export const PERSP_CORES = { sustentabilidade: 'var(--roxo)', processos: 'var(--azul-mid)', clientes: 'var(--vermelho)', financeiro: 'var(--verde)' };
export const SWOT_LABELS = { forcas: 'Força', fraquezas: 'Fraqueza', oportunidades: 'Oportunidade', ameacas: 'Ameaça' };

// Armazém central de dados do aplicativo
export const state = {
    acoes: [],
    todasAcoes: [],
    objetivosGlobais: {},
    swotItems: { forcas: [], fraquezas: [], oportunidades: [], ameacas: [] },
    editingId: null,
    uploadProjId: null,
    uploadAcaoIndex: null,
    chartPerspInstance: null,
    chartStatusInstance: null
};
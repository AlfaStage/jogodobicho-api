export interface LotericaConfig {
    id: string;
    slug: string;
    nome: string;
    // URL principal (O JogodoBicho)
    url?: string;
    // URLs alternativas
    urlGigaBicho?: string;
    urlResultadoFacil?: string;
    // Horários de fechamento (para agendamento do cron - formato HH:mm)
    horarios?: string[];
}

// Lista completa de lotéricas e seus horários estimados
// Horários baseados em pesquisa e padrões comuns (Rio, Look, Federal)
// Para estaduais menores, usamos horários padrão de hora em hora ou específicos conhecidos.

export const LOTERIAS: LotericaConfig[] = [
    // --- Rio de Janeiro (RJ) ---
    {
        id: 'rj-pt',
        slug: 'pt-rio',
        nome: 'PT Rio / Deu no Poste',
        url: 'https://www.ojogodobicho.com/deu_no_poste.htm',
        urlGigaBicho: 'https://www.gigabicho.com.br/pt-rio/',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/rj',
        horarios: ['09:20', '11:00', '14:20', '16:00', '18:20', '21:20']
    },
    // --- São Paulo (SP) ---
    {
        id: 'sp-ptsp',
        slug: 'pt-sp',
        nome: 'PT-SP (São Paulo)',
        urlGigaBicho: 'https://www.gigabicho.com.br/jogo-do-bicho-sao-paulo/',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/sp',
        horarios: ['08:00', '10:00', '12:20', '13:00', '15:20', '17:20', '19:00', '20:00']
    },
    {
        id: 'sp-bandeirantes',
        slug: 'bandeirantes',
        nome: 'Bandeirantes (São Paulo)',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/sp',
        horarios: ['15:20']
    },
    // --- Goiás (GO) ---
    {
        id: 'go-look',
        slug: 'look-goias',
        nome: 'Look Goiás',
        urlGigaBicho: 'https://www.gigabicho.com.br/resultado-look-loterias-hoje/',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/go',
        horarios: ['07:20', '09:20', '11:20', '14:20', '16:20', '18:20', '21:20', '23:20']
    },
    {
        id: 'go-boasorte',
        slug: 'boa-sorte',
        nome: 'Boa Sorte Loterias',
        urlGigaBicho: 'https://www.gigabicho.com.br/boa-sorte/',
        horarios: ['11:20', '14:20', '16:20', '18:20']
    },
    // --- Minas Gerais (MG) ---
    {
        id: 'mg-alvorada',
        slug: 'alvorada-mg',
        nome: 'Alvorada (MG)',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/mg',
        horarios: ['12:00']
    },
    {
        id: 'mg-minasdia',
        slug: 'minas-dia-mg',
        nome: 'Minas Dia (MG)',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/mg',
        horarios: ['15:00']
    },
    {
        id: 'mg-minasnoite',
        slug: 'minas-noite-mg',
        nome: 'Minas Noite (MG)',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/mg',
        horarios: ['19:00']
    },
    {
        id: 'mg-preferida',
        slug: 'preferida-mg',
        nome: 'Preferida (MG)',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/mg',
        horarios: ['21:00']
    },
    {
        id: 'mg-salvacao',
        slug: 'salvacao-mg',
        nome: 'Salvação (MG)',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/mg',
        horarios: ['13:00']
    },
    // --- Bahia (BA) ---
    {
        id: 'ba-jb',
        slug: 'jb-bahia',
        nome: 'JB Bahia',
        urlGigaBicho: 'https://www.gigabicho.com.br/jogo-do-bicho-bahia/',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/ba',
        horarios: ['10:00', '12:00', '15:00', '19:00', '21:00']
    },
    {
        id: 'ba-maluca',
        slug: 'maluca-bahia',
        nome: 'Maluca Bahia',
        urlGigaBicho: 'https://www.gigabicho.com.br/jogo-do-bicho-bahia/',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/ba',
        horarios: ['10:00', '12:00', '15:00', '19:00', '21:00']
    },
    // --- Paraíba (PB) ---
    {
        id: 'pb-lotep',
        slug: 'lotep-pb',
        nome: 'Lotep Paraíba',
        urlGigaBicho: 'https://www.gigabicho.com.br/lotep/',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/pb',
        horarios: ['10:45', '12:45', '15:45', '18:00']
    },
    {
        id: 'pb-campina',
        slug: 'campina-grande-pb',
        nome: 'Campina Grande (PB)',
        urlGigaBicho: 'https://www.gigabicho.com.br/resultado-jogo-do-bicho-campina-grande/',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/pb',
        horarios: ['09:45', '10:45', '12:45', '15:45', '19:05']
    },
    // --- Pernambuco (PE) ---
    {
        id: 'pe-aval',
        slug: 'aval-pe',
        nome: 'Aval Pernambuco',
        urlGigaBicho: 'https://www.gigabicho.com.br/aval-pernambuco/',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/pe',
        horarios: ['09:20', '11:00', '12:45', '14:00', '15:45', '17:00', '19:00']
    },
    {
        id: 'pe-caminho',
        slug: 'caminho-sorte-pe',
        nome: 'Caminho da Sorte (PE)',
        urlGigaBicho: 'https://www.gigabicho.com.br/caminho-da-sorte/',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/pe',
        horarios: ['09:40', '11:00', '12:40', '14:00', '15:40', '17:00', '18:30', '20:00', '21:00']
    },
    {
        id: 'pe-popular',
        slug: 'popular-pe',
        nome: 'Loteria Popular Recife',
        urlGigaBicho: 'https://www.gigabicho.com.br/loteria-popular-recife/',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/pe',
        horarios: ['09:30', '11:00', '12:40', '14:00', '15:40', '17:00', '18:30']
    },
    {
        id: 'pe-monte-carlos',
        slug: 'monte-carlos-pe',
        nome: 'Nordeste Monte Carlos',
        urlGigaBicho: 'https://www.gigabicho.com.br/nordeste-monte-carlos/',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/pe',
        horarios: ['10:00', '11:00', '12:40', '14:00', '15:40', '17:00', '18:30', '21:00']
    },
    // --- Ceará (CE) ---
    {
        id: 'ce-lotece',
        slug: 'lotece-ceara',
        nome: 'Lotece Ceará',
        urlGigaBicho: 'https://www.gigabicho.com.br/resultado-loteria-dos-sonhos-hoje/',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/ce',
        horarios: ['11:00', '14:00', '15:45', '19:00']
    },
    // --- Brasília (DF) ---
    {
        id: 'df-lbr',
        slug: 'lbr-df',
        nome: 'LBR Loterias (Brasília)',
        urlGigaBicho: 'https://www.gigabicho.com.br/lbr-loterias/',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/df',
        horarios: ['08:40', '10:40', '12:40', '13:40', '15:40', '17:40', '20:40', '22:40']
    },
    // --- Rio Grande do Norte (RN) ---
    {
        id: 'rn-premia',
        slug: 'premia-rn',
        nome: 'Loteria Premia RN',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/rn',
        horarios: ['08:30', '11:45', '16:45', '18:30']
    },
    // --- Rio Grande do Sul (RS) ---
    {
        id: 'rs-bicho',
        slug: 'bicho-rs',
        nome: 'Bicho RS',
        urlGigaBicho: 'https://www.gigabicho.com.br/bicho-rs/',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/rs',
        horarios: ['14:00', '18:00']
    },
    // --- Sergipe (SE) ---
    {
        id: 'se-abaese',
        slug: 'abaese-se',
        nome: 'Abaese Paratodos (SE)',
        urlGigaBicho: 'https://www.gigabicho.com.br/abaese/',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/se',
        horarios: ['10:00', '13:00', '14:00', '16:00', '19:00']
    },
    // --- Nacional e Federal ---
    {
        id: 'br-federal',
        slug: 'federal',
        nome: 'Loteria Federal (Bicho)',
        url: 'https://www.ojogodobicho.com/estatistica/federal/',
        urlGigaBicho: 'https://www.gigabicho.com.br/loteria-federal-jogo-do-bicho/',
        horarios: ['19:00']
    },
    {
        id: 'br-nacional',
        slug: 'loteria-nacional',
        nome: 'Loteria Nacional (LN)',
        urlGigaBicho: 'https://www.gigabicho.com.br/loteria-nacional/',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/XX',
        horarios: ['02:00', '08:00', '10:00', '12:00', '15:00', '17:00', '19:00', '21:00', '22:00', '23:00']
    },
    {
        id: 'br-tradicional',
        slug: 'loteria-tradicional',
        nome: 'Loteria Tradicional (LT)',
        urlResultadoFacil: 'https://www.resultadofacil.com.br/resultado-do-jogo-do-bicho/XX',
        horarios: ['11:20', '12:20', '13:20', '14:20', '18:20', '19:20', '20:20', '21:20', '22:20', '23:20']
    }
];


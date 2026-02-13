(function () {
    // 1. Gerenciamento da API Key
    const urlParams = new URLSearchParams(window.location.search);
    let apiKey = urlParams.get('key');

    // Se não estiver na URL, busca no localStorage
    if (!apiKey) {
        apiKey = localStorage.getItem('admin_api_key');
    } else {
        // Se estiver na URL, salva no localStorage para persistência
        localStorage.setItem('admin_api_key', apiKey);
    }

    // 2. Injeção do Sidebar
    function injectSidebar() {
        if (document.getElementById('admin-sidebar')) return;

        const sidebar = document.createElement('div');
        sidebar.id = 'admin-sidebar';

        const currentPath = window.location.pathname;

        const menuItems = [
            { name: 'Status', path: '/admin/status', icon: '📊' },
            { name: 'Webhooks', path: '/admin/webhooks', icon: '⚓' },
            { name: 'Proxies', path: '/admin/proxies-page', icon: '🛡️' },
            { name: 'Template', path: '/admin/template', icon: '🎨' },
            { name: 'API Docs', path: '/api-docs', icon: '📚' }
        ];

        let navHtml = '';
        menuItems.forEach(item => {
            const isActive = currentPath.includes(item.path) || (item.path === '/admin/proxies-page' && currentPath.includes('proxies'));
            const url = apiKey ? `${item.path}?key=${apiKey}` : item.path;
            navHtml += `<a href="${url}" class="${isActive ? 'active' : ''}"><i>${item.icon}</i> ${item.name}</a>`;
        });

        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h1>Jogo do Bicho</h1>
            </div>
            <nav>
                ${navHtml}
            </nav>
            <div class="sidebar-footer">
                v2.1.0 • Admin Panel
            </div>
        `;

        document.body.prepend(sidebar);
    }

    // 3. Utilitários Globais
    window.getAdminKey = () => apiKey;

    window.fetchAdmin = async (url, options = {}) => {
        if (apiKey) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}key=${apiKey}`;
        }
        return fetch(url, options);
    };

    // 4. Correção automática de links (Interceptar todos os cliques em links locais)
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href && link.href.startsWith(window.location.origin)) {
            const url = new URL(link.href);
            if (apiKey && !url.searchParams.has('key') && !url.pathname.includes('/api-docs')) {
                e.preventDefault();
                url.searchParams.set('key', apiKey);
                window.location.href = url.toString();
            }
        }
    }, true);

    // 5. Inicialização
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectSidebar);
    } else {
        injectSidebar();
    }

    // Exportar para uso nas páginas
    window.apiKey = apiKey;
})();

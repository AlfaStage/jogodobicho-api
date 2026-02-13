(function () {
    // 1. Gerenciamento da API Key
    const urlParams = new URLSearchParams(window.location.search);
    let apiKey = urlParams.get('key');

    if (!apiKey) {
        apiKey = localStorage.getItem('admin_api_key');
    } else {
        localStorage.setItem('admin_api_key', apiKey);
    }

    // Exportar para uso nas páginas
    window.adminApiKey = apiKey;

    // 2. Injeção do Sidebar
    function injectSidebar() {
        if (document.getElementById('admin-sidebar')) return;
        if (!document.body) {
            setTimeout(injectSidebar, 50);
            return;
        }

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
            const isActive = currentPath.includes(item.path);
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

        // Ajustar margem do body se houver main/container/editor-container
        const main = document.querySelector('main') || document.querySelector('.container') || document.querySelector('.editor-container');
        if (main) {
            main.style.marginLeft = '260px'; // sidebar width
        }
    }

    // 3. Utilitários Globais
    window.getAdminKey = () => apiKey;

    window.fetchAdmin = async (url, options = {}) => {
        const key = window.adminApiKey;
        if (key) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}key=${key}`;
        }
        return fetch(url, options);
    };

    // 4. Correção automática de links
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href && link.href.startsWith(window.location.origin)) {
            const url = new URL(link.href);
            const key = window.adminApiKey;
            if (key && !url.searchParams.has('key') && !url.pathname.includes('/api-docs') && url.pathname.startsWith('/admin')) {
                e.preventDefault();
                url.searchParams.set('key', key);
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

    // Fallback
    setTimeout(injectSidebar, 500);
})();

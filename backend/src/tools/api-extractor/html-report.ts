import { ExtractionResult } from './types';

export function renderHtmlReport(result: ExtractionResult): string {
  const data = JSON.stringify(result).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>API Inventory Console</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            ink: '#172026',
            mist: '#f6f8fb',
            line: '#d8e0e8',
            accent: '#2563eb'
          }
        }
      }
    };
  </script>
</head>
<body class="min-h-screen bg-mist text-ink">
  <script id="inventory-data" type="application/json">${data}</script>

  <header class="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
    <div class="mx-auto flex max-w-[1600px] items-center gap-4 px-5 py-3">
      <div class="min-w-0">
        <h1 class="text-lg font-semibold tracking-normal">API Inventory Console</h1>
        <p class="text-xs text-slate-500">Generated from TypeScript AST analysis. Send requests directly from each endpoint row. Serve with <code>npm run serve:api-docs</code> for the backend CORS allow-list.</p>
      </div>
      <div class="ml-auto flex items-center gap-2 text-xs text-slate-600">
        <span id="summaryBadge" class="rounded border border-line px-2 py-1"></span>
        <select id="groupBySelect" class="rounded border border-line px-2 py-1.5 outline-none focus:border-accent">
          <option value="prefix">Group by prefix</option>
          <option value="module">Group by module</option>
          <option value="method">Group by method</option>
          <option value="none">No grouping</option>
        </select>
        <button id="expandAllBtn" class="rounded border border-line px-3 py-1.5 hover:bg-slate-50">Expand all</button>
        <button id="collapseAllBtn" class="rounded border border-line px-3 py-1.5 hover:bg-slate-50">Collapse</button>
      </div>
    </div>
  </header>

  <main class="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 px-5 py-5 lg:grid-cols-[360px_1fr]">
    <aside class="space-y-4">
      <section class="rounded-lg border border-line bg-white p-4 shadow-sm">
        <h2 class="text-sm font-semibold">Connection</h2>
        <div class="mt-3 space-y-3">
          <label class="block">
            <span class="text-xs font-medium text-slate-600">Base URL</span>
            <input id="baseUrl" class="mt-1 w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent" value="http://localhost:5000">
          </label>
          <p class="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">Start your API server, then open this page from <b>http://127.0.0.1:5500</b> using <b>npm run serve:api-docs</b>. This avoids browser CORS issues.</p>
          <label class="block">
            <span class="text-xs font-medium text-slate-600">Bearer token</span>
            <input id="authToken" class="mt-1 w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Paste JWT token">
          </label>
          <label class="block">
            <span class="text-xs font-medium text-slate-600">Extra headers JSON</span>
            <textarea id="globalHeaders" class="mt-1 h-28 w-full rounded border border-line px-3 py-2 font-mono text-xs outline-none focus:border-accent">{
  "Content-Type": "application/json"
}</textarea>
          </label>
        </div>
      </section>

      <section class="rounded-lg border border-line bg-white p-4 shadow-sm">
        <h2 class="text-sm font-semibold">Filters</h2>
        <div class="mt-3 space-y-3">
          <input id="searchInput" class="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Search path, controller, field, RBAC">
          <select id="methodFilter" class="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent">
            <option value="ALL">All methods</option>
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>PATCH</option>
            <option>DELETE</option>
          </select>
          <label class="flex items-center gap-2 text-sm text-slate-700">
            <input id="authOnly" type="checkbox" class="h-4 w-4 rounded border-line">
            Authenticated only
          </label>
        </div>
      </section>

      <section class="rounded-lg border border-line bg-white p-4 shadow-sm">
        <h2 class="text-sm font-semibold">Inventory</h2>
        <dl id="stats" class="mt-3 grid grid-cols-2 gap-2 text-sm"></dl>
      </section>

      <section class="rounded-lg border border-line bg-white p-4 shadow-sm" id="groupNavSection">
        <h2 class="text-sm font-semibold mb-3">Jump to Group</h2>
        <nav id="groupNav" class="space-y-1 text-sm max-h-96 overflow-y-auto"></nav>
      </section>
    </aside>

    <section class="min-w-0">
      <div id="routes" class="space-y-4"></div>
    </section>
  </main>

  <script>
    const inventory = JSON.parse(document.getElementById('inventory-data').textContent || '{}');
    const expanded = new Set();
    const collapsedGroups = new Set();

    const methodStyles = {
      GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      POST: 'bg-blue-50 text-blue-700 border-blue-200',
      PUT: 'bg-amber-50 text-amber-700 border-amber-200',
      PATCH: 'bg-violet-50 text-violet-700 border-violet-200',
      DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
      OPTIONS: 'bg-slate-50 text-slate-700 border-slate-200',
      HEAD: 'bg-slate-50 text-slate-700 border-slate-200'
    };

    const methodOrder = ['GET','POST','PUT','PATCH','DELETE','OPTIONS','HEAD','ALL'];

    function html(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function routeText(route) {
      return [
        route.method,
        route.path,
        route.controller,
        route.middlewares.map((item) => item.name).join(' '),
        route.rbac.map((rule) => JSON.stringify(rule)).join(' '),
        route.requestBodyFields.map((field) => field.name).join(' '),
        route.queryParameters.map((field) => field.name).join(' ')
      ].join(' ').toLowerCase();
    }

    // ── Grouping helpers ───────────────────────────────────────────────────────

    function pathPrefix(routePath) {
      // "/api/v1/users/profile" → "/users"  (strip leading /api/vN if present)
      const parts = routePath.replace(/^\\/(api\\/v?\\d+|api)/, '').split('/').filter(Boolean);
      return parts.length > 0 ? '/' + parts[0] : '/';
    }

    function groupKey(route, groupBy) {
      if (groupBy === 'module') return route.module || 'unknown';
      if (groupBy === 'method') return route.method;
      if (groupBy === 'none') return '__all__';
      return pathPrefix(route.path); // 'prefix' (default)
    }

    function groupLabel(key, groupBy) {
      if (groupBy === 'none') return 'All Routes';
      return key;
    }

    function slugify(key) {
      return 'grp-' + key.replace(/[^a-z0-9]/gi, '-');
    }

    function sortRoutes(items) {
      return [...items].sort((a, b) => {
        const pathCmp = a.route.path.localeCompare(b.route.path);
        if (pathCmp !== 0) return pathCmp;
        return methodOrder.indexOf(a.route.method) - methodOrder.indexOf(b.route.method);
      });
    }

    function buildGroups(items, groupBy) {
      const map = new Map();
      for (const item of items) {
        const key = groupKey(item.route, groupBy);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
      }
      // Sort groups: method groups by methodOrder, everything else alphabetically
      const sortedKeys = [...map.keys()].sort((a, b) => {
        if (groupBy === 'method') {
          return methodOrder.indexOf(a) - methodOrder.indexOf(b);
        }
        return a.localeCompare(b);
      });
      return sortedKeys.map((key) => ({ key, items: sortRoutes(map.get(key)) }));
    }

    // ── Filtering ──────────────────────────────────────────────────────────────

    function filteredRoutes() {
      const search = document.getElementById('searchInput').value.trim().toLowerCase();
      const method = document.getElementById('methodFilter').value;
      const authOnly = document.getElementById('authOnly').checked;
      return inventory.routes
        .map((route, index) => ({ route, index }))
        .filter((item) => method === 'ALL' || item.route.method === method)
        .filter((item) => !authOnly || item.route.authenticationRequired)
        .filter((item) => !search || routeText(item.route).includes(search));
    }

    // ── Stats ──────────────────────────────────────────────────────────────────

    function renderStats() {
      const summary = inventory.summary || {};
      document.getElementById('summaryBadge').textContent = (summary.routeCount || 0) + ' routes';
      const values = [
        ['Routes', summary.routeCount || 0],
        ['Auth', summary.authenticatedRoutes || 0],
        ['RBAC', summary.routesWithRbac || 0],
        ['Body inferred', summary.routesWithInferredBody || 0]
      ];
      document.getElementById('stats').innerHTML = values.map(([label, value]) =>
        '<div class="rounded border border-line bg-slate-50 p-2"><dt class="text-xs text-slate-500">' +
        html(label) + '</dt><dd class="text-lg font-semibold">' + html(value) + '</dd></div>'
      ).join('');
    }

    // ── Field / RBAC helpers ───────────────────────────────────────────────────

    function fieldSummary(fields) {
      if (!fields || fields.length === 0) return '<span class="text-slate-400">None</span>';
      return fields.slice(0, 5).map((field) =>
        '<span class="inline-flex rounded border border-line bg-slate-50 px-2 py-1 text-xs">' +
        html(field.name) + ' <b class="ml-1">' + html(field.confidence) + '</b></span>'
      ).join(' ') + (fields.length > 5 ? '<span class="text-xs text-slate-500"> +' + (fields.length - 5) + ' more</span>' : '');
    }

    function rbacSummary(route) {
      if (!route.rbac || route.rbac.length === 0) return '<span class="text-slate-400">None</span>';
      return route.rbac.map((rule) => {
        const parts = [];
        if (rule.roles && rule.roles.length) parts.push('roles: ' + rule.roles.join(', '));
        if (rule.permissions && rule.permissions.length) parts.push('permissions: ' + rule.permissions.join(', '));
        if (rule.resourceType) parts.push('resource: ' + rule.resourceType);
        return html(parts.join('; ') || rule.raw);
      }).join('<br>');
    }

    function bodyTemplate(route) {
      const out = {};
      (route.requestBodyFields || []).forEach((field) => {
        if (field.name === '*') return;
        setDeep(out, field.name.split('.'), null);
      });
      return out;
    }

    function setDeep(target, parts, value) {
      let current = target;
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          current[part] = value;
          return;
        }
        current[part] = current[part] || {};
        current = current[part];
      });
    }

    // ── Route card ─────────────────────────────────────────────────────────────

    function renderParamInputs(title, items, namePrefix) {
      if (!items || items.length === 0) return '';
      return '<div><h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">' + title + '</h4>' +
        '<div class="grid gap-2 md:grid-cols-2">' + items.map((item) => {
          const name = typeof item === 'string' ? item : item.name;
          return '<label class="block"><span class="text-xs text-slate-600">' + html(name) + '</span>' +
            '<input data-' + namePrefix + '="' + html(name) + '" class="mt-1 w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent"></label>';
        }).join('') + '</div></div>';
    }

    function routeCard(item) {
      const route = item.route;
      const index = item.index;
      const isOpen = expanded.has(index);
      const methodClass = methodStyles[route.method] || 'bg-slate-50 text-slate-700 border-slate-200';
      return '<article id="route-' + index + '" class="rounded-lg border border-line bg-white shadow-sm">' +
        '<button class="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50" onclick="toggleRoute(' + index + ')">' +
          '<span class="mt-0.5 w-20 shrink-0 rounded border px-2 py-1 text-center text-xs font-bold ' + methodClass + '">' + html(route.method) + '</span>' +
          '<span class="min-w-0 flex-1"><span class="block truncate font-mono text-sm font-semibold">' + html(route.path) + '</span>' +
          '<span class="mt-1 block text-xs text-slate-500">' + html(route.controller || 'Unknown controller') + '</span></span>' +
          '<span class="rounded border border-line px-2 py-1 text-xs ' + (route.authenticationRequired ? 'text-amber-700' : 'text-slate-500') + '">' + (route.authenticationRequired ? 'Auth' : 'Public') + '</span>' +
          '<span class="text-lg text-slate-400">' + (isOpen ? '−' : '+') + '</span>' +
        '</button>' +
        (isOpen ? routeDetails(route, index) : '') +
      '</article>';
    }

    function routeDetails(route, index) {
      const body = JSON.stringify(bodyTemplate(route), null, 2);
      const canHaveBody = !['GET', 'HEAD'].includes(route.method);
      return '<div class="border-t border-line px-4 py-4">' +
        '<div class="grid gap-4 xl:grid-cols-[1fr_420px]">' +
          '<div class="space-y-4">' +
            '<div class="grid gap-3 text-sm md:grid-cols-2">' +
              '<div><div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Middleware</div><div class="mt-1 text-slate-700">' + (route.middlewares.length ? route.middlewares.map((m) => html(m.name)).join(' → ') : 'None') + '</div></div>' +
              '<div><div class="text-xs font-semibold uppercase tracking-wide text-slate-500">RBAC</div><div class="mt-1 text-slate-700">' + rbacSummary(route) + '</div></div>' +
              '<div><div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Body Fields</div><div class="mt-1 space-x-1 space-y-1">' + fieldSummary(route.requestBodyFields) + '</div></div>' +
              '<div><div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Query Params</div><div class="mt-1 space-x-1 space-y-1">' + fieldSummary(route.queryParameters) + '</div></div>' +
            '</div>' +
            renderParamInputs('Path Parameters', route.pathParameters, 'path-param') +
            renderParamInputs('Query Parameters', route.queryParameters, 'query-param') +
            (canHaveBody ? '<label class="block"><span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Request Body JSON</span><textarea data-body class="mt-2 h-56 w-full rounded border border-line px-3 py-2 font-mono text-xs outline-none focus:border-accent">' + html(body) + '</textarea></label>' : '') +
            '<div class="flex flex-wrap items-center gap-2">' +
              '<button onclick="sendRequest(' + index + ')" class="rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Send</button>' +
              '<button onclick="copyCurl(' + index + ')" class="rounded border border-line px-4 py-2 text-sm hover:bg-slate-50">Copy cURL</button>' +
              '<span id="status-' + index + '" class="text-sm text-slate-500"></span>' +
            '</div>' +
          '</div>' +
          '<div><div class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Response</div><pre id="response-' + index + '" class="min-h-80 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">No request sent.</pre></div>' +
        '</div>' +
      '</div>';
    }

    // ── Group rendering ────────────────────────────────────────────────────────

    function methodBadgePill(method) {
      const cls = methodStyles[method] || 'bg-slate-50 text-slate-600 border-slate-200';
      return '<span class="rounded border px-1.5 py-0.5 text-xs font-bold ' + cls + '">' + html(method) + '</span>';
    }

    function groupMethodTally(items) {
      const tally = {};
      items.forEach((item) => { tally[item.route.method] = (tally[item.route.method] || 0) + 1; });
      return methodOrder
        .filter((m) => tally[m])
        .map((m) => methodBadgePill(m) + '<span class="text-xs text-slate-500 ml-0.5">' + tally[m] + '</span>')
        .join(' ');
    }

    function renderGroupSection(group, groupBy) {
      const slug = slugify(group.key);
      const label = groupLabel(group.key, groupBy);
      const isCollapsed = collapsedGroups.has(group.key);
      return '<section id="' + slug + '" class="rounded-xl border border-line bg-white shadow-sm overflow-hidden">' +
        '<div class="flex items-center gap-3 border-b border-line bg-slate-50 px-4 py-3 cursor-pointer select-none" onclick="toggleGroup(' + JSON.stringify(group.key) + ')">' +
          '<span class="text-base font-semibold font-mono text-ink flex-1">' + html(label) + '</span>' +
          '<span class="flex items-center gap-1.5">' + groupMethodTally(group.items) + '</span>' +
          '<span class="ml-3 text-xs text-slate-500 font-medium w-20 text-right">' + group.items.length + ' route' + (group.items.length !== 1 ? 's' : '') + '</span>' +
          '<span class="ml-2 text-slate-400 text-base">' + (isCollapsed ? '▶' : '▼') + '</span>' +
        '</div>' +
        (isCollapsed ? '' :
          '<div class="divide-y divide-line">' + group.items.map(routeCard).join('') + '</div>'
        ) +
      '</section>';
    }

    // ── Group nav sidebar ──────────────────────────────────────────────────────

    function renderGroupNav(groups, groupBy) {
      const nav = document.getElementById('groupNav');
      const section = document.getElementById('groupNavSection');
      if (groupBy === 'none') {
        section.style.display = 'none';
        return;
      }
      section.style.display = '';
      nav.innerHTML = groups.map((group) => {
        const slug = slugify(group.key);
        const label = groupLabel(group.key, groupBy);
        const isCollapsed = collapsedGroups.has(group.key);
        return '<a href="#' + slug + '" ' +
          'class="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-slate-50 font-mono text-xs text-slate-700 hover:text-accent">' +
          '<span class="truncate">' + html(label) + (isCollapsed ? ' <span class="text-slate-400">(collapsed)</span>' : '') + '</span>' +
          '<span class="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">' + group.items.length + '</span>' +
          '</a>';
      }).join('');
    }

    // ── Main render ────────────────────────────────────────────────────────────

    function renderRoutes() {
      const items = filteredRoutes();
      const groupBy = document.getElementById('groupBySelect').value;
      const container = document.getElementById('routes');

      if (items.length === 0) {
        container.innerHTML = '<div class="rounded-lg border border-line bg-white p-8 text-center text-slate-500">No routes match the current filters.</div>';
        document.getElementById('groupNavSection').style.display = 'none';
        return;
      }

      const groups = buildGroups(items, groupBy);
      container.innerHTML = groups.map((g) => renderGroupSection(g, groupBy)).join('');
      renderGroupNav(groups, groupBy);
    }

    function toggleRoute(index) {
      expanded.has(index) ? expanded.delete(index) : expanded.add(index);
      renderRoutes();
    }

    function toggleGroup(key) {
      collapsedGroups.has(key) ? collapsedGroups.delete(key) : collapsedGroups.add(key);
      renderRoutes();
    }

    function currentRouteEl(index) {
      return document.getElementById('route-' + index);
    }

    // ── HTTP request helpers ───────────────────────────────────────────────────

    function buildRequest(index) {
      const route = inventory.routes[index];
      const root = currentRouteEl(index);
      const base = document.getElementById('baseUrl').value.trim().replace(/\\/+$/, '');
      let path = route.path;
      root.querySelectorAll('[data-path-param]').forEach((input) => {
        path = path.replace(':' + input.dataset.pathParam, encodeURIComponent(input.value.trim()));
      });

      const url = new URL(base + path);
      root.querySelectorAll('[data-query-param]').forEach((input) => {
        const value = input.value.trim();
        if (value) url.searchParams.set(input.dataset.queryParam, value);
      });

      let headers = {};
      const rawHeaders = document.getElementById('globalHeaders').value.trim();
      if (rawHeaders) headers = JSON.parse(rawHeaders);
      const token = document.getElementById('authToken').value.trim();
      if (token) headers.Authorization = token.toLowerCase().startsWith('bearer ') ? token : 'Bearer ' + token;

      const init = { method: route.method, headers };
      const bodyInput = root.querySelector('[data-body]');
      if (bodyInput && !['GET', 'HEAD'].includes(route.method)) {
        const rawBody = bodyInput.value.trim();
        if (rawBody) init.body = rawBody;
      }

      return { route, url, init };
    }

    async function sendRequest(index) {
      const status = document.getElementById('status-' + index);
      const responseBox = document.getElementById('response-' + index);
      try {
        const request = buildRequest(index);
        status.textContent = 'Sending...';
        responseBox.textContent = request.init.method + ' ' + request.url.toString();
        const started = performance.now();
        const response = await fetch(request.url, request.init);
        const elapsed = Math.round(performance.now() - started);
        const text = await response.text();
        let body = text;
        try { body = JSON.stringify(JSON.parse(text), null, 2); } catch (_error) {}
        status.textContent = response.status + ' ' + response.statusText + ' in ' + elapsed + 'ms';
        responseBox.textContent = body || '(empty response)';
      } catch (error) {
        status.textContent = 'Request failed';
        responseBox.textContent = String(error && error.stack ? error.stack : error);
      }
    }

    async function copyCurl(index) {
      try {
        const request = buildRequest(index);
        const headers = Object.entries(request.init.headers || {})
          .map(([key, value]) => '-H "' + key + ': ' + String(value).replace(/"/g, '\\\\"') + '"')
          .join(' ');
        const body = request.init.body ? " --data '" + String(request.init.body).replace(/'/g, "'\\\\''") + "'" : '';
        const curl = 'curl -X ' + request.init.method + ' ' + headers + body + ' "' + request.url.toString() + '"';
        await navigator.clipboard.writeText(curl);
        document.getElementById('status-' + index).textContent = 'cURL copied';
      } catch (error) {
        document.getElementById('status-' + index).textContent = 'Could not copy cURL';
      }
    }

    // ── Event wiring ───────────────────────────────────────────────────────────

    document.getElementById('searchInput').addEventListener('input', renderRoutes);
    document.getElementById('methodFilter').addEventListener('change', renderRoutes);
    document.getElementById('authOnly').addEventListener('change', renderRoutes);
    document.getElementById('groupBySelect').addEventListener('change', () => {
      collapsedGroups.clear();
      renderRoutes();
    });
    document.getElementById('expandAllBtn').addEventListener('click', () => {
      filteredRoutes().forEach((item) => expanded.add(item.index));
      renderRoutes();
    });
    document.getElementById('collapseAllBtn').addEventListener('click', () => {
      expanded.clear();
      renderRoutes();
    });

    renderStats();
    renderRoutes();
  </script>
</body>
</html>
`;
}
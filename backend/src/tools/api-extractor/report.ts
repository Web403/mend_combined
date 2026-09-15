import { ExtractedRoute, ExtractionResult, InferredField, RbacRule } from './types';

// ── Grouping helpers ─────────────────────────────────────────────────────────

const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'ALL'];

function pathPrefix(routePath: string): string {
  // "/api/v1/users/profile" → "/users"  (strip leading /api/vN if present)
  const parts = routePath.replace(/^\/(api\/v?\d+|api)/, '').split('/').filter(Boolean);
  return parts.length > 0 ? '/' + parts[0] : '/';
}

function sortRoutes(routes: ExtractedRoute[]): ExtractedRoute[] {
  return [...routes].sort((a, b) => {
    const pathCmp = a.path.localeCompare(b.path);
    if (pathCmp !== 0) return pathCmp;
    return METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method);
  });
}

function groupRoutesByPrefix(routes: ExtractedRoute[]): Map<string, ExtractedRoute[]> {
  const map = new Map<string, ExtractedRoute[]>();
  for (const route of routes) {
    const prefix = pathPrefix(route.path);
    if (!map.has(prefix)) map.set(prefix, []);
    map.get(prefix)!.push(route);
  }
  // Sort each group internally, then sort groups alphabetically
  const sorted = new Map<string, ExtractedRoute[]>();
  [...map.keys()].sort((a, b) => a.localeCompare(b)).forEach((key) => {
    sorted.set(key, sortRoutes(map.get(key)!));
  });
  return sorted;
}

// ── Public render entry point ────────────────────────────────────────────────

export function renderMarkdownReport(result: ExtractionResult): string {
  const lines: string[] = [];
  lines.push('# API Inventory Report');
  lines.push('');
  lines.push(`Generated: ${result.generatedAt}`);
  lines.push(`Project: \`${result.projectRoot}\``);
  lines.push('');

  // ── Summary ────────────────────────────────────────────────────────────────
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('| --- | ---: |');
  lines.push(`| Routes | ${result.summary.routeCount} |`);
  lines.push(`| Authenticated routes | ${result.summary.authenticatedRoutes} |`);
  lines.push(`| Routes with RBAC | ${result.summary.routesWithRbac} |`);
  lines.push(`| Routes with inferred body fields | ${result.summary.routesWithInferredBody} |`);
  lines.push(`| Routes with schema middleware | ${result.summary.routesWithSchemas} |`);
  lines.push('');

  // ── Table of contents ──────────────────────────────────────────────────────
  const groups = groupRoutesByPrefix(result.routes);

  lines.push('## Table of Contents');
  lines.push('');
  for (const [prefix, routes] of groups) {
    const anchor = prefixAnchor(prefix);
    lines.push(`- [${prefix}](#${anchor}) — ${routes.length} route${routes.length !== 1 ? 's' : ''}`);
  }
  lines.push('');

  // ── Full route table (all routes sorted) ──────────────────────────────────
  lines.push('## All Routes');
  lines.push('');
  lines.push('| Method | Path | Controller | Auth | RBAC | Body | Query |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  const allSorted = sortRoutes(result.routes);
  allSorted.forEach((route) => {
    lines.push(routeTableRow(route));
  });
  lines.push('');

  // ── Grouped detail sections ────────────────────────────────────────────────
  lines.push('## Routes by Group');
  lines.push('');

  for (const [prefix, routes] of groups) {
    lines.push(`### ${prefix}`);
    lines.push('');
    lines.push(`_${routes.length} route${routes.length !== 1 ? 's' : ''}_`);
    lines.push('');
    lines.push('| Method | Path | Controller | Auth | RBAC | Body | Query |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    routes.forEach((route) => lines.push(routeTableRow(route)));
    lines.push('');

    // Individual route detail blocks within the group
    routes.forEach((route) => renderRouteDetail(lines, route));
  }

  // ── Warnings ──────────────────────────────────────────────────────────────
  if (result.summary.warnings.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    result.summary.warnings.forEach((warning) => lines.push(`- ${warning}`));
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

// ── Private helpers ──────────────────────────────────────────────────────────

function prefixAnchor(prefix: string): string {
  // GitHub / most Markdown renderers: lowercase, replace non-alphanumeric with hyphens
  return 'group-' + prefix.replace(/^\//, '').replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

function routeTableRow(route: ExtractedRoute): string {
  return [
    route.method,
    code(route.path),
    route.controller ? code(route.controller) : '-',
    route.authenticationRequired ? 'Yes' : 'No',
    compactRbac(route.rbac),
    compactFields(route.requestBodyFields),
    compactFields(route.queryParameters),
  ].join(' | ').replace(/^/, '| ').replace(/$/, ' |');
}

function renderRouteDetail(lines: string[], route: ExtractedRoute): void {
  lines.push(`#### ${route.method} ${route.path}`);
  lines.push('');
  lines.push(`- Controller: ${route.controller ? code(route.controller) : 'Unknown'}`);
  lines.push(`- Source: \`${route.source.file}:${route.source.line}\``);
  lines.push(`- Auth required: ${route.authenticationRequired ? 'Yes' : 'No'}`);
  lines.push(`- Path params: ${route.pathParameters.length > 0 ? route.pathParameters.map(code).join(', ') : 'None'}`);
  lines.push(`- Middleware: ${route.middlewares.length > 0 ? route.middlewares.map((m) => code(m.name)).join(' → ') : 'None'}`);
  lines.push(`- RBAC: ${route.rbac.length > 0 ? compactRbac(route.rbac) : 'None'}`);
  lines.push('');

  renderFieldTable(lines, 'Request Body Fields', route.requestBodyFields);
  renderFieldTable(lines, 'Query Parameters', route.queryParameters);
}

function renderFieldTable(lines: string[], title: string, fields: InferredField[]): void {
  lines.push(`##### ${title}`);
  lines.push('');
  if (fields.length === 0) {
    lines.push('None inferred.');
    lines.push('');
    return;
  }

  lines.push('| Field | Confidence | Source |');
  lines.push('| --- | --- | --- |');
  fields.forEach((field) => {
    const location = field.location ? ` (${field.location.file}:${field.location.line})` : '';
    lines.push(`| ${code(field.name)} | ${field.confidence} | ${escapeCell(field.source + location)} |`);
  });
  lines.push('');
}

function compactFields(fields: InferredField[]): string {
  if (fields.length === 0) return '-';
  const rendered = fields.slice(0, 4).map((field) => `${code(field.name)} ${field.confidence}`);
  if (fields.length > 4) rendered.push(`+${fields.length - 4} more`);
  return rendered.join('<br>');
}

function compactRbac(rules: RbacRule[]): string {
  if (rules.length === 0) return '-';
  return rules.map((rule) => {
    const parts: string[] = [];
    if (rule.roles?.length) parts.push(`roles: ${rule.roles.map(code).join(', ')}`);
    if (rule.permissions?.length) parts.push(`permissions: ${rule.permissions.map(code).join(', ')}`);
    if (rule.resourceType) parts.push(`resource: ${code(rule.resourceType)}`);
    if (rule.departmentTypes?.length) parts.push(`departments: ${rule.departmentTypes.map(code).join(', ')}`);
    if (rule.departmentRoles?.length) parts.push(`department roles: ${rule.departmentRoles.map(code).join(', ')}`);
    return parts.length > 0 ? parts.join('; ') : code(rule.raw);
  }).join('<br>');
}

function code(value: string): string {
  return `\`${escapeCell(value)}\``;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
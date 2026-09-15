import path from 'path';
import {
  ArrayLiteralExpression,
  CallExpression,
  Expression,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  MethodDeclaration,
  Node,
  ObjectLiteralExpression,
  Project,
  PropertyAccessExpression,
  SourceFile,
  SpreadElement,
  StringLiteral,
  SyntaxKind,
  VariableDeclaration,
} from 'ts-morph';
import {
  ExtractedRoute,
  ExtractionResult,
  HttpMethod,
  InferredField,
  MiddlewareInfo,
  RbacRule,
  SchemaField,
  SchemaInfo,
  SourceLocation,
} from './types';

const HTTP_METHODS = new Set<HttpMethod>([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'all',
]);

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface ExtractorOptions {
  projectRoot: string;
  tsconfigPath: string;
  srcDir: string;
}

interface UseRecord {
  path?: string;
  middlewares: Expression[];
  location: SourceLocation;
  pos: number;
}

interface MountEdge {
  fromFile: string;
  toFile: string;
  prefix: string;
  middlewares: Expression[];
  location: SourceLocation;
  pos: number;
}

interface RouteRecord {
  file: string;
  method: HttpMethod;
  path: string;
  args: Expression[];
  location: SourceLocation;
  pos: number;
}

type HandlerDeclaration = MethodDeclaration | FunctionDeclaration | FunctionExpression | import('ts-morph').ArrowFunction;

interface FileFacts {
  sourceFile: SourceFile;
  importFiles: Map<string, string>;
  routes: RouteRecord[];
  uses: UseRecord[];
  mounts: MountEdge[];
}

interface RouteContext {
  prefix: string;
  middlewares: Expression[];
}

export class ApiExtractionEngine {
  private readonly project: Project;
  private readonly facts = new Map<string, FileFacts>();
  private readonly warnings: string[] = [];

  constructor(private readonly options: ExtractorOptions) {
    this.project = new Project({
      tsConfigFilePath: options.tsconfigPath,
      skipAddingFilesFromTsConfig: false,
    });
  }

  extract(): ExtractionResult {
    const sourceFiles = this.project
      .getSourceFiles()
      .filter((file) => this.isInSrc(file));

    sourceFiles.forEach((file) => this.facts.set(file.getFilePath(), this.collectFileFacts(file)));

    const contexts = this.buildRouteContexts();
    const routes = this.collectRoutes(contexts);

    return {
      generatedAt: new Date().toISOString(),
      projectRoot: this.options.projectRoot,
      tsconfig: this.options.tsconfigPath,
      architecture: [
        'Project loader: ts-morph Project reads tsconfig and builds a semantic source graph.',
        'Route discovery: CallExpression nodes are scanned for router.<method>(path, ...handlers).',
        'Mount discovery: router.use/app.use edges connect imported routers and carry inherited middleware.',
        'Schema extraction: validate(schema) middleware is resolved to Zod object expressions when possible.',
        'RBAC extraction: authorize, authorizeRoles, and authorizePermission calls are normalized into rule objects.',
      ],
      routes,
      summary: {
        routeCount: routes.length,
        routesWithSchemas: routes.filter((route) => route.requestSchemas.length > 0).length,
        routesWithRbac: routes.filter((route) => route.rbac.length > 0).length,
        routesWithInferredBody: routes.filter((route) => route.requestBodyFields.length > 0).length,
        authenticatedRoutes: routes.filter((route) => route.authenticationRequired).length,
        warnings: this.warnings,
      },
    };
  }

  private collectFileFacts(sourceFile: SourceFile): FileFacts {
    const importFiles = this.collectImports(sourceFile);
    const routerNames = this.collectRouterNames(sourceFile);
    const routes: RouteRecord[] = [];
    const uses: UseRecord[] = [];
    const mounts: MountEdge[] = [];

    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
      const callee = call.getExpression();
      if (!Node.isPropertyAccessExpression(callee)) return;
      if (!this.isRouterTarget(callee.getExpression(), routerNames)) return;

      const method = callee.getName().toLowerCase();
      if (!HTTP_METHODS.has(method as HttpMethod) && method !== 'use') return;

      const args = call.getArguments().filter(Node.isExpression);
      if (method === 'use') {
        const useRecord = this.parseUseCall(sourceFile, call, args, importFiles);
        if (useRecord) uses.push(useRecord);
        const mount = this.parseMountCall(sourceFile, call, args, importFiles, uses);
        if (mount) mounts.push(mount);
        return;
      }

      const routePath = args[0] ? this.readPath(args[0]) : undefined;
      if (!routePath) return;

      routes.push({
        file: sourceFile.getFilePath(),
        method: method as HttpMethod,
        path: routePath,
        args: args.slice(1),
        location: this.locationOf(call),
        pos: call.getStart(),
      });
    });

    return { sourceFile, importFiles, routes, uses, mounts };
  }

  private collectRouterNames(sourceFile: SourceFile): Set<string> {
    const names = new Set<string>();
    sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach((declaration) => {
      const init = declaration.getInitializer();
      if (!init || !Node.isCallExpression(init)) return;

      const callee = init.getExpression();
      if (Node.isIdentifier(callee) && (callee.getText() === 'Router' || callee.getText() === 'express')) {
        names.add(declaration.getName());
      }
      if (
        Node.isPropertyAccessExpression(callee) &&
        callee.getName() === 'Router' &&
        callee.getExpression().getText() === 'express'
      ) {
        names.add(declaration.getName());
      }
    });
    return names;
  }

  private isRouterTarget(expr: Expression, routerNames: Set<string>): boolean {
    return Node.isIdentifier(expr) && routerNames.has(expr.getText());
  }

  private collectImports(sourceFile: SourceFile): Map<string, string> {
    const imports = new Map<string, string>();
    sourceFile.getImportDeclarations().forEach((declaration) => {
      const resolved = declaration.getModuleSpecifierSourceFile();
      if (!resolved) return;

      const defaultImport = declaration.getDefaultImport();
      if (defaultImport) imports.set(defaultImport.getText(), resolved.getFilePath());

      const namespaceImport = declaration.getNamespaceImport();
      if (namespaceImport) imports.set(namespaceImport.getText(), resolved.getFilePath());
    });
    return imports;
  }

  private parseUseCall(
    sourceFile: SourceFile,
    call: CallExpression,
    args: Expression[],
    importFiles: Map<string, string>
  ): UseRecord | undefined {
    if (args.length === 0) return undefined;

    const firstPath = this.readPath(args[0]);
    const middlewareArgs = firstPath ? args.slice(1) : args;
    const filtered = middlewareArgs.filter((arg) => !this.resolveImportedRouterFile(arg, importFiles));
    if (filtered.length === 0) return undefined;

    return {
      path: firstPath,
      middlewares: filtered,
      location: this.locationOf(call),
      pos: call.getStart(),
    };
  }

  private parseMountCall(
    sourceFile: SourceFile,
    call: CallExpression,
    args: Expression[],
    importFiles: Map<string, string>,
    uses: UseRecord[]
  ): MountEdge | undefined {
    if (args.length === 0) return undefined;

    const firstPath = this.readPath(args[0]);
    const candidates = firstPath ? args.slice(1) : args;
    const routerArg = candidates.find((candidate) => this.resolveImportedRouterFile(candidate, importFiles));
    if (!routerArg) return undefined;

    const toFile = this.resolveImportedRouterFile(routerArg, importFiles);
    if (!toFile) return undefined;

    const inheritsPriorUses = !/(^|[/\\])app\.tsx?$/.test(sourceFile.getFilePath());
    const inherited = inheritsPriorUses
      ? uses
        .filter((record) => record.pos < call.getStart() && !record.path)
        .flatMap((record) => record.middlewares)
      : [];
    const localMiddlewares = candidates.filter((candidate) => candidate !== routerArg);

    return {
      fromFile: sourceFile.getFilePath(),
      toFile,
      prefix: firstPath || '',
      middlewares: [...inherited, ...localMiddlewares],
      location: this.locationOf(call),
      pos: call.getStart(),
    };
  }

  private buildRouteContexts(): Map<string, RouteContext[]> {
    const contexts = new Map<string, RouteContext[]>();
    const appFiles = [...this.facts.values()].filter((fact) => /(^|[/\\])app\.tsx?$/.test(fact.sourceFile.getFilePath()));

    if (appFiles.length === 0) {
      this.facts.forEach((fact) => this.addContext(contexts, fact.sourceFile.getFilePath(), { prefix: '', middlewares: [] }));
      return contexts;
    }

    const queue: Array<{ file: string; context: RouteContext }> = [];
    appFiles.forEach((fact) => {
      const context = { prefix: '', middlewares: [] };
      this.addContext(contexts, fact.sourceFile.getFilePath(), context);
      queue.push({ file: fact.sourceFile.getFilePath(), context });
    });

    for (let i = 0; i < queue.length; i += 1) {
      const item = queue[i];
      const fact = this.facts.get(item.file);
      if (!fact) continue;

      fact.mounts.forEach((mount) => {
        const nextContext = {
          prefix: joinPaths(item.context.prefix, mount.prefix),
          middlewares: [...item.context.middlewares, ...mount.middlewares],
        };
        const isNew = this.addContext(contexts, mount.toFile, nextContext);
        if (isNew) queue.push({ file: mount.toFile, context: nextContext });
      });
    }

    this.facts.forEach((fact) => {
      if (!contexts.has(fact.sourceFile.getFilePath()) && fact.routes.length > 0) {
        this.addContext(contexts, fact.sourceFile.getFilePath(), { prefix: '', middlewares: [] });
      }
    });

    return contexts;
  }

  private collectRoutes(contexts: Map<string, RouteContext[]>): ExtractedRoute[] {
    const routes: ExtractedRoute[] = [];

    this.facts.forEach((fact, file) => {
      const fileContexts = contexts.get(file) || [];
      fact.routes.forEach((route) => {
        const localInherited = fact.uses
          .filter((record) => record.pos < route.pos && this.useAppliesToRoute(record, route.path))
          .flatMap((record) => record.middlewares);

        const effectiveContexts = fileContexts.length > 0 ? fileContexts : [{ prefix: '', middlewares: [] }];
        effectiveContexts.forEach((context) => {
          const middlewareExprs = [...context.middlewares, ...localInherited, ...this.routeMiddlewareArgs(route.args)];
          const middlewares = middlewareExprs.map((expr) => this.middlewareInfo(expr));
          const handlerExpr = route.args[route.args.length - 1];
          const handlerDeclaration = handlerExpr ? this.resolveHandlerDeclaration(handlerExpr) : undefined;
          routes.push({
            method: route.method.toUpperCase() as Uppercase<HttpMethod>,
            path: joinPaths(context.prefix, route.path),
            localPath: route.path,
            handler: this.handlerName(route.args),
            controller: handlerExpr ? this.controllerName(handlerExpr, handlerDeclaration) : undefined,
            authenticationRequired: this.isAuthenticationRequired(middlewareExprs),
            source: route.location,
            module: path.relative(this.options.projectRoot, file).replace(/\\/g, '/'),
            middlewares,
            requestSchemas: this.extractSchemas(middlewareExprs),
            requestBodyFields: this.inferRequestBodyFields(handlerDeclaration),
            queryParameters: this.inferQueryParameters(handlerDeclaration),
            pathParameters: this.inferPathParameters(joinPaths(context.prefix, route.path), handlerDeclaration),
            rbac: this.extractRbac(middlewareExprs),
          });
        });
      });
    });

    return routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  }

  private resolveHandlerDeclaration(expr: Expression): HandlerDeclaration | undefined {
    if (Node.isCallExpression(expr)) {
      const callee = expr.getExpression();
      if (Node.isPropertyAccessExpression(callee) && callee.getName() === 'bind') {
        const boundTarget = callee.getExpression();
        if (Node.isPropertyAccessExpression(boundTarget)) {
          return this.symbolDeclaration(boundTarget.getNameNode()) as HandlerDeclaration | undefined;
        }
      }
      return this.resolveHandlerDeclaration(callee);
    }
    if (Node.isParenthesizedExpression(expr) || Node.isAsExpression(expr)) {
      return this.resolveHandlerDeclaration(expr.getExpression());
    }
    if (Node.isArrowFunction(expr) || Node.isFunctionExpression(expr)) {
      return expr as FunctionExpression;
    }
    if (Node.isPropertyAccessExpression(expr)) {
      return this.symbolDeclaration(expr.getNameNode()) as HandlerDeclaration | undefined;
    }
    if (Node.isIdentifier(expr)) {
      return this.symbolDeclaration(expr) as HandlerDeclaration | undefined;
    }
    return undefined;
  }

  private controllerName(expr: Expression, declaration?: HandlerDeclaration): string | undefined {
    if (declaration && Node.isMethodDeclaration(declaration)) {
      const parent = declaration.getParent();
      if (Node.isClassDeclaration(parent) && parent.getName()) {
        return `${parent.getName()}.${declaration.getName()}`;
      }
      return declaration.getName();
    }

    if (Node.isCallExpression(expr)) {
      const callee = expr.getExpression();
      if (Node.isPropertyAccessExpression(callee) && callee.getName() === 'bind') {
        const target = callee.getExpression();
        if (Node.isPropertyAccessExpression(target)) {
          return target.getText().replace(/\s+/g, ' ');
        }
      }
    }
    if (Node.isPropertyAccessExpression(expr)) return expr.getText();
    if (declaration && (Node.isFunctionDeclaration(declaration) || Node.isFunctionExpression(declaration))) {
      return declaration.getName();
    }
    return undefined;
  }

  private inferRequestBodyFields(handler?: HandlerDeclaration): InferredField[] {
    if (!handler) return [];
    const body = this.bodyOf(handler);
    if (!body) return [];

    const collector = new InferenceCollector();
    this.collectRequestObjectFields(body, 'body', 'HIGH', 'direct req.body reference', collector);
    this.collectObjectConstructorFields(body, collector);
    this.collectServiceLayerBodyFields(body, collector);
    return collector.values();
  }

  private inferQueryParameters(handler?: HandlerDeclaration): InferredField[] {
    if (!handler) return [];
    const body = this.bodyOf(handler);
    if (!body) return [];

    const collector = new InferenceCollector();
    this.collectRequestObjectFields(body, 'query', 'HIGH', 'direct req.query reference', collector);
    return collector.values();
  }

  private inferPathParameters(routePath: string, handler?: HandlerDeclaration): string[] {
    const params = new Set<string>();
    for (const match of routePath.matchAll(/:([A-Za-z_$][\w$]*)/g)) {
      params.add(match[1]);
    }

    const body = handler ? this.bodyOf(handler) : undefined;
    body?.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression).forEach((access) => {
      const chain = this.propertyPath(access);
      if (chain.length >= 3 && chain[0] === 'req' && chain[1] === 'params') {
        params.add(chain.slice(2).join('.'));
      }
    });
    body?.getDescendantsOfKind(SyntaxKind.ElementAccessExpression).forEach((access) => {
      const base = access.getExpression().getText();
      const arg = access.getArgumentExpression();
      if (base === 'req.params' && arg && Node.isStringLiteral(arg)) {
        params.add(arg.getLiteralText());
      }
    });

    return [...params].sort();
  }

  private collectRequestObjectFields(
    node: Node,
    objectName: 'body' | 'query',
    confidence: 'HIGH' | 'MEDIUM' | 'LOW',
    source: string,
    collector: InferenceCollector
  ): void {
    node.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression).forEach((access) => {
      if (this.isPrefixPropertyAccess(access)) return;
      const chain = this.propertyPath(access);
      if (chain.length >= 3 && chain[0] === 'req' && chain[1] === objectName) {
        collector.add(this.normalizedFieldPath(chain.slice(2)), confidence, source, this.locationOf(access));
      }
    });

    node.getDescendantsOfKind(SyntaxKind.ElementAccessExpression).forEach((access) => {
      const base = access.getExpression().getText();
      const arg = access.getArgumentExpression();
      if (base === `req.${objectName}` && arg && Node.isStringLiteral(arg)) {
        collector.add(arg.getLiteralText(), confidence, source, this.locationOf(access));
      }
    });

    node.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach((declaration) => {
      const nameNode = declaration.getNameNode();
      const init = declaration.getInitializer();
      if (!init || init.getText() !== `req.${objectName}` || !Node.isObjectBindingPattern(nameNode)) return;
      this.bindingPatternFields(nameNode).forEach((field) => {
        collector.add(field, confidence, `${source} destructuring`, this.locationOf(declaration));
      });
    });

    node.getDescendantsOfKind(SyntaxKind.SpreadAssignment).forEach((spread) => {
      if (spread.getExpression().getText() === `req.${objectName}`) {
        collector.add('*', 'LOW', `spread from req.${objectName}`, this.locationOf(spread));
      }
    });
  }

  private collectObjectConstructorFields(node: Node, collector: InferenceCollector): void {
    node.getDescendantsOfKind(SyntaxKind.NewExpression).forEach((expr) => {
      expr.getArguments().filter(Node.isObjectLiteralExpression).forEach((objectLiteral) => {
        objectLiteral.getProperties().forEach((property) => {
          if (!Node.isPropertyAssignment(property)) return;
          const init = property.getInitializer();
          if (!init) return;
          const bodyPath = this.reqBodyPath(init);
          if (bodyPath) {
            collector.add(bodyPath, 'HIGH', `constructor field ${property.getName()}`, this.locationOf(property));
          }
        });
      });
    });
  }

  private collectServiceLayerBodyFields(node: Node, collector: InferenceCollector): void {
    node.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
      const args = call.getArguments().filter(Node.isExpression);
      args.forEach((arg, index) => {
        if (!this.isReqBodyExpression(arg)) return;
        const declaration = this.calledFunctionDeclaration(call);
        if (!declaration) return;
        const params = declaration.getParameters();
        const param = params[index];
        if (!param) return;
        const paramName = param.getName();
        const body = this.bodyOf(declaration);
        if (!body) return;
        this.collectParameterFields(body, paramName, collector, `service-layer tracing via ${this.callName(call)}`);
      });
    });
  }

  private collectParameterFields(node: Node, paramName: string, collector: InferenceCollector, source: string): void {
    node.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression).forEach((access) => {
      if (this.isPrefixPropertyAccess(access)) return;
      const chain = this.propertyPath(access);
      if (chain.length >= 2 && chain[0] === paramName) {
        collector.add(this.normalizedFieldPath(chain.slice(1)), 'MEDIUM', source, this.locationOf(access));
      }
    });

    node.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach((declaration) => {
      const nameNode = declaration.getNameNode();
      const init = declaration.getInitializer();
      if (!init || init.getText() !== paramName || !Node.isObjectBindingPattern(nameNode)) return;
      this.bindingPatternFields(nameNode).forEach((field) => {
        collector.add(field, 'MEDIUM', `${source} destructuring`, this.locationOf(declaration));
      });
    });

    node.getDescendantsOfKind(SyntaxKind.SpreadAssignment).forEach((spread) => {
      if (spread.getExpression().getText() === paramName) {
        collector.add('*', 'LOW', `${source} spread`, this.locationOf(spread));
      }
    });
  }

  private calledFunctionDeclaration(call: CallExpression): HandlerDeclaration | undefined {
    const callee = call.getExpression();
    if (Node.isPropertyAccessExpression(callee)) {
      return this.symbolDeclaration(callee.getNameNode()) as HandlerDeclaration | undefined;
    }
    if (Node.isIdentifier(callee)) {
      return this.symbolDeclaration(callee) as HandlerDeclaration | undefined;
    }
    return undefined;
  }

  private bodyOf(declaration: HandlerDeclaration | Node): Node | undefined {
    if (
      Node.isMethodDeclaration(declaration) ||
      Node.isFunctionDeclaration(declaration) ||
      Node.isFunctionExpression(declaration) ||
      Node.isArrowFunction(declaration)
    ) {
      return declaration.getBody();
    }
    return undefined;
  }

  private bindingPatternFields(pattern: Node): string[] {
    if (!Node.isObjectBindingPattern(pattern)) return [];
    return pattern.getElements().flatMap((element) => {
      const propertyName = element.getPropertyNameNode()?.getText().replace(/^['"]|['"]$/g, '');
      const nameNode = element.getNameNode();
      const baseName = propertyName || nameNode.getText().replace(/^['"]|['"]$/g, '');
      if (Node.isObjectBindingPattern(nameNode)) {
        return this.bindingPatternFields(nameNode).map((field) => `${baseName}.${field}`);
      }
      return [baseName];
    });
  }

  private reqBodyPath(expr: Expression): string | undefined {
    const chain = this.propertyPath(expr);
    if (chain.length >= 3 && chain[0] === 'req' && chain[1] === 'body') {
      return this.normalizedFieldPath(chain.slice(2));
    }
    return undefined;
  }

  private isReqBodyExpression(expr: Expression): boolean {
    return expr.getText() === 'req.body';
  }

  private propertyPath(node: Node): string[] {
    if (Node.isParenthesizedExpression(node) || Node.isAsExpression(node)) {
      return this.propertyPath(node.getExpression());
    }
    if (Node.isIdentifier(node)) return [node.getText()];
    if (Node.isPropertyAccessExpression(node)) {
      return [...this.propertyPath(node.getExpression()), node.getName()];
    }
    return [];
  }

  private isPrefixPropertyAccess(access: PropertyAccessExpression): boolean {
    const parent = access.getParent();
    return Node.isPropertyAccessExpression(parent) && parent.getExpression() === access;
  }

  private normalizedFieldPath(parts: string[]): string {
    const terminalMethods = new Set([
      'trim',
      'toString',
      'toLowerCase',
      'toUpperCase',
      'toISOString',
      'map',
      'filter',
      'reduce',
      'includes',
    ]);
    const normalized = [...parts];
    while (normalized.length > 1 && terminalMethods.has(normalized[normalized.length - 1])) {
      normalized.pop();
    }
    return normalized.join('.');
  }

  private symbolDeclaration(node: Node): Node | undefined {
    const symbol = node.getSymbol();
    const aliasedSymbol = symbol?.getAliasedSymbol();
    return aliasedSymbol?.getDeclarations()[0] || symbol?.getDeclarations()[0];
  }

  private isAuthenticationRequired(middlewareExprs: Expression[]): boolean {
    return middlewareExprs.some((middleware) => {
      const text = middleware.getText();
      const name = this.middlewareName(middleware);
      return /auth|authenticate|jwt|tenant|authorize|adminOnly|adminAuth/i.test(`${name} ${text}`);
    });
  }

  private routeMiddlewareArgs(args: Expression[]): Expression[] {
    if (args.length <= 1) return [];
    return args.slice(0, -1);
  }

  private handlerName(args: Expression[]): string | undefined {
    const handler = args[args.length - 1];
    if (!handler) return undefined;
    return handler.getText().replace(/\s+/g, ' ');
  }

  private middlewareInfo(expr: Expression): MiddlewareInfo {
    return {
      name: this.middlewareName(expr),
      text: expr.getText().replace(/\s+/g, ' '),
      source: 'route',
      location: this.locationOf(expr),
    };
  }

  private middlewareName(expr: Expression): string {
    if (Node.isCallExpression(expr)) return this.callName(expr);
    if (Node.isIdentifier(expr)) return expr.getText();
    if (Node.isPropertyAccessExpression(expr)) return expr.getName();
    return expr.getText().replace(/\s+/g, ' ');
  }

  private extractSchemas(middlewares: Expression[]): SchemaInfo[] {
    return middlewares.flatMap((middleware) => {
      if (!Node.isCallExpression(middleware)) return [];
      const name = this.callName(middleware);
      if (!['validate', 'validateBody', 'validateRequest', 'validateSchema'].includes(name)) return [];

      const schemaExpr = middleware.getArguments().find(Node.isExpression);
      if (!schemaExpr) return [];

      return [this.schemaInfo(schemaExpr)];
    });
  }

  private schemaInfo(expr: Expression): SchemaInfo {
    const resolved = this.resolveExpression(expr);
    const target = resolved || expr;
    const objectCall = this.findZodObjectCall(target);
    if (!objectCall) {
      return {
        name: Node.isIdentifier(expr) ? expr.getText() : undefined,
        raw: target.getText().replace(/\s+/g, ' '),
        kind: 'unknown',
        unresolved: resolved ? undefined : [expr.getText()],
      };
    }

    const objectArg = objectCall.getArguments()[0];
    return {
      name: Node.isIdentifier(expr) ? expr.getText() : undefined,
      raw: target.getText().replace(/\s+/g, ' '),
      kind: 'zod',
      fields: Node.isObjectLiteralExpression(objectArg) ? this.zodFields(objectArg) : undefined,
    };
  }

  private zodFields(objectLiteral: ObjectLiteralExpression): SchemaField[] {
    return objectLiteral.getProperties().flatMap((property) => {
      if (!Node.isPropertyAssignment(property)) return [];
      const name = property.getName().replace(/^['"]|['"]$/g, '');
      const init = property.getInitializer();
      if (!init) return [];

      const raw = init.getText();
      const required = !/\.(optional|nullish)\s*\(/.test(raw);
      const type = this.zodType(init);
      const nestedCall = this.findZodObjectCall(init);
      const nestedArg = nestedCall?.getArguments()[0];

      return [{
        name,
        type,
        required,
        checks: this.zodChecks(raw),
        fields: nestedArg && Node.isObjectLiteralExpression(nestedArg) ? this.zodFields(nestedArg) : undefined,
      }];
    });
  }

  private zodType(expr: Expression): string {
    const text = expr.getText();
    const match = text.match(/z\.(string|number|boolean|date|array|object|enum|nativeEnum|literal|record|union|unknown|any)\s*\(/);
    return match?.[1] || 'unknown';
  }

  private zodChecks(raw: string): string[] {
    const checks: string[] = [];
    const regex = /\.(min|max|email|url|uuid|regex|length|int|positive|nonempty|default|nullable|optional|nullish)\s*\(/g;
    let match = regex.exec(raw);
    while (match) {
      checks.push(match[1]);
      match = regex.exec(raw);
    }
    return checks;
  }

  private extractRbac(middlewares: Expression[]): RbacRule[] {
    return middlewares.flatMap((middleware) => {
      if (!Node.isCallExpression(middleware)) return [];
      const helper = this.callName(middleware);
      if (helper === 'authorizeRoles') {
        return [{
          helper,
          roles: this.flattenValues(middleware.getArguments().filter(Node.isExpression)),
          raw: middleware.getText().replace(/\s+/g, ' '),
        }];
      }
      if (helper === 'authorizePermission') {
        const args = middleware.getArguments().filter(Node.isExpression);
        return [{
          helper,
          resourceType: args[0] ? String(this.evaluate(args[0]) ?? args[0].getText()) : undefined,
          permissions: this.flattenValues(args.slice(1)),
          raw: middleware.getText().replace(/\s+/g, ' '),
        }];
      }
      if (helper !== 'authorize') return [];

      return middleware.getArguments().filter(Node.isExpression).map((arg) => this.authorizeRule(arg, helper));
    });
  }

  private authorizeRule(arg: Expression, helper: string): RbacRule {
    const value = this.evaluate(arg);
    if (Array.isArray(value)) {
      return { helper, roles: value.map(String), raw: arg.getText().replace(/\s+/g, ' ') };
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const objectValue = value as Record<string, JsonValue>;
      return {
        helper,
        roles: this.jsonArray(objectValue.roles),
        permissions: this.jsonArray(objectValue.permissions),
        resourceType: objectValue.resourceType === undefined ? undefined : String(objectValue.resourceType),
        departmentTypes: this.jsonArray(objectValue.departmentTypes),
        departmentRoles: this.jsonArray(objectValue.departmentRoles),
        raw: arg.getText().replace(/\s+/g, ' '),
      };
    }
    return { helper, raw: arg.getText().replace(/\s+/g, ' '), unresolved: [arg.getText()] };
  }

  private jsonArray(value: JsonValue | undefined): string[] | undefined {
    return Array.isArray(value) ? value.map(String) : undefined;
  }

  private flattenValues(expressions: Expression[]): string[] {
    return expressions.flatMap((expr) => {
      if (Node.isSpreadElement(expr)) {
        const value = this.evaluate(expr.getExpression());
        return Array.isArray(value) ? value.map(String) : [expr.getText()];
      }
      const value = this.evaluate(expr);
      return Array.isArray(value) ? value.map(String) : [String(value ?? expr.getText())];
    });
  }

  private evaluate(expr: Expression, seen = new Set<string>()): JsonValue | undefined {
    if (Node.isStringLiteral(expr) || Node.isNoSubstitutionTemplateLiteral(expr)) return expr.getLiteralText();
    if (Node.isNumericLiteral(expr)) return Number(expr.getText());
    if (expr.getKind() === SyntaxKind.TrueKeyword) return true;
    if (expr.getKind() === SyntaxKind.FalseKeyword) return false;
    if (expr.getKind() === SyntaxKind.NullKeyword) return null;
    if (Node.isAsExpression(expr) || Node.isTypeAssertion(expr) || Node.isParenthesizedExpression(expr)) {
      return this.evaluate(expr.getExpression(), seen);
    }
    if (Node.isArrayLiteralExpression(expr)) {
      return this.evaluateArray(expr, seen);
    }
    if (Node.isObjectLiteralExpression(expr)) {
      const out: Record<string, JsonValue> = {};
      expr.getProperties().forEach((property) => {
        if (!Node.isPropertyAssignment(property)) return;
        const init = property.getInitializer();
        if (!init) return;
        const value = this.evaluate(init, seen);
        out[property.getName().replace(/^['"]|['"]$/g, '')] = value ?? init.getText();
      });
      return out;
    }
    if (Node.isIdentifier(expr) || Node.isPropertyAccessExpression(expr)) {
      return this.evaluateSymbol(expr, seen);
    }
    return undefined;
  }

  private evaluateArray(expr: ArrayLiteralExpression, seen: Set<string>): JsonValue[] {
    return expr.getElements().flatMap((element) => {
      if (Node.isSpreadElement(element)) {
        const spreadValue = this.evaluate(element.getExpression(), seen);
        return Array.isArray(spreadValue) ? spreadValue : [element.getText()];
      }
      if (Node.isExpression(element)) {
        const value = this.evaluate(element, seen);
        return [value ?? element.getText()];
      }
      return [];
    });
  }

  private evaluateSymbol(expr: Identifier | PropertyAccessExpression, seen: Set<string>): JsonValue | undefined {
    const key = `${expr.getSourceFile().getFilePath()}:${expr.getText()}`;
    if (seen.has(key)) return undefined;
    seen.add(key);

    const symbol = expr.getSymbol();
    const aliasedSymbol = symbol?.getAliasedSymbol();
    const declaration =
      aliasedSymbol?.getDeclarations()[0] ||
      symbol?.getDeclarations()[0] ||
      expr.getType().getSymbol()?.getDeclarations()[0];
    if (!declaration) return expr.getText();

    if (Node.isEnumMember(declaration)) {
      const init = declaration.getInitializer();
      return init && (Node.isStringLiteral(init) || Node.isNumericLiteral(init))
        ? this.evaluate(init, seen)
        : declaration.getName();
    }
    if (Node.isImportSpecifier(declaration)) {
      const exportedName = declaration.getName();
      const exportedDeclarations = declaration
        .getImportDeclaration()
        .getModuleSpecifierSourceFile()
        ?.getExportedDeclarations()
        .get(exportedName);
      const exportedDeclaration = exportedDeclarations?.[0];
      if (exportedDeclaration && Node.isVariableDeclaration(exportedDeclaration)) {
        const init = exportedDeclaration.getInitializer();
        return init ? this.evaluate(init, seen) : expr.getText();
      }
    }
    if (Node.isVariableDeclaration(declaration)) {
      const init = declaration.getInitializer();
      return init ? this.evaluate(init, seen) : expr.getText();
    }
    return expr.getText();
  }

  private resolveExpression(expr: Expression): Expression | undefined {
    if (!Node.isIdentifier(expr)) return undefined;
    const declaration = expr.getSymbol()?.getDeclarations().find(Node.isVariableDeclaration) as VariableDeclaration | undefined;
    return declaration?.getInitializer();
  }

  private findZodObjectCall(expr: Expression): CallExpression | undefined {
    const calls = Node.isCallExpression(expr) ? [expr, ...expr.getDescendantsOfKind(SyntaxKind.CallExpression)] : expr.getDescendantsOfKind(SyntaxKind.CallExpression);
    return calls.find((call) => {
      const callee = call.getExpression();
      return Node.isPropertyAccessExpression(callee) && callee.getExpression().getText() === 'z' && callee.getName() === 'object';
    });
  }

  private callName(call: CallExpression): string {
    const expr = call.getExpression();
    if (Node.isIdentifier(expr)) return expr.getText();
    if (Node.isPropertyAccessExpression(expr)) return expr.getName();
    return expr.getText();
  }

  private useAppliesToRoute(record: UseRecord, routePath: string): boolean {
    if (!record.path) return true;
    return routePath === record.path || routePath.startsWith(`${record.path}/`);
  }

  private readPath(expr: Expression): string | undefined {
    const value = this.evaluate(expr);
    return typeof value === 'string' ? value : undefined;
  }

  private resolveImportedRouterFile(expr: Expression, importFiles: Map<string, string>): string | undefined {
    if (Node.isIdentifier(expr)) return importFiles.get(expr.getText());
    if (Node.isAsExpression(expr) || Node.isParenthesizedExpression(expr)) {
      return this.resolveImportedRouterFile(expr.getExpression(), importFiles);
    }
    return undefined;
  }

  private addContext(contexts: Map<string, RouteContext[]>, file: string, context: RouteContext): boolean {
    const existing = contexts.get(file) || [];
    const key = this.contextKey(context);
    if (existing.some((item) => this.contextKey(item) === key)) return false;
    contexts.set(file, [...existing, context]);
    return true;
  }

  private contextKey(context: RouteContext): string {
    return `${context.prefix}|${context.middlewares.map((middleware) => middleware.getText()).join(',')}`;
  }

  private locationOf(node: Node): SourceLocation {
    const sourceFile = node.getSourceFile();
    const pos = sourceFile.getLineAndColumnAtPos(node.getStart());
    return {
      file: path.relative(this.options.projectRoot, sourceFile.getFilePath()).replace(/\\/g, '/'),
      line: pos.line,
      column: pos.column,
    };
  }

  private isInSrc(file: SourceFile): boolean {
    const relative = path.relative(this.options.srcDir, file.getFilePath());
    return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
  }
}

function joinPaths(left: string, right: string): string {
  const combined = `/${[left, right]
    .filter(Boolean)
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/')}`;
  return combined === '/' ? '/' : combined.replace(/\/+/g, '/');
}

class InferenceCollector {
  private readonly fields = new Map<string, InferredField>();

  add(
    name: string,
    confidence: InferredField['confidence'],
    source: string,
    location?: SourceLocation
  ): void {
    if (!name) return;
    const existing = this.fields.get(name);
    if (existing && confidenceRank(existing.confidence) >= confidenceRank(confidence)) return;
    this.fields.set(name, { name, confidence, source, location });
  }

  values(): InferredField[] {
    return [...this.fields.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}

function confidenceRank(confidence: InferredField['confidence']): number {
  if (confidence === 'HIGH') return 3;
  if (confidence === 'MEDIUM') return 2;
  return 1;
}

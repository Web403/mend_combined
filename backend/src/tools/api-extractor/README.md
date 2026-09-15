# Express TypeScript API Extractor

This CLI extracts API intelligence from modular Express + TypeScript projects using `ts-morph`.
It is static-analysis only; it does not import or execute the application.

## Architecture

- `cli.ts` parses flags, runs the engine, and writes JSON to stdout or `--out`.
- `engine.ts` owns all AST traversal, graph construction, schema extraction, and RBAC extraction.
- `report.ts` renders a human-readable Markdown inventory.
- `types.ts` defines the stable JSON shape.

## AST Traversal Strategy

The engine creates a `ts-morph` `Project` from `tsconfig.json`, scans source files under `src`, and reads `CallExpression` nodes.
Only calls on variables initialized as `Router()`, `express.Router()`, or `express()` are treated as Express calls, which prevents false positives such as `map.get(...)` or `store.delete(...)`.

## Route Discovery Algorithm

1. Detect Express router/app variables.
2. Match `router.get/post/put/patch/delete/options/head/all(path, ...handlers)`.
3. Resolve literal paths and imported path constants.
4. Capture the final argument as the handler and preceding arguments as route middleware.
5. Sort output by full path and HTTP method.

## Middleware Discovery Algorithm

1. Capture `router.use(...)` calls before each route.
2. Apply pathless `router.use(auth, tenant)` to later routes and child router mounts.
3. Apply pathful `router.use('/prefix', childRouter)` as mount edges.
4. Carry inherited middleware through router graph traversal.

## Zod Schema Extraction Algorithm

The engine looks for validation middleware named `validate`, `validateBody`, `validateRequest`, or `validateSchema`.
For `validate(CreateUserSchema)`, it resolves the identifier to its initializer and summarizes `z.object({ ... })` fields, basic Zod types, requiredness, nested objects, and common checks such as `min`, `max`, `email`, `optional`, and `nullable`.

## Request Body Inference

The engine does not require Zod. It infers fields from:

- `const { name, email } = req.body` as `HIGH`
- `req.body.name` and `req.body.address.city` as `HIGH`
- `new User({ name: req.body.name })` as `HIGH`
- `service.create(req.body)` followed into the called method as `MEDIUM`
- Object spreads from request body or traced DTOs as `LOW`

Service tracing follows the called method declaration and inspects the corresponding parameter for property reads, destructuring, and spreads.
Terminal transform calls such as `.trim()` are normalized back to the underlying field.

## Query And Path Parameters

Query parameters are inferred from `req.query.name`, `req.query["name"]`, and destructuring from `req.query`.
Path parameters are extracted from Express path segments like `/:id` and from direct `req.params` reads in controllers.

## RBAC Extraction Algorithm

Supported forms:

- `authorize(["ADMIN"])`
- `authorize({ roles: ["ADMIN"] })`
- `authorize({ permissions: [Permission.MANAGE_RBAC] })`
- `authorizeRoles(AdminRole.MENDADMIN)`
- `authorizeRoles(...manageRoles)`
- `authorizePermission(ResourceType.USERS, Permission.CREATE_USERS)`

Identifiers, enum members, arrays, spreads, and object literals are resolved through TypeScript symbols when possible.

## JSON Output

The output contains:

- `routes[].method`
- `routes[].path`
- `routes[].handler`
- `routes[].middlewares`
- `routes[].requestSchemas`
- `routes[].rbac`
- `routes[].source`
- `summary.routeCount`
- `summary.routesWithSchemas`
- `summary.routesWithRbac`
- `summary.warnings`

## CLI

```bash
npm run build
npm run extract:api -- --out api-routes.json
npm run report:api
```

Options:

- `--root <dir>`
- `--tsconfig <file>`
- `--src <dir>`
- `--out <file>`
- `--format <json|markdown>`
- `--compact`

## Performance

The engine uses one `Project` load, one pass per source file to collect facts, and a BFS over router mount edges.
Symbol resolution is used only for values that affect paths, schemas, and RBAC rules.
For larger repos, keep the `--src` directory narrow and avoid adding generated files to `tsconfig.json`.

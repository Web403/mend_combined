export type HttpMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'options'
  | 'head'
  | 'all';

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

export interface MiddlewareInfo {
  name: string;
  text: string;
  source: 'route' | 'inherited' | 'mount';
  location: SourceLocation;
}

export interface RbacRule {
  helper: string;
  roles?: string[];
  permissions?: string[];
  resourceType?: string;
  departmentTypes?: string[];
  departmentRoles?: string[];
  raw: string;
  unresolved?: string[];
}

export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  checks: string[];
  fields?: SchemaField[];
}

export interface SchemaInfo {
  name?: string;
  raw: string;
  kind: 'zod' | 'unknown';
  fields?: SchemaField[];
  unresolved?: string[];
}

export type InferenceConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface InferredField {
  name: string;
  confidence: InferenceConfidence;
  source: string;
  location?: SourceLocation;
}

export interface ExtractedRoute {
  method: Uppercase<HttpMethod>;
  path: string;
  localPath: string;
  handler?: string;
  controller?: string;
  authenticationRequired: boolean;
  source: SourceLocation;
  module: string;
  middlewares: MiddlewareInfo[];
  requestSchemas: SchemaInfo[];
  requestBodyFields: InferredField[];
  queryParameters: InferredField[];
  pathParameters: string[];
  rbac: RbacRule[];
}

export interface ExtractorSummary {
  routeCount: number;
  routesWithSchemas: number;
  routesWithRbac: number;
  routesWithInferredBody: number;
  authenticatedRoutes: number;
  warnings: string[];
}

export interface ExtractionResult {
  generatedAt: string;
  projectRoot: string;
  tsconfig: string;
  architecture: string[];
  routes: ExtractedRoute[];
  summary: ExtractorSummary;
}

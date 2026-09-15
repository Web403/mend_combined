#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { ApiExtractionEngine } from './engine';
import { renderHtmlReport } from './html-report';
import { renderMarkdownReport } from './report';

interface CliArgs {
  projectRoot: string;
  tsconfigPath: string;
  srcDir: string;
  outPath?: string;
  pretty: boolean;
  format?: 'json' | 'markdown' | 'html';
}

function parseArgs(argv: string[]): CliArgs {
  const cwd = process.cwd();
  const args: CliArgs = {
    projectRoot: cwd,
    tsconfigPath: path.join(cwd, 'tsconfig.json'),
    srcDir: path.join(cwd, 'src'),
    pretty: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--root' && next) {
      args.projectRoot = path.resolve(next);
      i += 1;
    } else if (arg === '--tsconfig' && next) {
      args.tsconfigPath = path.resolve(next);
      i += 1;
    } else if (arg === '--src' && next) {
      args.srcDir = path.resolve(next);
      i += 1;
    } else if (arg === '--out' && next) {
      args.outPath = path.resolve(next);
      i += 1;
    } else if (arg === '--compact') {
      args.pretty = false;
    } else if (arg === '--format' && (next === 'json' || next === 'markdown' || next === 'html')) {
      args.format = next;
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!path.isAbsolute(args.tsconfigPath)) args.tsconfigPath = path.join(args.projectRoot, args.tsconfigPath);
  if (!path.isAbsolute(args.srcDir)) args.srcDir = path.join(args.projectRoot, args.srcDir);

  return args;
}

function printHelp(): void {
  process.stdout.write(`Express TypeScript API extractor

Usage:
  npm run build
  npm run extract:api -- [options]

Options:
  --root <dir>       Project root. Defaults to current working directory.
  --tsconfig <file>  tsconfig path. Defaults to <root>/tsconfig.json.
  --src <dir>        Source directory. Defaults to <root>/src.
  --out <file>       Write JSON to a file. Defaults to stdout.
  --format <format>  json, markdown, or html. Defaults from --out extension when possible.
  --compact          Emit compact JSON.
  --help             Show this help.
`);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const engine = new ApiExtractionEngine(args);
  const result = engine.extract();
  const format = args.format || inferFormat(args.outPath);
  const output = renderOutput(result, format, args.pretty);

  if (args.outPath) {
    fs.mkdirSync(path.dirname(args.outPath), { recursive: true });
    fs.writeFileSync(args.outPath, output, 'utf8');
    process.stdout.write(`Extracted ${result.summary.routeCount} routes to ${args.outPath}\n`);
    return;
  }

  process.stdout.write(output);
}

main();

function inferFormat(outPath?: string): 'json' | 'markdown' | 'html' {
  const lower = outPath?.toLowerCase() || '';
  if (lower.endsWith('.md')) return 'markdown';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
  return 'json';
}

function renderOutput(
  result: ReturnType<ApiExtractionEngine['extract']>,
  format: 'json' | 'markdown' | 'html',
  pretty: boolean
): string {
  if (format === 'markdown') return renderMarkdownReport(result);
  if (format === 'html') return renderHtmlReport(result);
  return `${JSON.stringify(result, null, pretty ? 2 : 0)}\n`;
}

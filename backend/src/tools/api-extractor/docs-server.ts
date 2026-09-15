import fs from 'fs';
import http from 'http';
import path from 'path';

const host = process.env.API_DOCS_HOST || '127.0.0.1';
const port = Number(process.env.API_DOCS_PORT || 5500);
const filePath = path.resolve(process.cwd(), process.env.API_DOCS_FILE || 'API_DOCS.html');

const server = http.createServer((req, res) => {
  if (!req.url || req.url === '/' || req.url.startsWith('/API_DOCS.html')) {
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Missing ${filePath}. Run npm run docs:api first.\n`);
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found\n');
});

server.listen(port, host, () => {
  process.stdout.write(`API docs available at http://${host}:${port}/API_DOCS.html\n`);
});


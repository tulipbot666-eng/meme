const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const API_KEY = 'ed0ffb867ee74a33b29258b6798ea262';
const PORT    = process.env.PORT || 3000;

function proxyToAssembly(req, res, targetPath, bodyData) {
  const options = {
    hostname: 'api.assemblyai.com',
    path: targetPath,
    method: req.method,
    headers: {
      'authorization': API_KEY,
      'content-type': req.headers['content-type'] || 'application/octet-stream'
    }
  };
  if (bodyData) options.headers['content-length'] = bodyData.length;

  const proxy = https.request(options, (asmRes) => {
    let data = '';
    asmRes.on('data', c => data += c);
    asmRes.on('end', () => {
      res.writeHead(asmRes.statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    });
  });
  proxy.on('error', err => {
    res.writeHead(500, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: err.message}));
  });
  if (bodyData) proxy.write(bodyData);
  proxy.end();
}

http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  const p = parsed.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // Proxy API calls to AssemblyAI
  if (p.startsWith('/api/')) {
    const targetPath = p.replace('/api', '');
    if (req.method === 'GET') {
      return proxyToAssembly(req, res, targetPath, null);
    }
    let body = [];
    req.on('data', c => body.push(c));
    req.on('end', () => proxyToAssembly(req, res, targetPath, Buffer.concat(body)));
    return;
  }

  // Serve memesync.html
  if (p === '/' || p === '/index.html' || p === '/memesync.html') {
    const f = path.join(__dirname, 'memesync.html');
    if (!fs.existsSync(f)) {
      res.writeHead(404); return res.end('memesync.html nao encontrado');
    }
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    return res.end(fs.readFileSync(f));
  }

  res.writeHead(404); res.end('404');

}).listen(PORT, () => {
  console.log(`\n  🎵  MemeSync rodando na porta ${PORT}\n`);
});

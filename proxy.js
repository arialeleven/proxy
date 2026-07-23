'use strict';

/**
 * Simple HTTP/1.1 forward proxy with Basic (login:password) authentication.
 *
 * Supports:
 *   - Plain HTTP requests (GET/POST/... with absolute-form request targets)
 *   - HTTPS tunneling via the CONNECT method
 *   - Proxy-Authorization: Basic <base64(login:password)>
 *
 * Uses only Node.js built-in modules (no external dependencies).
 */

const http = require('http');
const net = require('net');
const url = require('url');

const config = require('./config');

const HOST = process.env.PROXY_HOST || config.host || '0.0.0.0';
const PORT = parseInt(process.env.PROXY_PORT || config.port || '8080', 10);

/**
 * Build the set of allowed credentials as a Set of "login:password" strings.
 * Credentials come from config.users and/or the PROXY_USERS env var
 * (format: "user1:pass1,user2:pass2").
 */
function loadCredentials() {
  const creds = new Set();

  for (const [login, password] of Object.entries(config.users || {})) {
    creds.add(`${login}:${password}`);
  }

  if (process.env.PROXY_USERS) {
    for (const pair of process.env.PROXY_USERS.split(',')) {
      const trimmed = pair.trim();
      if (trimmed.includes(':')) {
        creds.add(trimmed);
      }
    }
  }

  return creds;
}

const credentials = loadCredentials();

if (credentials.size === 0) {
  console.warn(
    '[proxy] WARNING: no credentials configured. Set them in config.js ' +
      'or via the PROXY_USERS env var (e.g. PROXY_USERS="alice:secret").'
  );
}

/**
 * Verify the Proxy-Authorization header against the allowed credentials.
 * Returns the authenticated login on success, or null on failure.
 */
function authenticate(req) {
  const header = req.headers['proxy-authorization'];
  if (!header) {
    return null;
  }

  const [scheme, encoded] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) {
    return null;
  }

  let decoded;
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
  } catch (err) {
    return null;
  }

  if (!credentials.has(decoded)) {
    return null;
  }

  const sep = decoded.indexOf(':');
  return sep >= 0 ? decoded.slice(0, sep) : decoded;
}

/** Send a 407 response asking the client to authenticate (for plain HTTP). */
function requireAuthHttp(res) {
  res.writeHead(407, {
    'Proxy-Authenticate': 'Basic realm="proxy"',
    'Content-Type': 'text/plain',
    Connection: 'close',
  });
  res.end('407 Proxy Authentication Required\n');
}

/** Send a 407 response over a raw socket (for CONNECT tunnels). */
function requireAuthSocket(socket) {
  socket.write(
    'HTTP/1.1 407 Proxy Authentication Required\r\n' +
      'Proxy-Authenticate: Basic realm="proxy"\r\n' +
      'Content-Length: 0\r\n' +
      'Connection: close\r\n' +
      '\r\n'
  );
  socket.end();
}

const server = http.createServer();

// ---- Plain HTTP proxying ----
server.on('request', (clientReq, clientRes) => {
  const login = authenticate(clientReq);
  if (!login) {
    requireAuthHttp(clientRes);
    return;
  }

  const target = url.parse(clientReq.url);
  if (!target.host) {
    clientRes.writeHead(400, { 'Content-Type': 'text/plain' });
    clientRes.end('400 Bad Request: absolute URL required\n');
    return;
  }

  // Strip hop-by-hop headers before forwarding.
  const headers = Object.assign({}, clientReq.headers);
  delete headers['proxy-authorization'];
  delete headers['proxy-connection'];

  const options = {
    host: target.hostname,
    port: target.port || 80,
    method: clientReq.method,
    path: target.path || '/',
    headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes);
  });

  proxyReq.on('error', (err) => {
    console.error(`[proxy] HTTP error for ${target.host}: ${err.message}`);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
    }
    clientRes.end('502 Bad Gateway\n');
  });

  clientReq.pipe(proxyReq);
  console.log(`[proxy] ${login} ${clientReq.method} ${clientReq.url}`);
});

// ---- HTTPS tunneling via CONNECT ----
server.on('connect', (req, clientSocket, head) => {
  const login = authenticate(req);
  if (!login) {
    requireAuthSocket(clientSocket);
    return;
  }

  const [host, portStr] = req.url.split(':');
  const port = parseInt(portStr, 10) || 443;

  const serverSocket = net.connect(port, host, () => {
    clientSocket.write(
      'HTTP/1.1 200 Connection Established\r\n' +
        'Proxy-agent: node-proxy\r\n' +
        '\r\n'
    );
    if (head && head.length) {
      serverSocket.write(head);
    }
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    console.error(`[proxy] CONNECT error for ${req.url}: ${err.message}`);
    clientSocket.end();
  });

  clientSocket.on('error', () => {
    serverSocket.end();
  });

  console.log(`[proxy] ${login} CONNECT ${req.url}`);
});

server.on('clientError', (err, socket) => {
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[proxy] HTTP/1.1 forward proxy listening on ${HOST}:${PORT}`);
  console.log(`[proxy] ${credentials.size} credential(s) loaded`);
});

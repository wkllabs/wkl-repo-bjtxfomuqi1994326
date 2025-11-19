// server.js
const http = require('http');
const { exec } = require('child_process');

const PORT = process.env.PORT || 80;
const REQUIRE_API_KEY = !!process.env.ADMIN_API_KEY;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

// Whitelisted commands: map a short "command name" => actual shell command.
// Only these keys may be requested via /cmd?command=<key>
const ALLOWED_COMMANDS = {
  // example friendly command names
  uptime: 'uptime',
  disk: 'df -h',
  memory: 'free -m',
  // add more safe commands here if required
};

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj, null, 2));
}

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    const fullUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = fullUrl.pathname;

    // Default route
    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simple Node.js App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #000; color: #fff; min-height: 100vh;
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .container { text-align: center; max-width: 720px; }
    h1 { font-size: 3rem; margin-bottom: 1rem; font-weight: 300; }
    p { font-size: 1.1rem; color: #ccc; margin-bottom: 1.5rem; }
    .info { background: #111; padding: 1.5rem; border-radius: 8px; margin-top: 1.5rem; }
    .info-item { margin: .6rem 0; padding: .5rem; border-bottom: 1px solid #222; }
    .label { color: #888; font-size: 0.9rem; }
    .value { color: #fff; font-size: 1.05rem; margin-top: .25rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Simple Node.js Application</h1>
    <p>Running in a Docker container on Azure App Service (or similar)</p>
    <div class="info">
      <div class="info-item"><div class="label">Server</div><div class="value">Node.js ${process.version}</div></div>
      <div class="info-item"><div class="label">Port</div><div class="value">${PORT}</div></div>
      <div class="info-item"><div class="label">Platform</div><div class="value">${process.platform}</div></div>
      <div class="info-item"><div class="label">Uptime</div><div class="value">${Math.floor(process.uptime())} seconds</div></div>
    </div>
  </div>
</body>
</html>
      `);
      return;
    }

    // Health route
    if (pathname === '/health') {
      sendJson(res, 200, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime_seconds: process.uptime()
      });
      return;
    }

    // /cmd route (SAFE: only runs whitelisted commands)
    if (pathname === '/cmd') {
      // Enforce GET for simplicity
      if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'Method not allowed. Use GET.' });
        return;
      }

      // If ADMIN_API_KEY is set, require x-api-key header
      if (REQUIRE_API_KEY) {
        const provided = (req.headers['x-api-key'] || '').toString();
        if (!provided || provided !== ADMIN_API_KEY) {
          sendJson(res, 401, { error: 'Unauthorized: missing or invalid API key' });
          return;
        }
      }

      const commandName = fullUrl.searchParams.get('command');
      if (!commandName) {
        sendJson(res, 400, { error: 'Missing "command" query parameter' });
        return;
      }

      if (!Object.prototype.hasOwnProperty.call(ALLOWED_COMMANDS, commandName)) {
        sendJson(res, 403, { error: 'Command not allowed' });
        return;
      }

      const shellCommand = ALLOWED_COMMANDS[commandName];

      // Execute the mapped command (the mapping is controlled server-side).
      // Set a small timeout and buffer limit to avoid resource abuse.
      exec(shellCommand, { timeout: 5000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          // include exit code / signal info if possible
          const code = err.code || null;
          const signal = err.signal || null;
          sendJson(res, 200, {
            command: commandName,
            allowed: true,
            error: String(err.message),
            exitCode: code,
            signal: signal,
            stdout: stdout ? stdout.toString() : '',
            stderr: stderr ? stderr.toString() : ''
          });
          return;
        }

        sendJson(res, 200, {
          command: commandName,
          allowed: true,
          stdout: stdout ? stdout.toString() : '',
          stderr: stderr ? stderr.toString() : ''
        });
      });

      return;
    }

    // Not Found
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  } catch (e) {
    console.error('Request handling error:', e);
    sendJson(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Node.js version: ${process.version}`);
});

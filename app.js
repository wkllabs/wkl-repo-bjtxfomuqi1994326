// app.js
const http = require('http');

const PORT = process.env.PORT || 80;

const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Route: /
    if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            message: "Environment Variables",
            port: PORT,
            node: process.version,
            platform: process.platform,
            uptime_seconds: Math.floor(process.uptime()),
            env: process.env   // all environment variables
        }, null, 2));
    }

    // Route: /health
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime_seconds: process.uptime()
        }, null, 2));
    }

    // Not found
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end("Not Found");
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

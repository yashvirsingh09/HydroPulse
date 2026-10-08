/**
 * @file server.ts
 * @brief Lightweight HTTP Server running AWS Lambda Handlers locally
 * @port 5000
 */

import http from 'node:http';
import { handleIngestBurst } from './handlers/ingestBurst.js';
import { DynamoService } from './services/dynamoService.js';

const PORT = Number(process.env.PORT) || 5000;

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || '/';

  try {
    // 1. Ingest Acoustic Burst: POST /api/burst/ingest
    if (req.method === 'POST' && url === '/api/burst/ingest') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      const payload = JSON.parse(body);
      const result = await handleIngestBurst(payload);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    // 2. Get All Registered Pipes: GET /api/pipes
    if (req.method === 'GET' && url === '/api/pipes') {
      const pipes = await DynamoService.getAllPipes();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, pipes }));
      return;
    }

    // 3. Get All Incidents: GET /api/incidents
    if (req.method === 'GET' && url === '/api/incidents') {
      const incidents = await DynamoService.getAllIncidents();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, incidents }));
      return;
    }

    // 4. Actuate / Override Valve: POST /api/valves/actuate
    if (req.method === 'POST' && url === '/api/valves/actuate') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      const { pipeId, status } = JSON.parse(body);
      const updated = await DynamoService.updateValveStatus(pipeId, status);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, pipe: updated }));
      return;
    }

    // Default 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  } catch (err) {
    console.error('[API Error]:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`💧 HydroPulse AWS Backend Server active on port ${PORT}`);
  console.log(`   - POST http://localhost:${PORT}/api/burst/ingest`);
  console.log(`   - GET  http://localhost:${PORT}/api/pipes`);
  console.log(`   - GET  http://localhost:${PORT}/api/incidents`);
  console.log(`   - POST http://localhost:${PORT}/api/valves/actuate`);
  console.log(`======================================================\n`);
});

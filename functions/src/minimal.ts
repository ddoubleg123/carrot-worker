import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';

const app = express();

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
  });
});

// Simple ingest endpoint
app.post('/ingest', (req: express.Request, res: express.Response) => {
  console.log('Minimal ingest request received:', Object.keys(req.body || {}));
  res.status(202).json({ ok: true, message: 'Minimal ingest received' });
});

// Export as Firebase Function
export const minimalWorker = onRequest({
  timeoutSeconds: 60,
  memory: '512MiB'
}, app);

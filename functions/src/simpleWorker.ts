import * as functions from 'firebase-functions';
import express from 'express';
import { runIngest, runTrim } from './ingest';

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Authentication middleware
const requireWorkerSecret = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const workerSecret = req.headers['x-worker-secret'];
  const expectedSecret = process.env.INGEST_WORKER_SECRET || process.env.INGEST_CALLBACK_SECRET || 'dev_ingest_secret';
  
  if (workerSecret !== expectedSecret) {
    console.error('Invalid worker secret provided');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  next();
};

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// Full ingest endpoint
app.post('/ingest', requireWorkerSecret, async (req: express.Request, res: express.Response) => {
  try {
    console.log('Ingest request received:', req.body);
    const result = await runIngest(req.body);
    res.json(result);
  } catch (error) {
    console.error('Ingest error:', error);
    res.status(500).json({ error: 'Ingest failed', details: error instanceof Error ? error.message : String(error) });
  }
});

// Full trim endpoint
app.post('/trim', requireWorkerSecret, async (req: express.Request, res: express.Response) => {
  try {
    console.log('Trim request received:', req.body);
    const result = await runTrim(req.body);
    res.json(result);
  } catch (error) {
    console.error('Trim error:', error);
    res.status(500).json({ error: 'Trim failed', details: error instanceof Error ? error.message : String(error) });
  }
});

// Export as Firebase Function with full video processing capabilities
export const simpleWorker = functions.https.onRequest({
  timeoutSeconds: 540,
  memory: '4GiB'
}, app);

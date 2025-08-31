const express = require('express');
const { execFile } = require('child_process');
const { promisify } = require('util');

const app = express();
const PORT = process.env.PORT || 8080;

// Runtime tool installation
async function installVideoTools() {
  console.log('[STARTUP] Installing video processing tools...');
  const pExecFile = promisify(execFile);

  // Fast path: if both tools are available, skip installation
  try {
    await pExecFile('yt-dlp', ['--version']);
    await pExecFile('ffmpeg', ['-version']);
    console.log('[STARTUP] Video tools already available; skipping installation');
    return;
  } catch (_) {
    // Continue to best-effort installation
  }
  
  try {
    // Try installing yt-dlp. Prefer pip when available; otherwise fall back to direct download.
    console.log('[STARTUP] Installing yt-dlp...');
    try {
      await pExecFile('pip', ['install', '--user', '--upgrade', 'yt-dlp']);
      console.log('[STARTUP] yt-dlp installed successfully via pip');
    } catch (pipError) {
      console.log(`[STARTUP] pip not available or failed (${pipError?.message}); attempting direct download...`);
      try {
        await pExecFile('curl', ['-L', 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp', '-o', '/usr/local/bin/yt-dlp']);
        await pExecFile('chmod', ['a+rx', '/usr/local/bin/yt-dlp']);
        console.log('[STARTUP] yt-dlp installed successfully via direct download');
      } catch (dlError) {
        console.log(`[STARTUP] Failed to install yt-dlp via direct download: ${dlError?.message}`);
      }
    }

    // Ensure ffmpeg exists; if not, log and continue (image should already provide it)
    try {
      await pExecFile('ffmpeg', ['-version']);
      console.log('[STARTUP] ffmpeg already available');
    } catch (e) {
      console.log('[STARTUP] ffmpeg not found; runtime installation is not supported in this environment');
    }

    console.log('[STARTUP] Video processing tools installation completed');
  } catch (error) {
    console.error('[STARTUP] Failed to install video tools:', error.message);
    console.error('[STARTUP] Service will continue without video processing capabilities');
  }
}

// Error handling and monitoring
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Health check endpoint with detailed status
app.get('/healthz', (_req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development',
    services: {
      redis: process.env.REDIS_URL ? 'configured' : 'missing',
      firebase: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? 'configured' : 'missing',
      storage: process.env.FIREBASE_STORAGE_BUCKET ? 'configured' : 'missing'
    }
  };
  
  console.log('[HEALTH] Health check requested:', health);
  res.status(200).json(health);
});

// Basic info endpoint
app.get('/', (_req, res) => {
  res.status(200).json({
    service: 'carrot-ingest-worker',
    version: '0.1.0',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: PORT,
      REDIS_URL: process.env.REDIS_URL ? 'SET' : 'MISSING',
      INGEST_WORKER_SECRET: process.env.INGEST_WORKER_SECRET ? 'SET' : 'MISSING',
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET ? 'SET' : 'MISSING',
      GOOGLE_APPLICATION_CREDENTIALS_JSON: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? 'SET' : 'MISSING'
    }
  });
});

app.get('/livez', (req, res) => {
  res.status(200).send('ok');
});

app.get('/readyz', (req, res) => {
  res.status(200).send('ok');
});

// Enhanced debug endpoint to inspect container environment
const pExecFile = promisify(execFile);
const fs = require('fs');

function getVersion(bin) {
  try {
    const result = require('child_process').spawnSync(bin, ['-version'], { encoding: 'utf8' });
    return result.error ? `ERR: ${result.error.message}` : result.stdout.split('\n')[0];
  } catch (e) {
    return `ERR: ${e.message}`;
  }
}

app.get('/debug', async (req, res) => {
  const paths = (process.env.PATH || '').split(':');
  const checkPaths = [
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp', 
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/home/nodejs/.local/bin/yt-dlp',
    '/home/node/.local/bin/yt-dlp'
  ].map(p => ({ path: p, exists: fs.existsSync(p) }));

  let whoami = 'unknown';
  try {
    whoami = require('child_process').spawnSync('whoami', [], { encoding: 'utf8' }).stdout.trim();
  } catch (e) {
    whoami = `error: ${e.message}`;
  }

  const result = {
    deployment: {
      timestamp: new Date().toISOString(),
      commit: 'bf078ce-debian-solution'
    },
    container: {
      user: process.getuid ? process.getuid() : 'N/A',
      whoami: whoami,
      node: process.version,
      PATH: process.env.PATH,
      cwd: process.cwd()
    },
    env: {
      INGEST_CALLBACK_URL: process.env.INGEST_CALLBACK_URL,
      WORKER_PUBLIC_URL: process.env.WORKER_PUBLIC_URL,
      HAS_CALLBACK_SECRET: Boolean(process.env.INGEST_CALLBACK_SECRET),
      GCS_BUCKET: process.env.GCS_BUCKET,
      HAS_GOOGLE_APPLICATION_CREDENTIALS: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS),
      PORT: process.env.PORT || 8080,
      YT_DLP_PATH: process.env.YT_DLP_PATH,
      YT_DLP_COOKIES: process.env.YT_DLP_COOKIES,
      YT_DLP_COOKIES_FROM_BROWSER: process.env.YT_DLP_COOKIES_FROM_BROWSER,
      INGEST_TRIM_SECONDS: process.env.INGEST_TRIM_SECONDS,
    },
    binaries: checkPaths,
    tools: {
      'yt-dlp': getVersion('yt-dlp'),
      'ffmpeg': getVersion('ffmpeg')
    }
  };
  
  res.status(200).json(result);
});

// Simple shared-secret auth and rate limiting
const WORKER_SECRET = process.env.INGEST_WORKER_SECRET || 'dev_ingest_secret';
const rateBuckets = new Map();
const RATE_CAP = Number(process.env.INGEST_RATE_CAP || 30);

function takeToken(key) {
  const now = Date.now();
  const win = 60000;
  const state = rateBuckets.get(key) || { tokens: RATE_CAP, last: now };
  
  const elapsed = now - state.last;
  if (elapsed > 0) {
    const refill = Math.floor((elapsed / win) * RATE_CAP);
    state.tokens = Math.min(RATE_CAP, state.tokens + (refill > 0 ? refill : 0));
    state.last = now;
  }
  
  if (state.tokens <= 0) {
    rateBuckets.set(key, state);
    return false;
  }
  
  state.tokens -= 1;
  rateBuckets.set(key, state);
  return true;
}

// Placeholder ingest function
async function runIngest(request) {
  console.log('[INGEST] Starting job:', request.id);
  console.log('[INGEST] URL:', request.url);
  console.log('[INGEST] Type:', request.type);
  
  // TODO: Implement actual video processing with yt-dlp and ffmpeg
  // For now, just simulate processing
  setTimeout(() => {
    console.log('[INGEST] Job completed:', request.id);
  }, 5000);
}

// Ingest endpoint
app.post('/ingest', express.text({ type: '*/*', limit: '1mb' }), async (req, res) => {
  if (!WORKER_SECRET) {
    return res.status(503).json({ error: 'INGEST_WORKER_SECRET not configured' });
  }
  
  const provided = (req.header('x-worker-secret') || '').trim();
  if (provided !== WORKER_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const key = `${provided}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
  if (!takeToken(key)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  let body = req.body;
  if (typeof body === 'string') {
    let text = body;
    if (text.startsWith('%JSON%')) {
      text = text.replace(/^%JSON%\r?\n?/, '');
    }
    try {
      body = JSON.parse(text);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }
  
  if (!body?.id || !body?.url || !body?.type) {
    return res.status(400).json({ error: 'Missing id, url, or type' });
  }
  
  console.log('Ingest request received', { id: body.id, type: body.type, url: body.url });
  runIngest(body).catch((e) => {
    console.error('Failed to start ingest', { id: body.id, error: e?.message });
  });
  
  return res.status(202).json({ accepted: true, jobId: body.id });
});

// Test endpoint
app.get('/ingest/test', async (req, res) => {
  const url = req.query.url || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const id = req.query.id || `job-${Date.now()}`;
  const allowedTypes = ['youtube', 'x', 'facebook', 'reddit', 'tiktok'];
  const rawType = req.query.type || 'youtube';
  const type = allowedTypes.includes(rawType) ? rawType : 'youtube';
  
  console.log('Ingest test request received', { id, url, type });
  runIngest({ id, url, type }).catch((e) => {
    console.error('Failed to start ingest (test)', { id, error: e?.message });
  });
  
  return res.status(202).json({ accepted: true, jobId: id });
});

// JSON parser for other routes
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Start server with runtime tool installation
async function startServer() {
  // Install video tools at startup
  await installVideoTools();
  
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HTTP] Server listening on 0.0.0.0:${PORT}`);
    console.log(`[HTTP] Health check available at http://0.0.0.0:${PORT}/healthz`);
    const address = server.address();
    console.log('[HTTP] Server bound to:', address);
  });

  server.on('error', (err) => {
    console.error('[HTTP] Server error:', err?.stack || err);
    process.exit(1);
  });
}

// Start the server
startServer().catch((error) => {
  console.error('[STARTUP] Failed to start server:', error);
  process.exit(1);
});

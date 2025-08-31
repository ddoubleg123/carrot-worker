const express = require('express');
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const os = require('os');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
// Optional cookie broker configuration (for auto-fetch/refresh)
const COOKIE_FETCH_URL = process.env.COOKIE_FETCH_URL || '';
const COOKIE_FETCH_SECRET = process.env.COOKIE_FETCH_SECRET || '';

// Default polite client profile for yt-dlp
const DEFAULT_UA = process.env.YTDLP_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const DEFAULT_ACCEPT_LANG = process.env.YTDLP_ACCEPT_LANGUAGE || 'en-US,en;q=0.9';

// Boot banner to help verify which commit is running in container logs
console.log('[BOOT] carrot-worker starting', {
  commit: process.env.RELEASE_SHA || process.env.GITHUB_SHA || process.env.RENDER_GIT_COMMIT || 'unknown'
});

// Lightweight fetch helper (uses global fetch if available; falls back to node-fetch)
async function doFetch(input, init) {
  if (typeof fetch === 'function') return fetch(input, init);
  const mod = await import('node-fetch');
  return mod.default(input, init);
}

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
    // Try installing yt-dlp. Prefer pip (pip3/pip) with --user; otherwise fall back to direct download to a user-writable bin.
    console.log('[STARTUP] Installing yt-dlp...');
    const candidates = ['pip3', 'pip'];
    let installedViaPip = false;
    for (const pipCmd of candidates) {
      try {
        await pExecFile(pipCmd, ['--version']);
        await pExecFile(pipCmd, ['install', '--user', '--upgrade', 'yt-dlp']);
        installedViaPip = true;
        console.log(`[STARTUP] yt-dlp installed successfully via ${pipCmd} --user`);
        break;
      } catch (_) {}
    }
    if (!installedViaPip) {
      console.log('[STARTUP] pip/pip3 not available or failed; attempting direct download to user bin...');
      try {
        const userBin = path.join(os.homedir(), '.local', 'bin');
        await fs.promises.mkdir(userBin, { recursive: true }).catch(() => {});
        const target = path.join(userBin, 'yt-dlp');
        await pExecFile('curl', ['-L', 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp', '-o', target]);
        await pExecFile('chmod', ['a+rx', target]);
        console.log('[STARTUP] yt-dlp installed successfully via direct download to', target);
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

function getVersion(bin) {
  try {
    const args = bin === 'yt-dlp' ? ['--version'] : ['-version'];
    const result = require('child_process').spawnSync(bin, args, { encoding: 'utf8' });
    if (result.error) return `ERR: ${result.error.message}`;
    const out = (result.stdout || result.stderr || '').split('\n')[0].trim();
    return out || 'unknown';
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
      commit: process.env.RELEASE_SHA || process.env.GITHUB_SHA || process.env.RENDER_GIT_COMMIT || 'unknown'
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
      HAS_CALLBACK_SECRET: Boolean(process.env.INGEST_WORKER_SECRET),
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
      HAS_GOOGLE_APPLICATION_CREDENTIALS: Boolean(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        (process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY) ||
        (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
      ),
      PORT: process.env.PORT || 8080,
      YT_DLP_PATH: process.env.YT_DLP_PATH,
      YT_DLP_COOKIES: process.env.YT_DLP_COOKIES,
      YT_DLP_COOKIES_URL: process.env.YT_DLP_COOKIES_URL,
      YT_DLP_COOKIES_FILE: process.env.YT_DLP_COOKIES_FILE,
      HAS_YT_DLP_COOKIES_B64: Boolean(process.env.YT_DLP_COOKIES_B64),
      YT_DLP_COOKIES_FROM_BROWSER: process.env.YT_DLP_COOKIES_FROM_BROWSER,
      INGEST_TRIM_SECONDS: process.env.INGEST_TRIM_SECONDS,
    },
    binaries: checkPaths,
    tools: {
      'yt-dlp': getVersion('yt-dlp'),
      'ffmpeg': getVersion('ffmpeg')
    }
  };
  // Enrich with cookies/secrets diagnostics
  try {
    const envPath = (process.env.YT_DLP_COOKIES_FILE || '').trim();
    const envPathExists = envPath ? fs.existsSync(envPath) : false;
    const defaultSecret = '/etc/secrets/yt_cookies.txt';
    const defaultSecretExists = fs.existsSync(defaultSecret);
    const detectedPath = await getCookiesFilePath();
    const detectedExists = detectedPath ? fs.existsSync(detectedPath) : false;
    let secretsList = [];
    try {
      secretsList = fs.existsSync('/etc/secrets') ? fs.readdirSync('/etc/secrets') : [];
    } catch (_) {}
    result.cookies = {
      envPath,
      envPathExists,
      defaultSecret,
      defaultSecretExists,
      detectedPath,
      detectedExists,
      secretsDir: '/etc/secrets',
      secretsList,
    };
  } catch (e) {
    result.cookies = { error: e?.message };
  }

  res.status(200).json(result);
});

// Utilities
async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true }).catch(() => {});
}

function isYouTube(url, type) {
  try {
    const u = new URL(url);
    const host = (u.hostname || '').toLowerCase();
    return type === 'youtube' || host.includes('youtube.com') || host.includes('youtu.be');
  } catch {
    return type === 'youtube';
  }
}

async function run(cmd, args, opts = {}) {
// Manage cookies for yt-dlp from an env var (YT_DLP_COOKIES)
let COOKIES_FILE_PATH = null;
// Per-job override path (temporary file) if the request supplies cookies
let JOB_COOKIES_OVERRIDE = null;
// In-memory per-user cookies cache: { [userId]: { path, expiresAt } }
const COOKIES_CACHE = Object.create(null);
const COOKIES_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
function putCookiesForUser(userId, contentBuffer) {
  const tmp = path.join(os.tmpdir(), `yt_cookies_${userId}_${Date.now()}.txt`);
  fs.writeFileSync(tmp, contentBuffer, { mode: 0o600 });
  COOKIES_CACHE[userId] = { path: tmp, expiresAt: Date.now() + COOKIES_TTL_MS };
  console.log('[INGEST] Cached cookies for user:', userId, 'ttlMs=', COOKIES_TTL_MS);
  return tmp;
}
function getCachedCookiesForUser(userId) {
  const entry = COOKIES_CACHE[userId];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    try { if (fs.existsSync(entry.path)) fs.unlinkSync(entry.path); } catch {}
    delete COOKIES_CACHE[userId];
    return null;
  }
  return entry.path;
}

// ... (rest of the code remains the same)

async function downloadYouTubeAsMp4(url, outDir, hints = {}) {
  const outTemplate = path.join(outDir, 'video.%(ext)s');
  // Prefer mp4. If not available, merge best and force mp4 container
  const baseArgs = [
    '-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b',
    '--merge-output-format', 'mp4',
    '-o', outTemplate,
    url
  ];
  const argsWithCookies = await withCookiesArgs(baseArgs);
  const args = appendYtClientArgs(argsWithCookies, hints.ua, hints.playerClient);
  await run('yt-dlp', args);
  // Determine resulting file
  const entries = await fs.promises.readdir(outDir);
  const videoFile = entries.find(f => f.startsWith('video.') && (f.endsWith('.mp4') || f.endsWith('.mkv') || f.endsWith('.webm') || f.endsWith('.mov')));
  if (!videoFile) throw new Error('yt-dlp did not produce a video file');
  let fullPath = path.join(outDir, videoFile);
  if (!fullPath.endsWith('.mp4')) {
    // Transcode to mp4
    const mp4Path = path.join(outDir, 'video.mp4');
    await run('ffmpeg', ['-y', '-i', fullPath, '-c:v', 'libx264', '-c:a', 'aac', '-movflags', '+faststart', mp4Path]);
    fullPath = mp4Path;
  }
  return fullPath;
}

// ... (rest of the code remains the same)

async function runIngest(request) {
  console.log('[INGEST] Starting job:', request.id);
  console.log('[INGEST] URL:', request.url);
  console.log('[INGEST] Type:', request.type);
  const jobId = request.id;
  let url = request.url;
  try {
    if (/%[0-9A-Fa-f]{2}/.test(url)) {
      const dec = decodeURIComponent(url);
      try { new URL(dec); url = dec; } catch {}
    }
  } catch {}
  const type = request.type;

  const baseDir = path.join(os.tmpdir(), 'jobs', jobId);
  await ensureDir(baseDir);

  // Prepare per-request cookies if provided; otherwise use broker for userId (if configured)
  let jobCookieTmp = null;
  let brokerHints = { ua: undefined, playerClient: undefined };
  try {
    if (request.cookies_b64 && typeof request.cookies_b64 === 'string' && request.cookies_b64.trim().length > 0) {
      jobCookieTmp = path.join(os.tmpdir(), `yt_cookies_${Date.now()}.txt`);
      const buf = Buffer.from(request.cookies_b64.trim(), 'base64');
      fs.writeFileSync(jobCookieTmp, buf, { mode: 0o600 });
      JOB_COOKIES_OVERRIDE = jobCookieTmp;
      console.log('[INGEST] Using per-request cookies (b64) at:', jobCookieTmp);
    } else if (request.cookies && typeof request.cookies === 'string' && request.cookies.trim().length > 0) {
      jobCookieTmp = path.join(os.tmpdir(), `yt_cookies_${Date.now()}.txt`);
      fs.writeFileSync(jobCookieTmp, request.cookies.trim(), { mode: 0o600 });
      JOB_COOKIES_OVERRIDE = jobCookieTmp;
      console.log('[INGEST] Using per-request cookies (plain) at:', jobCookieTmp);
    } else if (request.userId && COOKIE_FETCH_URL && COOKIE_FETCH_SECRET) {
      try {
        const fetched = await fetchAndCacheCookies(request.userId);
        if (fetched?.path) {
          JOB_COOKIES_OVERRIDE = fetched.path;
          brokerHints.ua = fetched.ua || brokerHints.ua;
          brokerHints.playerClient = fetched.client || brokerHints.playerClient;
          console.log('[INGEST] Using broker cookies for userId', request.userId, 'at:', fetched.path);
        }
      } catch (e) {
        console.warn('[INGEST] Broker cookie fetch failed:', e?.message);
      }
    }
  } catch (e) {
    console.warn('[INGEST] Failed to prepare per-request cookies:', e?.message);
  }

  const isYT = isYouTube(url, type);
  const meta = isYT ? await fetchYtMetadata(url, brokerHints) : null;

  let videoPath = null;
  let audioPath = null;
  let thumbPath = null;

  try {
    // Notify start
    await sendCallback(jobId, { status: 'downloading', progress: 1, sourceUrl: url });
    if (isYT || type === 'video') {
      // Always fetch full MP4 for YouTube
      try {
        videoPath = await downloadYouTubeAsMp4(url, baseDir, brokerHints);
      } catch (err) {
        const msg = err?.message || '';
        if (request.userId && COOKIE_FETCH_URL && COOKIE_FETCH_SECRET && looksLikeCookieExpiry(msg)) {
          console.warn('[INGEST] Detected cookie expiry/429; refreshing broker cookies and retrying once...');
          try {
            const refreshed = await fetchAndCacheCookies(request.userId, true);
            if (refreshed?.path) {
              JOB_COOKIES_OVERRIDE = refreshed.path;
              brokerHints.ua = refreshed.ua || brokerHints.ua;
              brokerHints.playerClient = refreshed.client || brokerHints.playerClient;
            }
            videoPath = await downloadYouTubeAsMp4(url, baseDir, brokerHints);
          } catch (e2) {
            throw e2;
          }
        } else {
          throw err;
        }
      }
      thumbPath = path.join(baseDir, 'thumb.jpg');
      await generateThumbnail(videoPath, thumbPath);
    } else if (type === 'audio') {
      try {
        audioPath = await downloadAudioAsMp3(url, baseDir, brokerHints);
      } catch (err) {
        const msg = err?.message || '';
        if (request.userId && COOKIE_FETCH_URL && COOKIE_FETCH_SECRET && looksLikeCookieExpiry(msg)) {
          console.warn('[INGEST] Detected cookie expiry/429 (audio); refreshing broker cookies and retrying once...');
          try {
            const refreshed = await fetchAndCacheCookies(request.userId, true);
            if (refreshed?.path) {
              JOB_COOKIES_OVERRIDE = refreshed.path;
              brokerHints.ua = refreshed.ua || brokerHints.ua;
              brokerHints.playerClient = refreshed.client || brokerHints.playerClient;
            }
            audioPath = await downloadAudioAsMp3(url, baseDir, brokerHints);
          } catch (e2) {
            throw e2;
          }
        } else {
          throw err;
        }
      }
    } else {
      // Fallback: attempt best video to mp4
      videoPath = await downloadYouTubeAsMp4(url, baseDir, brokerHints);
      thumbPath = path.join(baseDir, 'thumb.jpg');
      await generateThumbnail(videoPath, thumbPath);
    }

    // Uploads
    const uploads = {};
    if (videoPath) {
      const dest = `ingest/${jobId}/video.mp4`;
      uploads.videoUrl = await uploadFileToFirebase(videoPath, dest);
    }
    if (audioPath) {
      const dest = `ingest/${jobId}/audio.mp3`;
      uploads.audioUrl = await uploadFileToFirebase(audioPath, dest);
    }
    if (thumbPath) {
      const dest = `ingest/${jobId}/thumb.jpg`;
      uploads.thumbnailUrl = await uploadFileToFirebase(thumbPath, dest);
    }

    console.log('[INGEST] Uploaded assets:', uploads);

    // Final success callback
    await sendCallback(jobId, {
      status: 'completed',
      progress: 100,
      userId: request.userId || process.env.INGEST_DEFAULT_USER_ID || null,
      title: meta?.title || 'New Ingest',
      sourceUrl: url,
      videoUrl: uploads.videoUrl || null,
      audioUrl: uploads.audioUrl || null,
      thumbnailUrl: uploads.thumbnailUrl || null,
      mediaUrl: uploads.videoUrl || uploads.audioUrl || null,
      meta: {
        platform: isYT ? 'youtube' : (type || 'other'),
        durationSec: meta?.duration || meta?.duration_string || null,
      },
    });

    console.log('[INGEST] Job completed:', jobId);
  } catch (err) {
    console.error('[INGEST] Job failed:', jobId, err?.message);
    // Error callback so UI can show failure
    await sendCallback(jobId, { status: 'error', error: err?.message || 'ingest failed', progress: 0 });
  } finally {
    // Clean up per-request cookies temp file
    try {
      if (jobCookieTmp && fs.existsSync(jobCookieTmp)) fs.unlinkSync(jobCookieTmp);
    } catch {}
    JOB_COOKIES_OVERRIDE = null;
  }
}

// ... (rest of the code remains the same)
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'Missing userId' });
  let buf = null;
  if (typeof cookies_b64 === 'string' && cookies_b64.trim().length) {
    try { buf = Buffer.from(cookies_b64.trim(), 'base64'); } catch {}
  } else if (typeof cookies === 'string' && cookies.trim().length) {
    buf = Buffer.from(cookies, 'utf8');
  }
  if (!buf) return res.status(400).json({ error: 'Missing cookies_b64 or cookies' });

  const pathTmp = putCookiesForUser(userId, buf);
  return res.json({ ok: true, path: pathTmp, ttlSeconds: Math.floor(COOKIES_TTL_MS / 1000) });
});

// JSON parser for other routes (allow large cookies payloads)
app.use(express.json({ limit: '5mb' }));

// Ingest endpoint (POST) to support large cookies via JSON; id optional; userId cookie cache
app.post('/ingest', express.json({ limit: '5mb' }), async (req, res) => {
  if (!WORKER_SECRET) return res.status(503).json({ error: 'INGEST_WORKER_SECRET not configured' });
  const provided = (req.header('x-worker-secret') || '').trim();
  if (provided !== WORKER_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const key = `${provided}:${req.ip || req.socket.remoteAddress || 'unknown'}:ingest`;
  if (!takeToken(key)) return res.status(429).json({ error: 'Rate limit exceeded' });

  try {
    const body = req.body || {};
    let url = body.url;
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Missing url' });
    try { url = decodeURIComponent(url); } catch {}
    const id = body.id || `job-${Date.now()}`;
    const allowedTypes = ['youtube', 'x', 'facebook', 'reddit', 'tiktok'];
    const rawType = body.type || 'youtube';
    const type = allowedTypes.includes(rawType) ? rawType : 'youtube';

    // If no cookies provided directly, but userId is present, attach cached cookies
    let cookies_b64 = typeof body.cookies_b64 === 'string' ? body.cookies_b64 : undefined;
    let cookies = typeof body.cookies === 'string' ? body.cookies : undefined;
    if (!cookies_b64 && !cookies && body.userId) {
      // Try cached first
      let cachedPath = getCachedCookiesForUser(body.userId);
      if (!cachedPath && COOKIE_FETCH_URL && COOKIE_FETCH_SECRET) {
        try {
          const fetched = await fetchAndCacheCookies(body.userId);
          cachedPath = fetched?.path;
        } catch (e) {
          console.warn('[INGEST] broker fetch during /ingest failed:', e?.message);
        }
      }
      if (cachedPath) {
        try {
          const data = fs.readFileSync(cachedPath);
          cookies_b64 = Buffer.from(data).toString('base64');
        } catch {}
      }
    }

    const reqBody = { id, url, type, cookies_b64, cookies };
    console.log('Ingest POST received', { id, url, type, hasCookiesB64: !!cookies_b64, hasCookies: !!cookies, userId: body.userId || null });
    runIngest(reqBody).catch((e) => {
      console.error('Failed to start ingest (POST)', { id, error: e?.message });
    });
    return res.status(202).json({ accepted: true, jobId: id });
  } catch (err) {
    return res.status(500).json({ accepted: false, error: String(err?.message || err) });
  }
});

// Test endpoint
app.get('/ingest/test', async (req, res) => {
  let url = req.query.url || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  try { url = decodeURIComponent(url); } catch {}
  const id = req.query.id || `job-${Date.now()}`;
  const allowedTypes = ['youtube', 'x', 'facebook', 'reddit', 'tiktok'];
  const rawType = req.query.type || 'youtube';
  const type = allowedTypes.includes(rawType) ? rawType : 'youtube';
  const reqBody = {
    id,
    url,
    type,
    cookies_b64: req.query.cookies_b64 || undefined,
    cookies: req.query.cookies || undefined,
  };
  console.log('Ingest test request received', reqBody);
  try {
    const result = await runIngest(reqBody);
    res.json({ accepted: true, jobId: id, result });
  } catch (err) {
    res.status(500).json({ accepted: false, error: String(err?.message || err) });
  }
});

// Start server with runtime tool installation
async function startServer() {
  // Install video tools at startup
  await installVideoTools();
  console.log('[STARTUP] Broker config', {
    hasCookieFetchUrl: Boolean(COOKIE_FETCH_URL),
    hasCookieFetchSecret: Boolean(COOKIE_FETCH_SECRET)
  });
  
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

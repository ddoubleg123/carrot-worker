const express = require('express');
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const os = require('os');
const fs = require('fs');

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
  const pExecFile = promisify(execFile);
  const res = await pExecFile(cmd, args, { maxBuffer: 1024 * 1024 * 50, ...opts });
  return res;
}

// Manage cookies for yt-dlp from an env var (YT_DLP_COOKIES)
let COOKIES_FILE_PATH = null;
async function getCookiesFilePath() {
  try {
    if (COOKIES_FILE_PATH && fs.existsSync(COOKIES_FILE_PATH)) return COOKIES_FILE_PATH;

    // 1) Explicit file path
    const filePath = (process.env.YT_DLP_COOKIES_FILE || '').trim();
    if (filePath && fs.existsSync(filePath)) {
      // If secret lives under /etc/secrets (read-only), copy to a writable temp file
      if (filePath.startsWith('/etc/secrets/')) {
        const tmpCopy = path.join(os.tmpdir(), `yt_cookies_${Date.now()}.txt`);
        fs.copyFileSync(filePath, tmpCopy);
        COOKIES_FILE_PATH = tmpCopy;
        console.log('[INGEST] Using temp copy of cookies from secret:', tmpCopy);
        return tmpCopy;
      }
      COOKIES_FILE_PATH = filePath;
      console.log('[INGEST] Using cookies file path:', filePath);
      return filePath;
    }

    // 1a) Default Render Secret File path fallback
    // If the env var wasn't set or path doesn't exist, try the common secret name
    try {
      const defaultSecret = '/etc/secrets/yt_cookies.txt';
      if (fs.existsSync(defaultSecret)) {
        const tmpCopy = path.join(os.tmpdir(), `yt_cookies_${Date.now()}.txt`);
        fs.copyFileSync(defaultSecret, tmpCopy);
        COOKIES_FILE_PATH = tmpCopy;
        console.log('[INGEST] Using temp copy of default secret cookies file:', tmpCopy);
        return tmpCopy;
      }
      // Some Render setups mount the secret using the key name directly
      const altSecret = '/etc/secrets/YT_DLP_COOKIES_FILE';
      if (fs.existsSync(altSecret)) {
        const tmpCopy = path.join(os.tmpdir(), `yt_cookies_${Date.now()}.txt`);
        fs.copyFileSync(altSecret, tmpCopy);
        COOKIES_FILE_PATH = tmpCopy;
        console.log('[INGEST] Using temp copy of alt secret cookies file:', tmpCopy);
        return tmpCopy;
      }
    } catch (_) {}

    // 2) Download from URL at runtime
    const fromUrl = (process.env.YT_DLP_COOKIES_URL || '').trim();
    if (fromUrl) {
      const p = path.join(os.tmpdir(), `yt_cookies_${Date.now()}.txt`);
      try {
        const r = await fetch(fromUrl);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        fs.writeFileSync(p, text, 'utf8');
        COOKIES_FILE_PATH = p;
        console.log('[INGEST] Downloaded cookies from URL to:', p);
        return p;
      } catch (e) {
        console.warn('[INGEST] Failed to download cookies URL:', e.message);
        return null;
      }
    }

    // 3) Base64-encoded content
    const b64 = process.env.YT_DLP_COOKIES_B64;
    if (b64) {
      const p = path.join(os.tmpdir(), `yt_cookies_${Date.now()}.txt`);
      const text = Buffer.from(b64, 'base64').toString('utf8');
      fs.writeFileSync(p, text, 'utf8');
      COOKIES_FILE_PATH = p;
      console.log('[INGEST] Decoded base64 cookies to:', p);
      return p;
    }

    // 4) Inline content (legacy)
    const cookies = process.env.YT_DLP_COOKIES;
    if (cookies) {
      const p = path.join(os.tmpdir(), `yt_cookies_${Date.now()}.txt`);
      fs.writeFileSync(p, cookies, 'utf8');
      COOKIES_FILE_PATH = p;
      console.log('[INGEST] Wrote cookies file for yt-dlp:', p);
      return p;
    }

    return null;
  } catch (e) {
    console.warn('[INGEST] Failed to prepare cookies file:', e.message);
    return null;
  }
}

async function withCookiesArgs(args = []) {
  const file = await getCookiesFilePath();
  if (file) return [...args, '--cookies', file];
  // Fallback to browser cookies if configured (useful for local debugging)
  const fromBrowser = (process.env.YT_DLP_COOKIES_FROM_BROWSER || '').trim();
  if (fromBrowser) return [...args, '--cookies-from-browser', fromBrowser];
  return args;
}

function tryRequireStorage() {
  try {
    // Lazy require to avoid hard crash if dependency is missing
    // Ensure package: @google-cloud/storage is added to carrot-worker/package.json
    // e.g., "@google-cloud/storage": "^7"
    const { Storage } = require('@google-cloud/storage');
    return Storage;
  } catch (e) {
    console.error('[INGEST] Missing dependency @google-cloud/storage. Please add it to package.json:', e.message);
    return null;
  }
}

async function uploadFileToFirebase(localPath, destPath) {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error('FIREBASE_STORAGE_BUCKET not set');

  const Storage = tryRequireStorage();
  if (!Storage) throw new Error('Missing @google-cloud/storage');

  // Support multiple credential forms:
  // 1) GOOGLE_APPLICATION_CREDENTIALS_JSON (full JSON string)
  // 2) Individual env vars: GCS_CLIENT_EMAIL, GCS_PRIVATE_KEY, GCP_PROJECT_ID/FIREBASE_PROJECT_ID
  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  let storageOptions = undefined;
  if (credsJson) {
    storageOptions = { credentials: JSON.parse(credsJson) };
  } else {
    const client_email = process.env.FIREBASE_CLIENT_EMAIL || process.env.GCS_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
    let private_key = process.env.FIREBASE_PRIVATE_KEY || process.env.GCS_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
    const project_id = process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID || process.env.GOOGLE_PROJECT_ID;
    if (client_email && private_key) {
      // Render often requires escaped newlines; normalize them.
      private_key = private_key.replace(/\\n/g, '\n');
      storageOptions = { credentials: { client_email, private_key, project_id } };
    }
  }

  const storage = new Storage(storageOptions);
  const bucket = storage.bucket(bucketName);
  await bucket.upload(localPath, { destination: destPath, resumable: false, contentType: undefined });
  const file = bucket.file(destPath);
  // Try to make public; if not allowed, fall back to signed URL
  try {
    await file.makePublic();
    // Prefer Firebase domain if the bucket ends with firebasestorage.app
    if ((bucketName || '').endsWith('firebasestorage.app')) {
      const encoded = encodeURIComponent(destPath);
      const fbUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media`;
      return fbUrl;
    }
    const gcsUrl = `https://storage.googleapis.com/${bucketName}/${encodeURI(destPath)}`;
    return gcsUrl;
  } catch {
    const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 1000 * 60 * 60 * 24 * 30 });
    return signedUrl;
  }
}

async function generateThumbnail(inputVideoPath, outputThumbPath) {
  // Capture a frame at ~2s
  await run('ffmpeg', ['-y', '-ss', '2', '-i', inputVideoPath, '-frames:v', '1', '-q:v', '2', outputThumbPath]);
}

async function downloadYouTubeAsMp4(url, outDir) {
  const outTemplate = path.join(outDir, 'video.%(ext)s');
  // Prefer mp4. If not available, merge best and force mp4 container
  const baseArgs = [
    '-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b',
    '--merge-output-format', 'mp4',
    '-o', outTemplate,
    url
  ];
  const args = await withCookiesArgs(baseArgs);
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

async function downloadAudioAsMp3(url, outDir) {
  const outTemplate = path.join(outDir, 'audio.%(ext)s');
  const baseArgs = ['-x', '--audio-format', 'mp3', '--audio-quality', '0', '-o', outTemplate, url];
  const args = await withCookiesArgs(baseArgs);
  await run('yt-dlp', args);
  const entries = await fs.promises.readdir(outDir);
  const audioFile = entries.find(f => f.startsWith('audio.') && f.endsWith('.mp3'))
    || entries.find(f => f.startsWith('audio.'));
  if (!audioFile) throw new Error('yt-dlp did not produce an audio file');
  let fullPath = path.join(outDir, audioFile);
  if (!fullPath.endsWith('.mp3')) {
    const mp3Path = path.join(outDir, 'audio.mp3');
    await run('ffmpeg', ['-y', '-i', fullPath, '-codec:a', 'libmp3lame', '-qscale:a', '2', mp3Path]);
    fullPath = mp3Path;
  }
  return fullPath;
}

async function fetchYtMetadata(url) {
  try {
    const args = await withCookiesArgs(['-J', url]);
    const { stdout } = await run('yt-dlp', args);
    return JSON.parse(stdout);
  } catch (e) {
    console.warn('[INGEST] Failed to fetch yt-dlp metadata:', e.message);
    return null;
  }
}

async function sendCallback(jobId, payload = {}) {
  if (!process.env.INGEST_CALLBACK_URL) {
    console.log('[INGEST] No INGEST_CALLBACK_URL set; skipping callback');
    return;
  }
  try {
    const body = { jobId, ...payload };
    const res = await fetch(process.env.INGEST_CALLBACK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': process.env.INGEST_WORKER_SECRET || 'dev_ingest_secret',
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log('[INGEST] Callback response', res.status, text);
  } catch (e) {
    console.error('[INGEST] Callback failed:', e.message);
  }
}

// Placeholder ingest function
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

  const isYT = isYouTube(url, type);
  const meta = isYT ? await fetchYtMetadata(url) : null;

  let videoPath = null;
  let audioPath = null;
  let thumbPath = null;

  try {
    // Notify start
    await sendCallback(jobId, { status: 'downloading', progress: 1, sourceUrl: url });
    if (isYT || type === 'video') {
      // Always fetch full MP4 for YouTube
      videoPath = await downloadYouTubeAsMp4(url, baseDir);
      thumbPath = path.join(baseDir, 'thumb.jpg');
      await generateThumbnail(videoPath, thumbPath);
    } else if (type === 'audio') {
      audioPath = await downloadAudioAsMp3(url, baseDir);
    } else {
      // Fallback: attempt best video to mp4
      videoPath = await downloadYouTubeAsMp4(url, baseDir);
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
    // Best-effort cleanup can be added if needed
  }
}

// Simple shared-secret auth and rate limiting
const WORKER_SECRET = process.env.INGEST_WORKER_SECRET || 'dev_ingest_secret';
// Enforce that each ingest job specifies the owner userId. Default: true
const REQUIRE_INGEST_USER_ID = String(process.env.REQUIRE_INGEST_USER_ID || 'true').toLowerCase() === 'true';
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
  
  // Enforce per-job user ownership when enabled
  if (REQUIRE_INGEST_USER_ID && !body.userId) {
    return res.status(400).json({ error: 'Missing userId (required by REQUIRE_INGEST_USER_ID)'});
  }
  
  console.log('Ingest request received', { id: body.id, type: body.type, url: body.url });
  runIngest(body).catch((e) => {
    console.error('Failed to start ingest', { id: body.id, error: e?.message });
  });
  
  return res.status(202).json({ accepted: true, jobId: body.id });
});

// Test endpoint
app.get('/ingest/test', async (req, res) => {
  let url = req.query.url || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  try { url = decodeURIComponent(url); } catch {}
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

import { Storage } from '@google-cloud/storage';
import { initializeApp, getApps } from 'firebase-admin/app';
import { credential } from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { spawn } from 'node:child_process';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import fetch from 'node-fetch';
// Provide sensible local defaults to avoid silent no-callbacks in dev
const CALLBACK_URL = (process.env.INGEST_CALLBACK_URL || 'http://localhost:3005/api/ingest/callback').replace(/\/$/, '');
const CALLBACK_SECRET = process.env.INGEST_CALLBACK_SECRET || 'dev_ingest_secret';
const GCS_BUCKET = process.env.GCS_BUCKET || '';
const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || '';
const TRIM_SECONDS = Math.max(0, Number(process.env.INGEST_TRIM_SECONDS || '0'));
const WORKER_PUBLIC_URL = (process.env.WORKER_PUBLIC_URL || 'http://localhost:8080').replace(/\/$/, '');
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
// Initialize Firebase Admin if not already done
if (!getApps().length) {
    let firebaseConfig = undefined;
    // Try GOOGLE_APPLICATION_CREDENTIALS_JSON first (full service account JSON)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
            firebaseConfig = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
            console.log('[ingest] Using GOOGLE_APPLICATION_CREDENTIALS_JSON for Firebase initialization');
        }
        catch (error) {
            console.error('[ingest] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
        }
    }
    // Fallback to individual environment variables if JSON not available
    if (!firebaseConfig && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        firebaseConfig = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };
        console.log('[ingest] Using individual Firebase environment variables');
    }
    console.log('[ingest] Initializing Firebase Admin with config:', {
        hasCredentials: !!firebaseConfig,
        projectId: firebaseConfig?.project_id || firebaseConfig?.projectId,
        clientEmail: firebaseConfig?.client_email || firebaseConfig?.clientEmail,
        storageBucket: FIREBASE_STORAGE_BUCKET
    });
    if (firebaseConfig) {
        initializeApp({
            credential: credential.cert(firebaseConfig)
        });
        console.log('[ingest] Firebase Admin initialized successfully');
    }
    else {
        console.warn('[ingest] No Firebase credentials found - uploads will use fallback methods');
    }
}
function execCmd(cmd, args, cwd) {
    return new Promise((resolve, reject) => {
        const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], cwd });
        const stderrChunks = [];
        const stdoutChunks = [];
        const maxBytes = 64 * 1024; // keep last 64KB for diagnostics
        p.stdout?.on('data', (d) => {
            stdoutChunks.push(d);
            // Trim if too large
            let total = stdoutChunks.reduce((n, b) => n + b.length, 0);
            while (total > maxBytes && stdoutChunks.length > 1) {
                const shift = stdoutChunks.shift();
                total -= shift ? shift.length : 0;
            }
        });
        p.stderr?.on('data', (d) => {
            stderrChunks.push(d);
            let total = stderrChunks.reduce((n, b) => n + b.length, 0);
            while (total > maxBytes && stderrChunks.length > 1) {
                const shift = stderrChunks.shift();
                total -= shift ? shift.length : 0;
            }
        });
        p.on('error', reject);
        p.on('close', (code) => {
            if (code === 0)
                return resolve();
            const stderr = Buffer.concat(stderrChunks).toString('utf8');
            const stdout = Buffer.concat(stdoutChunks).toString('utf8');
            const err = new Error(`${cmd} exited with code ${code}`);
            (err.stderr = stderr), (err.stdout = stdout);
            return reject(err);
        });
    });
}
// Trim an existing video into a new clip and make it available similarly to ingest output
export async function runTrim(req) {
    const jobId = req.id;
    const workdir = path.join('/tmp', `trim_${jobId}`);
    await fs.mkdir(workdir, { recursive: true });
    const watchdog = setTimeout(() => {
        console.error('[worker] Trim watchdog timeout', { jobId });
    }, 60 * 60 * 1000); // 1 hour
    try {
        console.log('[worker] Starting trim', { jobId, sourceUrl: req.sourceUrl, startSec: req.startSec, endSec: req.endSec });
        await sendCallback(jobId, { status: 'processing', progress: 10, postId: req.postId });
        const outPath = path.join(workdir, `${jobId}.mp4`);
        const start = req.startSec;
        const end = req.endSec;
        const hasEnd = typeof end === 'number' && end > 0;
        // Keep-alive interval
        const keepalive = setInterval(() => {
            console.log('[worker] Trim keep-alive', { jobId });
        }, 30000);
        try {
            // Fallback to ffmpeg
            const ffArgs = [
                '-y',
                ...(start ? ['-ss', String(start)] : []),
                '-i', req.sourceUrl,
                ...(hasEnd ? ['-to', String(end)] : []),
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-profile:v', 'baseline',
                '-level', '3.1',
                '-c:a', 'aac',
                '-movflags', '+faststart',
                outPath,
            ];
            await execCmd('ffmpeg', ffArgs).finally(() => clearInterval(keepalive));
            console.log('[worker] Trim transcode complete', { jobId, outPath });
            await sendCallback(jobId, { status: 'uploading', progress: 90, postId: req.postId });
            let mediaUrl = '';
            let cfUid;
            if (FIREBASE_STORAGE_BUCKET) {
                console.log('[ingest] Upload configuration check:', {
                    FIREBASE_STORAGE_BUCKET,
                    GCS_BUCKET,
                    CF_ACCOUNT_ID: !!CF_ACCOUNT_ID,
                    CF_API_TOKEN: !!CF_API_TOKEN,
                    jobId
                });
                console.log('[ingest] Attempting Firebase Storage upload...', {
                    bucket: FIREBASE_STORAGE_BUCKET,
                    jobId,
                    outPath
                });
                try {
                    const bucket = getStorage().bucket(FIREBASE_STORAGE_BUCKET);
                    const dest = `ingest/${jobId}.mp4`;
                    console.log('[ingest] Starting Firebase Storage upload...', { dest });
                    await bucket.upload(outPath, { destination: dest, metadata: { contentType: 'video/mp4' } });
                    console.log('[ingest] Firebase Storage upload completed, making public...');
                    await bucket.file(dest).makePublic().catch((err) => {
                        console.warn('[ingest] Failed to make Firebase Storage file public:', err.message);
                    });
                    mediaUrl = `https://storage.googleapis.com/${FIREBASE_STORAGE_BUCKET}/${dest}`;
                    console.log('[ingest] Firebase Storage URL generated:', mediaUrl);
                }
                catch (error) {
                    console.error('[ingest] Firebase Storage upload failed:', {
                        error: error.message,
                        stack: error.stack,
                        bucket: FIREBASE_STORAGE_BUCKET
                    });
                    throw error;
                }
            }
            else if (GCS_BUCKET) {
                console.log('[ingest] Using Google Cloud Storage fallback...', { bucket: GCS_BUCKET });
                const storage = new Storage();
                const bucket = storage.bucket(GCS_BUCKET);
                const dest = `ingest/${jobId}.mp4`;
                await bucket.upload(outPath, { destination: dest, contentType: 'video/mp4' });
                await bucket.file(dest).makePublic().catch(() => { });
                mediaUrl = `https://storage.googleapis.com/${GCS_BUCKET}/${dest}`;
                console.log('[ingest] GCS URL generated:', mediaUrl);
            }
            else if (CF_ACCOUNT_ID && CF_API_TOKEN) {
                const cfResp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/direct_upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${CF_API_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ requireSignedURLs: false, thumbnailTimestampPct: 0 }),
                });
                if (!cfResp.ok) {
                    const t = await cfResp.text().catch(() => '');
                    throw new Error(`Cloudflare direct_upload create failed (trim): ${cfResp.status} ${t}`);
                }
                const cfJson = await cfResp.json();
                const uploadURL = cfJson?.result?.uploadURL;
                cfUid = cfJson?.result?.uid;
                if (!uploadURL || !cfUid) {
                    throw new Error('Cloudflare direct_upload response missing uploadURL or uid (trim)');
                }
                let Tus = null;
                try {
                    const mod = await import('tus-js-client');
                    Tus = { Upload: mod.Upload, NodeHttpStack: mod.NodeHttpStack };
                }
                catch (e) {
                    throw new Error('tus-js-client is required for Cloudflare uploads but is not installed.');
                }
                const stat = fsSync.statSync(outPath);
                const stream = fsSync.createReadStream(outPath);
                await new Promise((resolve, reject) => {
                    const uploader = new Tus.Upload(stream, {
                        endpoint: uploadURL,
                        uploadSize: stat.size,
                        retryDelays: [500, 1000, 2000, 5000],
                        httpStack: new Tus.NodeHttpStack(),
                        metadata: { filename: `${jobId}.mp4`, filetype: 'video/mp4' },
                        onError: (error) => reject(error),
                        onSuccess: () => resolve(),
                        onProgress: (bytesSent, bytesTotal) => {
                            const p = Math.max(90, Math.min(99, Math.floor((bytesSent / bytesTotal) * 100)));
                            sendCallback(jobId, { status: 'uploading', progress: p, postId: req.postId });
                        },
                    });
                    uploader.start();
                });
            }
            else {
                mediaUrl = `${WORKER_PUBLIC_URL}/media/ingest/${jobId}.mp4`;
            }
            await sendCallback(jobId, { status: 'finalizing', progress: 95, postId: req.postId });
            await sendCallback(jobId, {
                status: 'completed',
                progress: 100,
                mediaUrl,
                cfUid,
                cfStatus: cfUid ? 'uploaded' : undefined,
                postId: req.postId,
            });
            console.log('[worker] Trim completed', { jobId });
        }
        catch (e) {
            const msg = e?.message || String(e);
            await sendCallback(jobId, {
                status: 'failed',
                progress: 0,
                error: `Worker trim failed: ${msg}`,
                postId: req.postId,
            });
            console.error('[worker] Trim failed', { jobId, error: msg });
        }
    }
    catch (error) {
        console.error('[worker] Trim operation failed', { jobId, error: error?.message });
        await sendCallback(jobId, {
            status: 'failed',
            progress: 0,
            error: error?.message || 'Unknown error',
            postId: req.postId
        });
    }
    finally {
        try {
            await fs.rm(workdir, { recursive: true, force: true });
        }
        catch { }
        clearTimeout(watchdog);
    }
}
const UA_ANDROID = "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const CLIENTS = [
    "android",
    "ios",
    "tv",
    "android_embedded",
];
function spawnYtDlp(url, outPath, client, withCookies) {
    return new Promise((resolve) => {
        const args = [
            url,
            "--no-playlist",
            "--force-ipv4",
            "--user-agent", process.env.YT_UA || UA_ANDROID,
            "--add-header", "Accept-Language: en-US,en;q=0.9",
            "--extractor-args", `youtube:player_client=${client}`,
            "--sleep-requests", "1",
            "--sleep-interval", "1",
            "--max-sleep-interval", "3",
            "--retries", "15",
            "--fragment-retries", "15",
            "--concurrent-fragments", "1",
            "--throttled-rate", "100K",
            "--restrict-filenames",
            "--no-check-certificate",
            "--ignore-config",
            "-o", outPath,
        ];
        // Add proxy if available
        if (process.env.YT_PROXY) {
            args.push("--proxy", process.env.YT_PROXY);
        }
        console.log(`[yt-dlp] Trying client: ${client}`);
        const proc = spawn("yt-dlp", args, { stdio: "pipe" });
        let stderr = '';
        proc.stderr?.on('data', (data) => {
            stderr += data.toString();
        });
        proc.on("exit", (code) => {
            if (code === 0) {
                console.log(`[yt-dlp] Success with client: ${client}`);
                resolve(true);
            }
            else {
                console.log(`[yt-dlp] Failed with client ${client}: ${stderr.slice(-200)}`);
                resolve(false);
            }
        });
    });
}
async function fetchYouTubeWithFallback(url, outPath) {
    // Initialize cookies if available
    const b64 = process.env.YT_COOKIES_B64 || "";
    const haveCookies = !!b64;
    if (haveCookies && !fsSync.existsSync("/tmp/youtube.cookies.txt")) {
        try {
            fsSync.writeFileSync("/tmp/youtube.cookies.txt", Buffer.from(b64, "base64"));
            console.log('[yt-dlp] YouTube cookies initialized');
        }
        catch (error) {
            console.error('[yt-dlp] Failed to initialize cookies:', error);
        }
    }
    // Try each client in sequence
    for (const client of CLIENTS) {
        const success = await spawnYtDlp(url, `${outPath}.%(ext)s`, client, haveCookies);
        if (success) {
            return { ok: true, client };
        }
    }
    return { ok: false };
}
async function sendCallback(jobId, payload) {
    if (!CALLBACK_URL || !CALLBACK_SECRET) {
        console.warn('[worker] Missing callback config; skipping callback', {
            hasUrl: Boolean(CALLBACK_URL),
            hasSecret: Boolean(CALLBACK_SECRET),
        });
        return;
    }
    try {
        const resp = await fetch(CALLBACK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-ingest-callback-secret': CALLBACK_SECRET,
            },
            body: JSON.stringify({ id: jobId, ...payload }),
        });
        if (!resp.ok) {
            const txt = await resp.text().catch(() => '');
            console.warn('[worker] Callback non-OK response', { jobId, status: resp.status, body: txt.slice(0, 300) });
        }
        else {
            console.log('[worker] Callback sent', { jobId, status: payload?.status, progress: payload?.progress });
        }
    }
    catch (e) {
        console.warn('[worker] Callback POST failed (best-effort)', e);
    }
}
export async function runIngest(req) {
    const jobId = req.id;
    const workdir = path.join(process.cwd(), 'tmp', `ingest-${jobId}`);
    await fs.mkdir(workdir, { recursive: true });
    const rawBase = path.join(workdir, 'raw');
    // Final output path: either local media dir or tmp (when uploading to GCS)
    const localMediaDir = path.join(process.cwd(), 'data', 'ingest');
    await fs.mkdir(localMediaDir, { recursive: true }).catch(() => { });
    const finalLocalPath = path.join(localMediaDir, `${jobId}.mp4`);
    const outPath = GCS_BUCKET ? path.join(workdir, 'output.mp4') : finalLocalPath;
    // Watchdog to avoid stuck jobs (20 minutes for ingest; large videos can take time)
    const watchdog = setTimeout(async () => {
        console.warn('[worker] Ingest watchdog timeout; marking failed', { jobId });
        await sendCallback(jobId, {
            status: 'failed',
            progress: 0,
            error: 'Ingest timeout. Check network or source URL.'
        });
        try {
            await fs.rm(workdir, { recursive: true, force: true });
        }
        catch { }
    }, 20 * 60 * 1000);
    try {
        console.log('[worker] Ingest start', { jobId, url: req.url, type: req.type, workdir });
        await sendCallback(jobId, { status: 'downloading', progress: 0 });
        // Download best video format. yt-dlp will use ffmpeg if remuxing is needed.
        // Keepalive while downloading
        let downloadProgress = 0;
        const keepalive1 = setInterval(() => {
            // Smoothly advance download progress up to 55%
            downloadProgress = Math.min(downloadProgress + 5, 55);
            sendCallback(jobId, { status: 'downloading', progress: downloadProgress });
        }, 2000);
        // Use new client cycling approach instead of old yt-dlp code
        try {
            const result = await fetchYouTubeWithFallback(req.url, `${rawBase}.%(ext)s`);
            if (!result.ok) {
                throw new Error('All yt-dlp client attempts failed');
            }
            console.log(`[worker] Video downloaded successfully using ${result.client} client`);
        }
        catch (e) {
            console.error('[worker] yt-dlp failed with all clients', { jobId, error: e.message });
            throw new Error(`yt-dlp failed: ${e.message}`);
        }
        finally {
            clearInterval(keepalive1);
        }
        console.log('[worker] Download complete', { jobId });
        // Immediately bump to 60% to reflect download completion
        await sendCallback(jobId, { status: 'transcoding', progress: 60 });
        // Discover actual downloaded file path (raw.<ext>)
        const dirEntries = await fs.readdir(workdir, { withFileTypes: true });
        const rawCandidate = dirEntries
            .filter((d) => d.isFile() && d.name.startsWith('raw.'))
            .map((d) => path.join(workdir, d.name))
            // Prefer video container files first
            .sort((a, b) => {
            const pref = ['.mp4', '.mkv', '.webm', '.m4v'];
            const extA = path.extname(a).toLowerCase();
            const extB = path.extname(b).toLowerCase();
            return pref.indexOf(extA) - pref.indexOf(extB);
        })[0];
        if (!rawCandidate) {
            throw new Error('Could not locate downloaded media from yt-dlp');
        }
        console.log('[worker] Discovered input', { jobId, rawCandidate });
        // Start transcoding at 65% to avoid regressions in the UI
        await sendCallback(jobId, { status: 'transcoding', progress: 65 });
        // Use system ffmpeg binary
        console.log('[worker] Transcoding start', { jobId, ffmpeg: 'ffmpeg' });
        let transcodeProgress = 65;
        const keepalive2 = setInterval(() => {
            transcodeProgress = Math.min(transcodeProgress + 3, 90);
            sendCallback(jobId, { status: 'transcoding', progress: transcodeProgress });
        }, 2000);
        const ffArgs = [
            '-y',
            '-i', rawCandidate,
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-profile:v', 'baseline',
            '-level', '3.1',
            '-c:a', 'aac',
            '-movflags', '+faststart',
        ];
        if (TRIM_SECONDS > 0) {
            ffArgs.push('-t', String(TRIM_SECONDS));
        }
        ffArgs.push(outPath);
        await execCmd('ffmpeg', ffArgs).finally(() => clearInterval(keepalive2));
        console.log('[worker] Transcoding complete', { jobId, outPath });
        await sendCallback(jobId, { status: 'uploading', progress: 90 });
        let mediaUrl = '';
        let cfUid;
        console.log('[ingest] Upload configuration check:', {
            FIREBASE_STORAGE_BUCKET,
            GCS_BUCKET,
            CF_ACCOUNT_ID: !!CF_ACCOUNT_ID,
            CF_API_TOKEN: !!CF_API_TOKEN,
            jobId
        });
        if (FIREBASE_STORAGE_BUCKET) {
            console.log('[ingest] Attempting Firebase Storage upload...', {
                bucket: FIREBASE_STORAGE_BUCKET,
                jobId,
                outPath
            });
            try {
                const bucket = getStorage().bucket(FIREBASE_STORAGE_BUCKET);
                const dest = `ingest/${jobId}.mp4`;
                console.log('[ingest] Starting Firebase Storage upload...', { dest });
                await bucket.upload(outPath, { destination: dest, metadata: { contentType: 'video/mp4' } });
                console.log('[ingest] Firebase Storage upload completed, making public...');
                await bucket.file(dest).makePublic().catch((err) => {
                    console.warn('[ingest] Failed to make Firebase Storage file public:', err.message);
                });
                mediaUrl = `https://storage.googleapis.com/${FIREBASE_STORAGE_BUCKET}/${dest}`;
                console.log('[ingest] Firebase Storage URL generated:', mediaUrl);
            }
            catch (error) {
                console.error('[ingest] Firebase Storage upload failed:', {
                    error: error.message,
                    stack: error.stack,
                    bucket: FIREBASE_STORAGE_BUCKET
                });
                throw error;
            }
        }
        else if (GCS_BUCKET) {
            console.log('[ingest] Using Google Cloud Storage fallback...', { bucket: GCS_BUCKET });
            const storage = new Storage();
            const bucket = storage.bucket(GCS_BUCKET);
            const dest = `ingest/${jobId}.mp4`;
            await bucket.upload(outPath, { destination: dest, contentType: 'video/mp4' });
            await bucket.file(dest).makePublic().catch(() => { });
            mediaUrl = `https://storage.googleapis.com/${GCS_BUCKET}/${dest}`;
            console.log('[ingest] GCS URL generated:', mediaUrl);
        }
        else if (CF_ACCOUNT_ID && CF_API_TOKEN) {
            // Upload to Cloudflare Stream via direct upload + tus
            // 1) Create direct upload
            const cfResp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/direct_upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CF_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ requireSignedURLs: false, thumbnailTimestampPct: 0 }),
            });
            if (!cfResp.ok) {
                const t = await cfResp.text().catch(() => '');
                throw new Error(`Cloudflare direct_upload create failed: ${cfResp.status} ${t}`);
            }
            const cfJson = await cfResp.json();
            const uploadURL = cfJson?.result?.uploadURL;
            cfUid = cfJson?.result?.uid;
            if (!uploadURL || !cfUid) {
                throw new Error('Cloudflare direct_upload response missing uploadURL or uid');
            }
            // 2) Upload file via tus from Node (dynamically import to avoid hard dependency)
            let Tus = null;
            try {
                const mod = await import('tus-js-client');
                Tus = { Upload: mod.Upload, NodeHttpStack: mod.NodeHttpStack };
            }
            catch (e) {
                throw new Error('tus-js-client is required for Cloudflare uploads but is not installed.');
            }
            const stat = fsSync.statSync(outPath);
            const stream = fsSync.createReadStream(outPath);
            await new Promise((resolve, reject) => {
                const uploader = new Tus.Upload(stream, {
                    endpoint: uploadURL,
                    uploadSize: stat.size,
                    retryDelays: [500, 1000, 2000, 5000],
                    httpStack: new Tus.NodeHttpStack(),
                    metadata: { filename: `${jobId}.mp4`, filetype: 'video/mp4' },
                    onError: (error) => reject(error),
                    onSuccess: () => resolve(),
                    onProgress: (bytesSent, bytesTotal) => {
                        const p = Math.max(90, Math.min(99, Math.floor((bytesSent / bytesTotal) * 100)));
                        sendCallback(jobId, { status: 'uploading', progress: p });
                    },
                });
                uploader.start();
            });
            // mediaUrl left empty when using CF; prefer cfUid
        }
        else {
            mediaUrl = `${WORKER_PUBLIC_URL}/media/ingest/${jobId}.mp4`;
        }
        await sendCallback(jobId, { status: 'finalizing', progress: 95 });
        await sendCallback(jobId, {
            status: 'completed',
            progress: 100,
            mediaUrl,
            cfUid,
            cfStatus: cfUid ? 'uploaded' : undefined,
            title: 'Ingested video',
            channel: undefined,
        });
        console.log('[worker] Ingest completed', { jobId });
    }
    catch (e) {
        const msg = e?.message || String(e);
        await sendCallback(jobId, {
            status: 'failed',
            progress: 0,
            error: `Worker ingest failed: ${msg}. Using bundled yt-dlp/ffmpeg; check network access and input URL.`,
        });
        console.error('[worker] Ingest failed', { jobId, error: msg });
    }
    finally {
        // Cleanup (best effort)
        try {
            await fs.rm(workdir, { recursive: true, force: true });
        }
        catch { }
        clearTimeout(watchdog);
    }
}

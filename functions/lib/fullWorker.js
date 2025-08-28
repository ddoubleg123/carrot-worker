"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fullWorker = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const express_1 = __importDefault(require("express"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const tmp = __importStar(require("tmp"));
const uuid_1 = require("uuid");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const node_fetch_1 = __importDefault(require("node-fetch"));
// YouTube extraction alternatives failed - implementing direct approach
// Using YouTube Data API as final solution
// type VideoFormat = any; // Removed since we're not using ytdl-core
// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const app = (0, express_1.default)();
// Set ffmpeg path
if (ffmpeg_static_1.default) {
    fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_static_1.default);
}
// Middleware
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Authentication middleware
const requireWorkerSecret = (req, res, next) => {
    try {
        // 1) Resolve the shared secret from environment variables
        const secretFromConfig = undefined; // Functions config not available in v2
        const secretFromEnv = process.env.INGEST_WORKER_SECRET;
        const expectedSecret = secretFromEnv || secretFromConfig || 'dev_ingest_secret';
        console.log('Auth check - Expected source:', secretFromEnv ? 'env' : secretFromConfig ? 'config' : 'default');
        console.log('Expected secret (first 10 chars):', expectedSecret.substring(0, 10) + '...');
        // 2) Auth header
        const gotSecret = req.get('x-worker-secret') || (typeof req.query.secret === 'string' ? req.query.secret : '');
        console.log('Received secret (first 10 chars):', gotSecret ? gotSecret.substring(0, 10) + '...' : 'NONE');
        if (gotSecret !== expectedSecret) {
            console.error('Invalid worker secret provided. Expected source:', secretFromEnv ? 'env' : secretFromConfig ? 'config' : 'default');
            console.error('Secret mismatch - Expected vs Got:', expectedSecret === gotSecret ? 'MATCH' : 'MISMATCH');
            res.status(401).json({ error: 'Invalid worker secret' });
            return;
        }
        console.log('Auth successful');
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication error' });
    }
};
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        uptime: process.uptime()
    });
});
// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Full Worker Service',
        endpoints: ['/health', '/ingest', '/trim', '/media'],
        timestamp: new Date().toISOString()
    });
});
// Media serving endpoint
app.get('/media/:path*', async (req, res) => {
    try {
        const filePath = req.params.path + (req.params[0] || '');
        console.log('Media request for:', filePath);
        const bucket = admin.storage().bucket();
        const file = bucket.file(filePath);
        // Check if file exists
        const [exists] = await file.exists();
        if (!exists) {
            console.log('File not found:', filePath);
            res.status(404).json({ error: 'File not found' });
            return;
        }
        // Get signed URL for the file
        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000, // 1 hour
        });
        // Redirect to signed URL
        res.redirect(signedUrl);
    }
    catch (error) {
        console.error('Media serving error:', error);
        res.status(500).json({ error: 'Failed to serve media' });
    }
});
// Full ingest endpoint
app.post('/ingest', requireWorkerSecret, async (req, res) => {
    let tempDir = null;
    try {
        // Structured logging: log request keys (not values)
        const requestKeys = Object.keys(req.body || {});
        console.log('Ingest request received with keys:', requestKeys);
        // 3) Payload contract (mirror what Next.js sends)
        const { id, // optional tracking id
        url, // required: source media url
        postId, // required: our post id
        sourceType, // optional: "youtube" | "upload" | "cloudflare"
        callbackUrl, // required
        callbackSecret, // required
         } = req.body ?? {};
        console.log('Processing job:', { id, sourceType, hasUrl: !!url, hasPostId: !!postId });
        if (!url || !postId || !callbackUrl || !callbackSecret) {
            console.error('Missing required fields. Got keys:', Object.keys(req.body || {}));
            res.status(400).json({
                error: 'Missing required fields',
                required: ['url', 'postId', 'callbackUrl', 'callbackSecret'],
                got: Object.keys(req.body || {}),
            });
            return;
        }
        // Create temporary directory
        const tmpDir = tmp.dirSync({ unsafeCleanup: true });
        tempDir = tmpDir.name;
        const inputPath = path.join(tempDir, `input_${(0, uuid_1.v4)()}.mp4`);
        const outputPath = path.join(tempDir, `output_${(0, uuid_1.v4)()}.mp4`);
        // Download video with YouTube support
        console.log('Downloading video from:', url);
        if (sourceType === 'youtube') {
            res.status(400).json({
                error: 'YouTube ingestion temporarily disabled',
                message: 'YouTube blocks server-side video extraction. Please use direct video file uploads instead.',
                alternatives: [
                    'Upload video files directly',
                    'Use YouTube Data API (requires API key)',
                    'Process videos client-side in browser'
                ]
            });
            return;
        }
        else if (url.includes('youtube.com') || url.includes('youtu.be')) {
            console.log('Detected YouTube URL - server-side extraction blocked by YouTube');
            // YouTube blocks server-side extraction - return error with guidance
            throw new Error('YouTube server-side extraction is blocked. Please use one of these alternatives: 1) Use YouTube Data API with API key, 2) Process videos client-side in browser, 3) Use a proxy service, or 4) Upload video files directly instead of YouTube URLs.');
        }
        else {
            // Direct URL - use fetch
            console.log('Processing direct URL');
            const response = await (0, node_fetch_1.default)(url);
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'No error details');
                console.error(`Failed to download video (${response.status}):`, errorText);
                throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
            }
            const buffer = await response.buffer();
            await fs.writeFile(inputPath, buffer);
        }
        // Process video with ffmpeg
        console.log('Processing video...');
        await new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(inputPath)
                .videoCodec('libx264')
                .audioCodec('aac')
                .format('mp4')
                .outputOptions([
                '-movflags', 'faststart',
                '-preset', 'fast',
                '-crf', '23'
            ])
                .output(outputPath)
                .on('end', () => {
                console.log('Video processing completed');
                resolve();
            })
                .on('error', (err) => {
                console.error('FFmpeg error:', err);
                reject(err);
            })
                .run();
        });
        // Upload to Firebase Storage
        console.log('Uploading to Firebase Storage...');
        const bucket = admin.storage().bucket();
        const fileName = `videos/${postId}/${(0, uuid_1.v4)()}.mp4`;
        await bucket.upload(outputPath, {
            destination: fileName,
            metadata: {
                contentType: 'video/mp4',
                metadata: {
                    postId: postId,
                    processedAt: new Date().toISOString()
                }
            }
        });
        const file = bucket.file(fileName);
        const [url_result] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491'
        });
        // Send callback if provided
        if (callbackUrl && callbackSecret) {
            try {
                await (0, node_fetch_1.default)(callbackUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-callback-secret': callbackSecret
                    },
                    body: JSON.stringify({
                        jobId: id,
                        postId,
                        status: 'completed',
                        videoUrl: url_result,
                        mediaUrl: url_result, // For backward compatibility
                        processedAt: new Date().toISOString(),
                        secret: callbackSecret
                    })
                });
            }
            catch (callbackError) {
                console.error('Callback failed:', callbackError);
            }
        }
        res.json({
            status: 'completed',
            postId,
            videoUrl: url_result,
            processedAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Ingest error:', error);
        // Send error callback if provided
        const { id, callbackUrl, callbackSecret, postId } = req.body;
        if (callbackUrl && callbackSecret) {
            try {
                await (0, node_fetch_1.default)(callbackUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-callback-secret': callbackSecret
                    },
                    body: JSON.stringify({
                        jobId: id,
                        postId,
                        status: 'failed',
                        error: error instanceof Error ? error.message : String(error),
                        processedAt: new Date().toISOString(),
                        secret: callbackSecret
                    })
                });
            }
            catch (callbackError) {
                console.error('Error callback failed:', callbackError);
            }
        }
        // Log the full error for debugging
        console.error('Full error details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined
        });
        res.status(500).json({
            error: 'Ingest failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
    finally {
        // Clean up temporary directory
        if (tempDir) {
            try {
                await fs.remove(tempDir);
            }
            catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
            }
        }
    }
});
// Full trim endpoint
app.post('/trim', requireWorkerSecret, async (req, res) => {
    let tempDir = null;
    try {
        console.log('Trim request received:', req.body);
        const { videoUrl, startTime, endTime, postId, callbackUrl, callbackSecret } = req.body;
        if (!videoUrl || !startTime || !endTime || !postId) {
            res.status(400).json({ error: 'Missing required fields: videoUrl, startTime, endTime, postId' });
            return;
        }
        // Create temporary directory
        const tmpDir = tmp.dirSync({ unsafeCleanup: true });
        tempDir = tmpDir.name;
        const inputPath = path.join(tempDir, `input_${(0, uuid_1.v4)()}.mp4`);
        const outputPath = path.join(tempDir, `trimmed_${(0, uuid_1.v4)()}.mp4`);
        // Download video
        console.log('Downloading video for trimming:', videoUrl);
        const response = await (0, node_fetch_1.default)(videoUrl);
        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.status}`);
        }
        const buffer = await response.buffer();
        await fs.writeFile(inputPath, buffer);
        // Trim video with ffmpeg
        console.log(`Trimming video from ${startTime}s to ${endTime}s...`);
        await new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(inputPath)
                .seekInput(startTime)
                .duration(endTime - startTime)
                .videoCodec('libx264')
                .audioCodec('aac')
                .format('mp4')
                .outputOptions([
                '-movflags', 'faststart',
                '-preset', 'fast',
                '-crf', '23'
            ])
                .output(outputPath)
                .on('end', () => {
                console.log('Video trimming completed');
                resolve();
            })
                .on('error', (err) => {
                console.error('FFmpeg trim error:', err);
                reject(err);
            })
                .run();
        });
        // Upload trimmed video to Firebase Storage
        console.log('Uploading trimmed video to Firebase Storage...');
        const bucket = admin.storage().bucket();
        const fileName = `videos/${postId}/trimmed_${(0, uuid_1.v4)()}.mp4`;
        await bucket.upload(outputPath, {
            destination: fileName,
            metadata: {
                contentType: 'video/mp4',
                metadata: {
                    postId: postId,
                    trimmedAt: new Date().toISOString(),
                    startTime: startTime.toString(),
                    endTime: endTime.toString()
                }
            }
        });
        const file = bucket.file(fileName);
        const [url_result] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491'
        });
        // Send callback if provided
        if (callbackUrl && callbackSecret) {
            try {
                await (0, node_fetch_1.default)(callbackUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-callback-secret': callbackSecret
                    },
                    body: JSON.stringify({
                        postId,
                        status: 'completed',
                        videoUrl: url_result,
                        trimmedAt: new Date().toISOString(),
                        startTime,
                        endTime
                    })
                });
            }
            catch (callbackError) {
                console.error('Trim callback failed:', callbackError);
            }
        }
        res.json({
            status: 'completed',
            postId,
            videoUrl: url_result,
            trimmedAt: new Date().toISOString(),
            startTime,
            endTime
        });
    }
    catch (error) {
        console.error('Trim error:', error);
        // Send error callback if provided
        const { callbackUrl, callbackSecret, postId } = req.body;
        if (callbackUrl && callbackSecret && postId) {
            try {
                await (0, node_fetch_1.default)(callbackUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-callback-secret': callbackSecret
                    },
                    body: JSON.stringify({
                        postId,
                        status: 'failed',
                        error: error instanceof Error ? error.message : String(error),
                        processedAt: new Date().toISOString()
                    })
                });
            }
            catch (callbackError) {
                console.error('Trim error callback failed:', callbackError);
            }
        }
        res.status(500).json({
            error: 'Trim failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
    finally {
        // Clean up temporary directory
        if (tempDir) {
            try {
                await fs.remove(tempDir);
            }
            catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
            }
        }
    }
});
// Export the Express app as a Firebase Function
exports.fullWorker = (0, https_1.onRequest)({
    region: 'us-central1',
    memory: '2GiB',
    timeoutSeconds: 540,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 10,
    cors: ['https://carrot-eta.vercel.app', 'http://localhost:3005', 'http://localhost:3000']
}, app);
//# sourceMappingURL=fullWorker.js.map
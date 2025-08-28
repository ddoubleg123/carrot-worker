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
exports.simpleWorker = void 0;
const functions = __importStar(require("firebase-functions"));
const express_1 = __importDefault(require("express"));
const ingest_1 = require("./ingest");
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Authentication middleware
const requireWorkerSecret = (req, res, next) => {
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
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        uptime: process.uptime()
    });
});
// Full ingest endpoint
app.post('/ingest', requireWorkerSecret, async (req, res) => {
    try {
        console.log('Ingest request received:', req.body);
        const result = await (0, ingest_1.runIngest)(req.body);
        res.json(result);
    }
    catch (error) {
        console.error('Ingest error:', error);
        res.status(500).json({ error: 'Ingest failed', details: error instanceof Error ? error.message : String(error) });
    }
});
// Full trim endpoint
app.post('/trim', requireWorkerSecret, async (req, res) => {
    try {
        console.log('Trim request received:', req.body);
        const result = await (0, ingest_1.runTrim)(req.body);
        res.json(result);
    }
    catch (error) {
        console.error('Trim error:', error);
        res.status(500).json({ error: 'Trim failed', details: error instanceof Error ? error.message : String(error) });
    }
});
// Export as Firebase Function with full video processing capabilities
exports.simpleWorker = functions.https.onRequest({
    timeoutSeconds: 540,
    memory: '4GiB'
}, app);
//# sourceMappingURL=simpleWorker.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.minimalWorker = void 0;
const https_1 = require("firebase-functions/v2/https");
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});
// Simple ingest endpoint
app.post('/ingest', (req, res) => {
    console.log('Minimal ingest request received:', Object.keys(req.body || {}));
    res.status(202).json({ ok: true, message: 'Minimal ingest received' });
});
// Export as Firebase Function
exports.minimalWorker = (0, https_1.onRequest)({
    timeoutSeconds: 60,
    memory: '512MiB'
}, app);
//# sourceMappingURL=minimal.js.map
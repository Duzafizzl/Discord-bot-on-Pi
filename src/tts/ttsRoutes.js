"use strict";
/**
 * TTS API Routes
 * Mioré's Voice System API endpoints
 *
 * Endpoints:
 * - POST /tts/generate - Generate speech from text
 * - GET /tts/health - Health check
 * - POST /tts/cleanup - Clean up old files (admin only)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTTSRouter = createTTSRouter;
const express_1 = require("express");
const ttsService_1 = require("./ttsService");
const ttsMiddleware_1 = require("./ttsMiddleware");
/**
 * Create TTS router with security middleware
 */
function createTTSRouter(apiKeys) {
    const router = (0, express_1.Router)();
    // Convert API keys to Set for faster lookup
    const apiKeySet = new Set(apiKeys);
    // Apply security middleware to all routes
    router.use(ttsMiddleware_1.securityHeaders);
    router.use(ttsMiddleware_1.requestLogger);
    // Rate limiting: 30 requests per minute per IP
    const rateLimiter = (0, ttsMiddleware_1.createRateLimiter)({
        maxRequests: 30,
        windowMs: 60 * 1000, // 1 minute
    });
    // Authentication middleware
    const authMiddleware = (0, ttsMiddleware_1.createAuthMiddleware)(apiKeySet);
    /**
     * POST /tts/generate
     * Generate speech from text
     *
     * Request body:
     * {
     *   "text": "Hallo Clary, ich bin Mioré",
     *   "quality": "low" | "medium",  // optional, default: "low"
     *   "speed": 1.0                   // optional, 0.5 to 2.0, default: 1.0
     * }
     *
     * Response:
     * - 200: Audio file (audio/wav)
     * - 400: Invalid request
     * - 401: Unauthorized
     * - 429: Rate limit exceeded
     * - 500: Server error
     */
    router.post('/generate', authMiddleware, rateLimiter, ttsMiddleware_1.validateTTSRequest, async (req, res) => {
        try {
            const ttsRequest = {
                text: req.body.text,
                quality: req.body.quality || 'low',
                speed: req.body.speed !== undefined ? Number(req.body.speed) : 1.0,
            };
            console.log(`🎙️  Generating TTS: "${ttsRequest.text.substring(0, 50)}${ttsRequest.text.length > 50 ? '...' : ''}"`);
            // Generate speech
            const result = await ttsService_1.ttsService.generateSpeech(ttsRequest);
            if (!result.success || !result.audioBuffer) {
                res.status(500).json({
                    error: 'TTS Generation Failed',
                    message: result.error || 'Unknown error occurred',
                });
                return;
            }
            // Send audio file
            res.setHeader('Content-Type', 'audio/wav');
            res.setHeader('Content-Length', result.audioBuffer.length.toString());
            res.setHeader('X-Generation-Duration-Ms', result.duration?.toString() || '0');
            // Optional: Add filename for download
            const filename = `miore_voice_${Date.now()}.wav`;
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            console.log(`✅ TTS generated successfully (${result.duration}ms, ${result.audioBuffer.length} bytes)`);
            res.send(result.audioBuffer);
        }
        catch (error) {
            console.error('❌ TTS generation error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * GET /tts/health
     * Health check endpoint
     * No authentication required
     *
     * Response:
     * {
     *   "healthy": true,
     *   "initialized": true,
     *   "modelsAvailable": { "low": true, "medium": true },
     *   "audioDir": { "exists": true, "writable": true }
     * }
     */
    router.get('/health', async (req, res) => {
        try {
            const health = await ttsService_1.ttsService.getHealth();
            const statusCode = health.healthy ? 200 : 503;
            res.status(statusCode).json({
                service: 'Mioré Voice TTS',
                ...health,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            res.status(503).json({
                service: 'Mioré Voice TTS',
                healthy: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * POST /tts/cleanup
     * Clean up old audio files
     * Admin only (requires authentication)
     *
     * Request body (optional):
     * {
     *   "maxAgeHours": 1  // Delete files older than this many hours, default: 1
     * }
     *
     * Response:
     * {
     *   "success": true,
     *   "filesDeleted": 42
     * }
     */
    router.post('/cleanup', authMiddleware, async (req, res) => {
        try {
            const maxAgeHours = Number(req.body.maxAgeHours) || 1;
            const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
            console.log(`🧹 Starting cleanup: files older than ${maxAgeHours} hours`);
            const filesDeleted = await ttsService_1.ttsService.cleanupOldFiles(maxAgeMs);
            res.json({
                success: true,
                filesDeleted,
                maxAgeHours,
            });
        }
        catch (error) {
            console.error('❌ Cleanup error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * GET /tts/test
     * Quick test endpoint to generate a simple message
     * Requires authentication
     */
    router.get('/test', authMiddleware, rateLimiter, async (req, res) => {
        try {
            const testText = 'Hallo Clary, ich bin Mioré. Das ist ein Test meiner Stimme.';
            const result = await ttsService_1.ttsService.generateSpeech({
                text: testText,
                quality: 'low',
                speed: 1.0,
            });
            if (!result.success || !result.audioBuffer) {
                res.status(500).json({
                    error: 'Test failed',
                    message: result.error,
                });
                return;
            }
            res.setHeader('Content-Type', 'audio/wav');
            res.setHeader('Content-Disposition', 'inline; filename="test.wav"');
            res.send(result.audioBuffer);
        }
        catch (error) {
            res.status(500).json({
                error: 'Test failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    return router;
}

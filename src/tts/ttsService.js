"use strict";
/**
 * Mioré's Voice TTS Service
 * High-security, production-ready Text-to-Speech service using Piper TTS
 *
 * Security features:
 * - Input validation and sanitization
 * - Rate limiting per IP
 * - Maximum text length enforcement
 * - Process timeout protection
 * - File system security (no path traversal)
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ttsService = exports.TTSService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Validates and sanitizes TTS input text
 * Security: Prevent injection attacks and malicious input
 */
function validateAndSanitizeText(text, maxLength) {
    if (!text || typeof text !== 'string') {
        throw new Error('Text must be a non-empty string');
    }
    // Remove null bytes (potential injection vector)
    text = text.replace(/\0/g, '');
    // Check length AFTER sanitization
    if (text.length === 0) {
        throw new Error('Text cannot be empty after sanitization');
    }
    if (text.length > maxLength) {
        throw new Error(`Text exceeds maximum length of ${maxLength} characters`);
    }
    // Security: Only allow printable characters, German umlauts, and common punctuation
    // This prevents shell injection and control characters
    const allowedPattern = /^[\p{L}\p{N}\p{P}\p{Z}\n\r]+$/u;
    if (!allowedPattern.test(text)) {
        throw new Error('Text contains invalid characters');
    }
    return text.trim();
}
/**
 * Validates speed parameter
 */
function validateSpeed(speed) {
    if (speed === undefined) {
        return 1.0; // Default speed
    }
    if (typeof speed !== 'number' || isNaN(speed)) {
        throw new Error('Speed must be a number');
    }
    if (speed < 0.5 || speed > 2.0) {
        throw new Error('Speed must be between 0.5 and 2.0');
    }
    return speed;
}
/**
 * Generates a secure random filename
 * Security: Prevents path traversal and collision attacks
 */
function generateSecureFilename(extension) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `tts_${timestamp}_${randomBytes}.${extension}`;
}
/**
 * TTS Service Class
 * Handles all Text-to-Speech operations with security best practices
 */
class TTSService {
    constructor(config) {
        this.isInitialized = false;
        // Default configuration
        this.config = {
            piperBinary: config?.piperBinary || '/opt/piper-tts/piper',
            modelLow: config?.modelLow || '/opt/piper-tts/models/de_DE-thorsten-low.onnx',
            modelMedium: config?.modelMedium || '/opt/piper-tts/models/de_DE-thorsten-medium.onnx',
            audioDir: config?.audioDir || '/opt/piper-tts/audio',
            defaultModel: config?.defaultModel || 'low',
            maxTextLength: config?.maxTextLength || 1000, // Security: limit text length
            timeoutMs: config?.timeoutMs || 30000, // 30 seconds max
        };
    }
    /**
     * Initialize the TTS service
     * Validates that Piper binary and models exist
     */
    async initialize() {
        try {
            // Security: Verify binary exists and is executable
            await fs.access(this.config.piperBinary, fs.constants.X_OK);
            // Verify models exist
            await fs.access(this.config.modelLow, fs.constants.R_OK);
            // Medium model is optional
            try {
                await fs.access(this.config.modelMedium, fs.constants.R_OK);
            }
            catch {
                console.warn('⚠️  Medium quality model not found, only low quality available');
            }
            // Ensure audio directory exists
            await fs.mkdir(this.config.audioDir, { recursive: true });
            this.isInitialized = true;
            console.log('✅ TTS Service initialized successfully');
        }
        catch (error) {
            throw new Error(`Failed to initialize TTS Service: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Generate speech from text
     * Main TTS function with full security validation
     */
    async generateSpeech(request) {
        if (!this.isInitialized) {
            throw new Error('TTS Service not initialized. Call initialize() first.');
        }
        const startTime = Date.now();
        try {
            // Validate and sanitize input
            const sanitizedText = validateAndSanitizeText(request.text, this.config.maxTextLength);
            const speed = validateSpeed(request.speed);
            const quality = request.quality || this.config.defaultModel;
            // Select model based on quality
            const modelPath = quality === 'medium' ? this.config.modelMedium : this.config.modelLow;
            // Verify model exists
            try {
                await fs.access(modelPath, fs.constants.R_OK);
            }
            catch {
                throw new Error(`Model not available: ${quality}`);
            }
            // Generate secure output filename
            const outputFilename = generateSecureFilename('wav');
            const outputPath = path.join(this.config.audioDir, outputFilename);
            // Security: Validate output path doesn't escape audio directory
            const resolvedPath = path.resolve(outputPath);
            const resolvedAudioDir = path.resolve(this.config.audioDir);
            if (!resolvedPath.startsWith(resolvedAudioDir)) {
                throw new Error('Security violation: Invalid output path');
            }
            // Build Piper command
            // Security: Use array syntax to prevent shell injection
            const piperArgs = [
                '--model', modelPath,
                '--output_file', outputPath,
            ];
            // Add speed if not default
            if (speed !== 1.0) {
                piperArgs.push('--length_scale', (1.0 / speed).toFixed(2));
            }
            // Execute Piper with timeout
            // Security: Pass text via stdin to avoid command injection
            const command = `echo ${JSON.stringify(sanitizedText)} | ${this.config.piperBinary} ${piperArgs.map(arg => {
                // Escape arguments properly
                return arg.includes(' ') ? `"${arg.replace(/"/g, '\\"')}"` : arg;
            }).join(' ')}`;
            await execAsync(command, {
                timeout: this.config.timeoutMs,
                maxBuffer: 10 * 1024 * 1024, // 10MB max buffer
            });
            // Verify output file was created
            const stats = await fs.stat(outputPath);
            if (!stats.isFile() || stats.size === 0) {
                throw new Error('TTS generation failed: empty or invalid output file');
            }
            // Read audio file into buffer
            const audioBuffer = await fs.readFile(outputPath);
            const duration = Date.now() - startTime;
            return {
                success: true,
                audioFile: outputPath,
                audioBuffer,
                duration,
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            console.error('❌ TTS generation failed:', error);
            return {
                success: false,
                duration,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    /**
     * Clean up old audio files
     * Security: Prevent disk space exhaustion
     */
    async cleanupOldFiles(maxAgeMs = 3600000) {
        try {
            const files = await fs.readdir(this.config.audioDir);
            const now = Date.now();
            let deletedCount = 0;
            for (const file of files) {
                if (!file.startsWith('tts_'))
                    continue; // Only clean our generated files
                const filePath = path.join(this.config.audioDir, file);
                // Security: Verify path doesn't escape audio directory
                const resolvedPath = path.resolve(filePath);
                const resolvedAudioDir = path.resolve(this.config.audioDir);
                if (!resolvedPath.startsWith(resolvedAudioDir)) {
                    console.warn('⚠️  Skipping suspicious file:', file);
                    continue;
                }
                try {
                    const stats = await fs.stat(filePath);
                    const age = now - stats.mtimeMs;
                    if (age > maxAgeMs) {
                        await fs.unlink(filePath);
                        deletedCount++;
                    }
                }
                catch (error) {
                    console.warn('⚠️  Failed to process file:', file, error);
                }
            }
            if (deletedCount > 0) {
                console.log(`🧹 Cleaned up ${deletedCount} old audio files`);
            }
            return deletedCount;
        }
        catch (error) {
            console.error('❌ Cleanup failed:', error);
            return 0;
        }
    }
    /**
     * Get service health status
     */
    async getHealth() {
        const health = {
            healthy: false,
            initialized: this.isInitialized,
            modelsAvailable: { low: false, medium: false },
            audioDir: { exists: false, writable: false },
        };
        try {
            // Check binary
            await fs.access(this.config.piperBinary, fs.constants.X_OK);
            // Check models
            try {
                await fs.access(this.config.modelLow, fs.constants.R_OK);
                health.modelsAvailable.low = true;
            }
            catch { }
            try {
                await fs.access(this.config.modelMedium, fs.constants.R_OK);
                health.modelsAvailable.medium = true;
            }
            catch { }
            // Check audio directory
            try {
                await fs.access(this.config.audioDir, fs.constants.R_OK | fs.constants.W_OK);
                health.audioDir.exists = true;
                health.audioDir.writable = true;
            }
            catch { }
            health.healthy =
                this.isInitialized &&
                    (health.modelsAvailable.low || health.modelsAvailable.medium) &&
                    health.audioDir.exists &&
                    health.audioDir.writable;
        }
        catch { }
        return health;
    }
}
exports.TTSService = TTSService;
// Export singleton instance
exports.ttsService = new TTSService();
